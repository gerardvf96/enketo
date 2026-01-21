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
    // Generate random mock data
    const mockItems = ['Item A', 'Item B', 'Item C', 'Item D', 'Item E'];
    const randomName = mockItems[Math.floor(Math.random() * mockItems.length)];
    const randomQuantity = Math.floor(Math.random() * 20) + 1;

    return res.json({
        itemName: randomName,
        quantity: randomQuantity,
    });
};

// Routes
router.post('/extract', extractInvoice);


