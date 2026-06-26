const optimaPayService = require('../services/optimaPayService');
const transactionModel = require('../models/transactionModel');
const { bulkPaymentSchema, statusCheckSchema } = require('../utils/validators');
const logger = require('../utils/logger');
const config = require('../config/config');

class PaymentController {
  /**
   * Process bulk STK Push payments
   */
  async processBulkPayment(req, res, next) {
    try {
      // Validate request body
      const { error, value } = bulkPaymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { phoneNumbers, amount, reference, description } = value;

      // Create batch record
      const batch = transactionModel.createBatch(phoneNumbers, amount, reference, description);

      // Process each phone number
      const results = [];
      for (const phone of phoneNumbers) {
        // Initiate STK Push
        const result = await optimaPayService.initiateSTKPush(
          phone,
          amount,
          reference,
          description
        );

        // Store transaction
        const transaction = transactionModel.addTransaction(batch.id, phone, result);
        results.push({
          phoneNumber: phone,
          success: result.success,
          message: result.message,
          checkoutRequestId: result.checkout_request_id,
          transactionId: transaction.id
        });

        // Small delay between requests to avoid hitting API limits
        if (phoneNumbers.indexOf(phone) < phoneNumbers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Return response
      res.status(200).json({
        success: true,
        message: `Processed ${results.length} payments`,
        batchId: batch.id,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        results: results,
        completedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Bulk payment processing error:', error);
      next(error);
    }
  }

  /**
   * Get batch status
   */
  async getBatchStatus(req, res, next) {
    try {
      const { batchId } = req.params;
      const batch = transactionModel.getBatch(batchId);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Batch not found'
        });
      }

      res.status(200).json({
        success: true,
        data: batch
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all batches
   */
  async getBatches(req, res, next) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const result = transactionModel.getBatches(
        parseInt(limit),
        parseInt(offset)
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(req, res, next) {
    try {
      const { error, value } = statusCheckSchema.validate(req.params);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { checkoutRequestId } = value;
      
      // Check with OptimaPay API
      const statusResult = await optimaPayService.checkTransactionStatus(checkoutRequestId);
      
      // Update local record
      if (statusResult.success) {
        transactionModel.updateTransactionStatus(checkoutRequestId, statusResult);
      }

      res.status(200).json({
        success: statusResult.success,
        status: statusResult.status,
        message: statusResult.message,
        data: statusResult.data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(req, res, next) {
    try {
      const { transactionId } = req.params;
      const transaction = transactionModel.getTransaction(transactionId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.status(200).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
