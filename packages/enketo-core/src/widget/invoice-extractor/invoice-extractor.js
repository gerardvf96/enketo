import Widget from '../../js/widget';

/**
 * Invoice Extractor Widget
 *
 * This widget allows users to upload a PDF file and automatically extract
 * invoice data (name and quantity) to populate related form fields.
 *
 * Usage in XForm:
 * - Add appearance "invoice-extractor" to a file input control
 * - The widget will look for related fields with data-invoice-field="name" and data-invoice-field="quantity"
 *   or by using field names that follow naming conventions (e.g., invoice_name, invoice_quantity)
 */
class InvoiceExtractor extends Widget {
    /**
     * The selector that determines on which form control the widget is instantiated.
     */
    static get selector() {
        return '.or-appearance-invoice-extractor input[type="file"]';
    }

    /**
     * Initialize the invoice extractor widget.
     */
    _init() {
        // Hide the original file input
        this.element.classList.add('hide');

        // Create the widget's DOM structure
        const fragment = document.createRange().createContextualFragment(`
            <div class="widget invoice-extractor">
                <div class="invoice-upload-container">
                    <input class="invoice-file-input ignore" type="file" accept=".pdf" multiple />
                    <label class="invoice-upload-label">
                        <span class="invoice-upload-icon">📄</span>
                        <span class="invoice-upload-text">Upload PDF Invoice(s)</span>
                    </label>
                    <div class="invoice-file-name"></div>
                </div>
                <div class="invoice-status"></div>
            </div>
        `);

        const widget = fragment.querySelector('.widget');
        this.element.after(widget);

        this.container = this.element.parentElement.querySelector('.invoice-extractor');
        this.fileInput = this.container.querySelector('.invoice-file-input');
        this.uploadLabel = this.container.querySelector('.invoice-upload-label');
        this.fileNameDisplay = this.container.querySelector('.invoice-file-name');
        this.statusDisplay = this.container.querySelector('.invoice-status');

        // Set event handlers
        this.fileInput.addEventListener('change', this._handleFileUpload.bind(this));
        this.uploadLabel.addEventListener('click', (e) => {
            this.fileInput.click();
        });
    }

    /**
     * Handle file upload and PDF processing.
     */
    _handleFileUpload(event) {
        const files = Array.from(event.target.files);

        if (!files.length) {
            return;
        }

        // Check all files are PDFs
        const nonPdfFiles = files.filter(file => file.type !== 'application/pdf');
        if (nonPdfFiles.length > 0) {
            this.statusDisplay.textContent = '❌ Please upload only PDF files';
            this.statusDisplay.className = 'invoice-status error';
            return;
        }

        // Display file names
        if (files.length === 1) {
            this.fileNameDisplay.textContent = `📄 ${files[0].name}`;
        } else {
            this.fileNameDisplay.textContent = `📄 ${files.length} fitxers seleccionats`;
        }

        this.statusDisplay.innerHTML = `<div class="processing-header">⏳ Processant ${files.length} factura${files.length > 1 ? 's' : ''}...</div>`;
        this.statusDisplay.className = 'invoice-status processing';

        // Process files sequentially
        this._processFiles(files, 0);
    }

    /**
     * Process multiple files sequentially, filling repeat instances.
     */
    _processFiles(files, index) {
        if (index >= files.length) {
            // All files processed
            this.statusDisplay.innerHTML = `<div class="success-header">✅ ${files.length} factures processades correctament</div>`;
            this.statusDisplay.className = 'invoice-status success';
            return;
        }

        const file = files[index];
        this.statusDisplay.innerHTML = `<div class="processing-header">⏳ Processant factura ${index + 1} de ${files.length}...</div>`;
        this.statusDisplay.className = 'invoice-status processing';

        // Find or create the appropriate repeat instance
        const targetContainer = this._getOrCreateRepeatInstance(index);

        // Call external service and populate the target container
        this._callExternalService(file, targetContainer, () => {
            // Process next file
            this._processFiles(files, index + 1);
        });
    }

    /**
     * Call external REST service to extract invoice data from PDF.
     * The actual service call is handled by the Enketo backend to protect the API key.
     */
    _callExternalService(file, targetContainer, callback) {
        // Simulate processing delay (1-3 seconds)
        const processingDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
        
        setTimeout(() => {
            // Call your Enketo backend endpoint
            fetch('/api/invoice/extract', {
                method: 'POST',
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    // Backend returns invoice data
                    const extractedData = {
                        numero_factura: data.numero_factura,
                        import_factura: data.import_factura,
                        descripcio_factura: data.descripcio_factura,
                        data_factura: data.data_factura,
                        nom_proveidor_factura: data.nom_proveidor_factura,
                        nif_proveidor_factura: data.nif_proveidor_factura,
                        fileName: file.name,
                    };
                    
                    // Populate form fields (values will appear in the form)
                    this._populateFormFields(extractedData, targetContainer);
                    
                    // Call callback to process next file
                    if (callback) {
                        callback();
                    }
                })
                .catch((error) => {
                    console.error('Error processing PDF:', error);
                    this.statusDisplay.innerHTML = `<div class="error-header">❌ Error: ${error.message}</div>`;
                    this.statusDisplay.className = 'invoice-status error';
                });
        }, processingDelay);
    }

    /**
     * Get or create a repeat instance for the given index.
     * Structure: dades_factures (group) contains extractor_factures (this widget) and factures (repeat).
     */
    _getOrCreateRepeatInstance(index) {
        // Find the parent group (dades_factures) containing this widget
        const parentGroup = this.element.closest('.or-group, form');
        
        if (!parentGroup) {
            console.warn('Invoice extractor: Could not find parent group');
            return null;
        }

        // Find the repeat info element (contains the add button for factures repeat)
        // Look for repeat-info with data-name containing "factures"
        let repeatInfo = parentGroup.querySelector('.or-repeat-info[data-name*="factures"]');
        
        // Fallback: try any repeat-info in the parent group
        if (!repeatInfo) {
            repeatInfo = parentGroup.querySelector('.or-repeat-info');
        }
        
        if (!repeatInfo) {
            console.warn('Invoice extractor: Could not find repeat info element. Make sure the repeat group "factures" exists in the same group as the extractor.');
            return null;
        }

        console.log('Invoice extractor: Found repeat info:', repeatInfo.getAttribute('data-name'));

        // Get all current repeat instances (siblings to repeat-info with class .or-repeat)
        let allInstances = [];
        let sibling = repeatInfo.nextElementSibling;
        while (sibling) {
            if (sibling.classList.contains('or-repeat')) {
                allInstances.push(sibling);
            }
            sibling = sibling.nextElementSibling;
        }

        console.log(`Invoice extractor: Found ${allInstances.length} existing repeat instances, need ${index + 1}`);

        // If we need more instances, use the form's repeat API to add them
        if (index >= allInstances.length) {
            const instancesToCreate = (index + 1) - allInstances.length;
            console.log(`Invoice extractor: Adding ${instancesToCreate} new repeat instance(s) using form.repeats.add()`);
            
            // Use Enketo's repeat API directly instead of clicking the button
            if (this.form && this.form.repeats) {
                this.form.repeats.add(repeatInfo, instancesToCreate);
                
                // Re-query instances after adding
                allInstances = [];
                sibling = repeatInfo.nextElementSibling;
                while (sibling) {
                    if (sibling.classList.contains('or-repeat')) {
                        allInstances.push(sibling);
                    }
                    sibling = sibling.nextElementSibling;
                }
                
                console.log(`Invoice extractor: After adding, now have ${allInstances.length} instances`);
            } else {
                console.error('Invoice extractor: form.repeats API not available');
                return null;
            }
        }
        }

        const targetInstance = allInstances[index];
        if (targetInstance) {
            console.log(`Invoice extractor: Using repeat instance ${index + 1}`, targetInstance);
        } else {
            console.warn(`Invoice extractor: Could not get repeat instance at index ${index}`);
        }
        
        return targetInstance;
    }

    /**
     * Populate related form fields with extracted data.
     */
    _populateFormFields(data, container) {
        // Use provided container or find the closest repeat instance or form group
        if (!container) {
            console.warn('Invoice extractor: Could not find form container for field population');
            return;
        }

        console.log('Invoice extractor: Populating fields in container:', container);

        // Populate all invoice fields
        this._setFieldValue(container, 'input[name*="numero_factura"]', data.numero_factura);
        this._setFieldValue(container, 'input[name*="import_factura"]', data.import_factura);
        this._setFieldValue(container, 'input[name*="descripcio_factura"]', data.descripcio_factura);
        this._setFieldValue(container, 'input[name*="data_factura"]', data.data_factura);
        this._setFieldValue(container, 'input[name*="nom_proveidor_factura"]', data.nom_proveidor_factura);
        this._setFieldValue(container, 'input[name*="nif_proveidor_factura"]', data.nif_proveidor_factura);
    }

    /**
     * Helper method to set a form field value using a CSS selector within a specific container.
     */
    _setFieldValue(container, selector, value) {
        const field = container.querySelector(selector);
        if (field && field.tagName === 'INPUT') {
            const oldValue = field.value;
            field.value = value;
            
            // Trigger multiple events to ensure form recognizes the change
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            
            // For enketo specifically, trigger xchange event
            if (window.CustomEvent) {
                field.dispatchEvent(new CustomEvent('xchange', { bubbles: true, detail: { value } }));
            }
            
            console.log(`Invoice extractor: Set field ${selector} = ${value}`);
            return true;
        } else {
            console.warn(`Invoice extractor: Field not found or not an input: ${selector}`);
        }
        return false;
    }

    /**
     * Helper method to find and set a field by looking for nearby labels within a specific container.
     */
    _setFieldByLabel(container, labelText, value) {
        // Find labels containing the text (case-insensitive) within this container
        const labels = Array.from(container.querySelectorAll('label'));
        const label = labels.find(l => l.textContent.toLowerCase().includes(labelText.toLowerCase()));
        
        if (label) {
            // Try to find associated input
            let input = label.querySelector('input');
            
            // If not found inside label, try to find by for attribute
            if (!input && label.htmlFor) {
                input = container.querySelector(`#${label.htmlFor}`);
            }
            
            // If still not found, look for next input sibling
            if (!input) {
                let sibling = label.nextElementSibling;
                while (sibling) {
                    if (sibling.tagName === 'INPUT') {
                        input = sibling;
                        break;
                    }
                    sibling = sibling.nextElementSibling;
                }
            }
            
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                if (window.CustomEvent) {
                    input.dispatchEvent(new CustomEvent('xchange', { bubbles: true, detail: { value } }));
                }
                
                console.log(`Set field by label "${labelText}" = ${value}`);
                return true;
            }
        }
        return false;
    }

    /**
     * Get the widget's value (the uploaded file name for now).
     */
    get value() {
        return this.fileInput.value;
    }

    /**
     * Set the widget's value.
     */
    set value(val) {
        if (val) {
            this.fileInput.value = val;
        }
    }

    /**
     * Check if widget is empty.
     */
    get isEmpty() {
        return !this.fileInput.value;
    }

    /**
     * Reset the widget.
     */
    _reset() {
        this.fileInput.value = '';
        this.fileNameDisplay.textContent = '';
        this.statusDisplay.textContent = '';
        this.statusDisplay.className = 'invoice-status';
        super._reset();
    }
}

export default InvoiceExtractor;
