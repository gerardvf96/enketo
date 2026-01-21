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
        // Find related fields in the form
        const form = this.element.closest('form');

        if (!form) {
            return;
        }

        // Look for fields with data-invoice-field attribute
        const nameField = form.querySelector('[data-invoice-field="name"]');
        const quantityField = form.querySelector('[data-invoice-field="quantity"]');

        // Fallback: look for fields with specific naming patterns
        const nameFieldFallback =
            form.querySelector('input[name*="invoice_name"]') ||
            form.querySelector('input[name*="item_name"]');
        const quantityFieldFallback =
            form.querySelector('input[name*="invoice_quantity"]') ||
            form.querySelector('input[name*="item_quantity"]');

        // Set the values and trigger change events
        if (nameField || nameFieldFallback) {
            const target = nameField || nameFieldFallback;
            target.value = data.itemName;
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (quantityField || quantityFieldFallback) {
            const target = quantityField || quantityFieldFallback;
            target.value = data.quantity;
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }
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
