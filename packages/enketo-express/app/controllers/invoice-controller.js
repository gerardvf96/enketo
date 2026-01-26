/**
 * @module invoice-controller
 * Handles invoice extraction API requests
 */

const express = require('express');

const router = express.Router();

module.exports = (app) => {
    app.use(`${app.get('base path')}/api/invoice`, router);
};

/**
 * Extract invoice data
 * POST /api/invoice/extract
 */
const extractInvoice = (req, res) => {
    // Generate random invoice number (F + 6 digits)
    const numeroFactura = `F${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Generate random import between 10 and 1000 with 2 decimals
    // Ensure period (.) as decimal separator for HTML number inputs
    const importFactura = Number((Math.random() * (1000 - 10) + 10).toFixed(2));
    
    // Generate description based on invoice number
    const descripcioFactura = `Descripció de ${numeroFactura}`;
    
    // Generate random date in previous 10 days
    const today = new Date();
    const daysAgo = Math.floor(Math.random() * 10);
    const dataFactura = new Date(today.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const formattedDate = dataFactura.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Generate random provider name
    const providerNames = [
        'Proveïdor ABC SL',
        'Empresa XYZ SA',
        'Subministraments Tech',
        'Serveis Global SL',
        'Importacions Ràpides',
        'Distribucions Catalunya',
        'Materials Industrials',
        'Papereria Moderna'
    ];
    const nomProveidorFactura = providerNames[Math.floor(Math.random() * providerNames.length)];
    
    // Generate random NIF (8 digits + 1 letter)
    const nifNumber = Math.floor(10000000 + Math.random() * 90000000);
    const nifLetters = 'ABCDEFGHJKLMNPQRSTVWXYZ';
    const nifLetter = nifLetters.charAt(Math.floor(Math.random() * nifLetters.length));
    const nifProveidorFactura = `${nifNumber}${nifLetter}`;

    return res.json({
        numero_factura: numeroFactura,
        import_factura: importFactura,
        descripcio_factura: descripcioFactura,
        data_factura: formattedDate,
        nom_proveidor_factura: nomProveidorFactura,
        nif_proveidor_factura: nifProveidorFactura
    });
};

// Routes
router.post('/extract', extractInvoice);


