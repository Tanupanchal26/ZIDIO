import express from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xss = require('xss-clean');
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import client from 'prom-client';
import { getRedisClient } from './config/redis';

import config from './config/env';
const requestId = require('./middleware/requestId.middleware');
import httpLogger from './middleware/httpLogger.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
const notFound = require('./middleware/notFound.middleware');
import errorMiddleware from './middleware/error.middleware';
import passport from './config/passport';
import v1Router from './routes/v1/index';
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./config/sentry');

const app = express();

initSentry(app);
app.use(sentryRequestHandler());
app.use(requestId);

// Trust the first proxy hop (nginx) so express-rate-limit sees real client IPs
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https://res.cloudinary.com', 'https://lh3.googleusercontent.com'],
      connectSrc: ["'self'", 'http://localhost:5000', 'ws://localhost:5000'],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
}));

const corsOptions: CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (config.isDev) return cb(null, true);
    if (config.cors.allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(httpLogger);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const redisClient = getRedisClient();
app.use(session({
  store: redisClient
    ? new RedisStore({ client: redisClient, prefix: 'sess:' })
    : undefined,
  secret:            config.jwt.secret,
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: config.isProd, httpOnly: true, maxAge: 10 * 60 * 1000 },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

app.use('/api', apiLimiter);

client.collectDefaultMetrics();

app.get('/health', async (_req: Request, res: Response) => {
  const mongo = mongoose.connection.readyState === 1;
  const redis = getRedisClient()?.isReady ?? false;
  const status = mongo && redis ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
    requestId: res.locals.requestId,
    dependencies: { mongo, redis },
  });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.use('/api/v1', v1Router);
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.url.startsWith('/v1')) return next();
  res.redirect(301, `/api/v1${req.url}`);
});

app.use(notFound);
app.use(sentryErrorHandler());
app.use(errorMiddleware);

export default app;
