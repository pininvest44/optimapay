const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// In-memory storage (for demo purposes)
// In production, use a database like MongoDB, PostgreSQL, etc.
class TransactionModel {
  constructor() {
    this.transactions = new Map();
    this.batches = new Map();
  }

  // Create a batch
  createBatch(phoneNumbers, amount, reference, description) {
    const batchId = `BATCH_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const batch = {
      id: batchId,
      phoneNumbers,
      amount,
      reference,
      description,
      status: 'pending',
      total: phoneNumbers.length,
      processed: 0,
      successful: 0,
      failed: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    
    this.batches.set(batchId, batch);
    logger.info(`Created batch ${batchId} with ${phoneNumbers.length} transactions`);
    return batch;
  }

  // Add transaction to batch
  addTransaction(batchId, phoneNumber, transactionData) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const transactionId = `TXN_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const transaction = {
      id: transactionId,
      batchId,
      phoneNumber,
      status: transactionData.success ? 'success' : 'failed',
      checkoutRequestId: transactionData.checkout_request_id || null,
      merchantRequestId: transactionData.merchant_request_id || null,
      message: transactionData.message || 'Unknown error',
      createdAt: new Date().toISOString(),
      ...transactionData
    };

    batch.transactions.push(transaction);
    batch.processed++;
    
    if (transactionData.success) {
      batch.successful++;
    } else {
      batch.failed++;
    }

    // Update batch status
    if (batch.processed === batch.total) {
      batch.status = 'completed';
      batch.completedAt = new Date().toISOString();
      logger.info(`Batch ${batchId} completed. Success: ${batch.successful}, Failed: ${batch.failed}`);
    }

    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  // Get batch by ID
  getBatch(batchId) {
    return this.batches.get(batchId);
  }

  // Get transaction by ID
  getTransaction(transactionId) {
    return this.transactions.get(transactionId);
  }

  // Get all batches with pagination
  getBatches(limit = 20, offset = 0) {
    const allBatches = Array.from(this.batches.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return {
      batches: allBatches.slice(offset, offset + limit),
      total: allBatches.length,
      limit,
      offset
    };
  }

  // Get transactions for a batch
  getBatchTransactions(batchId) {
    const batch = this.batches.get(batchId);
    return batch ? batch.transactions : [];
  }

  // Update transaction status (for status checking)
  updateTransactionStatus(checkoutRequestId, statusData) {
    for (const [id, transaction] of this.transactions) {
      if (transaction.checkoutRequestId === checkoutRequestId) {
        transaction.status = statusData.status;
        transaction.statusCheck = statusData;
        transaction.lastChecked = new Date().toISOString();
        this.transactions.set(id, transaction);
        
        // Update batch status if needed
        const batch = this.batches.get(transaction.batchId);
        if (batch) {
          const txn = batch.transactions.find(t => t.id === id);
          if (txn) {
            txn.status = statusData.status;
            txn.statusCheck = statusData;
            txn.lastChecked = new Date().toISOString();
          }
        }
        
        return transaction;
      }
    }
    return null;
  }
}

// Singleton instance
const transactionModel = new TransactionModel();
module.exports = transactionModel;
