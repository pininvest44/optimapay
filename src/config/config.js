const Joi = require('joi');
const logger = require('../utils/logger');

// Configuration validation schema
const configSchema = Joi.object({
  OPTIMA_API_KEY: Joi.string().required(),
  OPTIMA_API_SECRET: Joi.string().required(),
  OPTIMA_BASE_URL: Joi.string().uri().required(),
  OPTIMA_PAYMENT_ACCOUNT_ID: Joi.number().required(),
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(30),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs/app.log')
});

// Validate and load configuration
const { error, value: config } = configSchema.validate(process.env, {
  allowUnknown: true,
  abortEarly: false
});

if (error) {
  logger.error('Configuration validation failed:', error.details);
  throw new Error(`Configuration validation failed: ${error.message}`);
}

module.exports = {
  api: {
    key: config.OPTIMA_API_KEY,
    secret: config.OPTIMA_API_SECRET,
    baseUrl: config.OPTIMA_BASE_URL,
    paymentAccountId: config.OPTIMA_PAYMENT_ACCOUNT_ID,
  },
  server: {
    port: config.PORT,
    env: config.NODE_ENV,
  },
  rateLimit: {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
  },
  logging: {
    level: config.LOG_LEVEL,
    filePath: config.LOG_FILE_PATH,
  }
};
