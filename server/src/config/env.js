const Joi = require('joi');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const schema = Joi.object({
  NODE_ENV:    Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  PORT:        Joi.number().default(5000),

  // Database
  MONGO_URI:   Joi.string().required(),

  // Redis
  REDIS_URL:   Joi.string().default('redis://localhost:6379'),

  // JWT — both secrets required in production
  JWT_SECRET:             Joi.string().min(32).required(),
  JWT_EXPIRES_IN:         Joi.string().default('15m'),
  JWT_REFRESH_SECRET:     Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:5173'),

  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: Joi.string().optional().allow(''),
  CLOUDINARY_API_KEY:    Joi.string().optional().allow(''),
  CLOUDINARY_API_SECRET: Joi.string().optional().allow(''),

  // OpenAI (optional — feature-flagged)
  OPENAI_API_KEY: Joi.string().optional().allow(''),

  // Email
  SMTP_HOST:     Joi.string().optional().allow(''),
  SMTP_PORT:     Joi.number().default(587),
  SMTP_USER:     Joi.string().optional().allow(''),
  SMTP_PASS:     Joi.string().optional().allow(''),
  SMTP_FROM:     Joi.string().default('noreply@intellmeet.com'),

  // Client
  CLIENT_URL:    Joi.string().default('http://localhost:5173'),
}).unknown(true); // allow OS env vars through

const { error, value: env } = schema.validate(process.env);

if (error) {
  // Crash immediately with a clear message — never run with broken config
  console.error(`\n[CONFIG ERROR] Environment validation failed:\n  ${error.message}\n`);
  process.exit(1);
}

module.exports = {
  env:  env.NODE_ENV,
  port: env.PORT,
  isDev:  env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  mongo: {
    uri: env.MONGO_URI,
  },
  redis: {
    url: env.REDIS_URL,
  },
  jwt: {
    secret:            env.JWT_SECRET,
    expiresIn:         env.JWT_EXPIRES_IN,
    refreshSecret:     env.JWT_REFRESH_SECRET,
    refreshExpiresIn:  env.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  },
  cloudinary: {
    name:   env.CLOUDINARY_CLOUD_NAME,
    key:    env.CLOUDINARY_API_KEY,
    secret: env.CLOUDINARY_API_SECRET,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  smtp: {
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT,
    user:   env.SMTP_USER,
    pass:   env.SMTP_PASS,
    from:   env.SMTP_FROM,
  },
  clientUrl: env.CLIENT_URL,
};
