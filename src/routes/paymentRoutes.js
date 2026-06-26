const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { phoneRateLimiter } = require('../middlewares/rateLimiter');

// Bulk payment route
router.post('/bulk', 
  phoneRateLimiter,
  paymentController.processBulkPayment
);

// Get batch status
router.get('/batch/:batchId', paymentController.getBatchStatus);

// Get all batches
router.get('/batches', paymentController.getBatches);

// Check transaction status
router.get('/status/:checkoutRequestId', paymentController.checkTransactionStatus);

// Get transaction details
router.get('/transaction/:transactionId', paymentController.getTransaction);

module.exports = router;
