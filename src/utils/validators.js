const Joi = require('joi');

// Phone number validation
const phoneRegex = /^254[0-9]{9}$/;

// Bulk payment validation schema
const bulkPaymentSchema = Joi.object({
  phoneNumbers: Joi.array()
    .items(
      Joi.string()
        .pattern(phoneRegex)
        .required()
        .messages({
          'string.pattern.base': 'Phone number must be in format 254712345678',
        })
    )
    .min(1)
    .max(100)
    .required(),
  amount: Joi.number()
    .min(1)
    .max(1000000)
    .required()
    .messages({
      'number.min': 'Amount must be at least 1 KES',
      'number.max': 'Amount cannot exceed 1,000,000 KES',
    }),
  reference: Joi.string()
    .max(50)
    .allow('', null)
    .messages({
      'string.max': 'Reference cannot exceed 50 characters',
    }),
  description: Joi.string()
    .max(200)
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 200 characters',
    }),
});

// Single phone validation
const phoneSchema = Joi.string()
  .pattern(phoneRegex)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in format 254712345678',
  });

// Status check validation
const statusCheckSchema = Joi.object({
  checkoutRequestId: Joi.string()
    .required()
    .messages({
      'any.required': 'Checkout Request ID is required',
    })
});

module.exports = {
  bulkPaymentSchema,
  phoneSchema,
  statusCheckSchema,
  phoneRegex
};
