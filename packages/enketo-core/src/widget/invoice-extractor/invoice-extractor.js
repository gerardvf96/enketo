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
                    <input class="invoice-file-input ignore" type="file" accept=".pdf" />
                    <label class="invoice-upload-label">
                        <span class="invoice-upload-icon">📄</span>
                        <span class="invoice-upload-text">Upload PDF Invoice</span>
                    </label>
                    <div class="invoice-file-name"></div>
                </div>
                <div class="invoice-status"></div>
                <div class="invoice-extracted-data"></div>
            </div>
        `);

        const widget = fragment.querySelector('.widget');
        this.element.after(widget);

        this.container = this.element.parentElement.querySelector('.invoice-extractor');
        this.fileInput = this.container.querySelector('.invoice-file-input');
        this.uploadLabel = this.container.querySelector('.invoice-upload-label');
        this.fileNameDisplay = this.container.querySelector('.invoice-file-name');
        this.statusDisplay = this.container.querySelector('.invoice-status');
        this.extractedDataDisplay = this.container.querySelector('.invoice-extracted-data');

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
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        if (file.type !== 'application/pdf') {
            this.statusDisplay.textContent = '❌ Please upload a PDF file';
            this.statusDisplay.className = 'invoice-status error';
            return;
        }

        this.fileNameDisplay.textContent = `📄 ${file.name}`;
        this.statusDisplay.textContent = '⏳ Processing PDF...';
        this.statusDisplay.className = 'invoice-status processing';

        // Simulate PDF processing with a delay
        setTimeout(() => {
            this._processInvoicePDF(file);
        }, 1500);
    }

    /**
     * Simulate invoice data extraction from PDF.
     * In a real implementation, this would use a PDF library like pdfjs-dist.
     */
    _processInvoicePDF(file) {
        // Simulate PDF processing - extract mock data
        const simulatedData = this._simulateExtraction(file);

        if (simulatedData) {
            this.statusDisplay.textContent = '✅ Invoice processed successfully';
            this.statusDisplay.className = 'invoice-status success';
            this._displayExtractedData(simulatedData);
            this._populateFormFields(simulatedData);
        } else {
            this.statusDisplay.textContent = '❌ Could not extract data from PDF';
            this.statusDisplay.className = 'invoice-status error';
        }
    }

    /**
     * Simulate extraction of invoice data from PDF.
     * This is a mock implementation that generates random data for demonstration.
     */
    _simulateExtraction(file) {
        // Generate mock invoice data based on file name or random values
        const mockItems = [
            { name: 'Item A', quantity: Math.floor(Math.random() * 20) + 1 },
            { name: 'Item B', quantity: Math.floor(Math.random() * 15) + 1 },
            { name: 'Item C', quantity: Math.floor(Math.random() * 10) + 1 },
        ];

        return {
            itemName: mockItems[0].name,
            quantity: mockItems[0].quantity,
            fileName: file.name,
            processedAt: new Date().toLocaleString(),
            allItems: mockItems,
        };
    }

    /**
     * Display extracted data in the widget.
     */
    _displayExtractedData(data) {
        const itemsList = data.allItems
            .map((item) => `<li>${item.name}: ${item.quantity}</li>`)
            .join('');

        this.extractedDataDisplay.innerHTML = `
            <div class="invoice-extracted-details">
                <h4>Extracted Data:</h4>
                <ul>
                    ${itemsList}
                </ul>
                <p class="invoice-extracted-timestamp">Processed: ${data.processedAt}</p>
            </div>
        `;
    }

    /**
     * Populate related form fields with extracted data.
     */
    _populateFormFields(data) {
        // Find the form - try multiple approaches
        let form = this.element.closest('form');
        
        if (!form) {
            // Try to find form by looking up the DOM tree
            let parent = this.element.parentElement;
            while (parent && parent !== document.body) {
                if (parent.tagName === 'FORM' || parent.classList.contains('or')) {
                    form = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }

        if (!form) {
            console.warn('Could not find form element for field population');
            return;
        }

        // Strategy 1: Look for fields with data-invoice-field attribute
        this._setFieldValue(form, '[data-invoice-field="name"]', data.itemName);
        this._setFieldValue(form, '[data-invoice-field="quantity"]', data.quantity);

        // Strategy 2: Look for fields with specific naming patterns
        this._setFieldValue(form, 'input[name*="invoice_name"]', data.itemName);
        this._setFieldValue(form, 'input[name*="item_name"]', data.itemName);
        this._setFieldValue(form, 'input[name*="invoice_quantity"]', data.quantity);
        this._setFieldValue(form, 'input[name*="item_quantity"]', data.quantity);

        // Strategy 3: Look for fields by label text
        this._setFieldByLabel(form, 'name', data.itemName);
        this._setFieldByLabel(form, 'quantity', data.quantity);
    }

    /**
     * Helper method to set a form field value using a CSS selector.
     */
    _setFieldValue(form, selector, value) {
        const field = form.querySelector(selector);
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
            
            console.log(`Set field value: ${selector} = ${value}`);
            return true;
        }
        return false;
    }

    /**
     * Helper method to find and set a field by looking for nearby labels.
     */
    _setFieldByLabel(form, labelText, value) {
        // Find labels containing the text (case-insensitive)
        const labels = Array.from(form.querySelectorAll('label'));
        const label = labels.find(l => l.textContent.toLowerCase().includes(labelText.toLowerCase()));
        
        if (label) {
            // Try to find associated input
            let input = label.querySelector('input');
            
            // If not found inside label, try to find by for attribute
            if (!input && label.htmlFor) {
                input = form.querySelector(`#${label.htmlFor}`);
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
        this.extractedDataDisplay.innerHTML = '';
        super._reset();
    }
}

export default InvoiceExtractor;
