// @ts-nocheck
const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const compression   = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss           = require('xss-clean');
const hpp           = require('hpp');
const cookieParser  = require('cookie-parser');
const session       = require('express-session');

const config           = require('./config/env');
const requestId        = require('./middleware/requestId.middleware');
const httpLogger       = require('./middleware/httpLogger.middleware');
const { apiLimiter }   = require('./middleware/rateLimit.middleware');
const notFound         = require('./middleware/notFound.middleware');
const errorMiddleware  = require('./middleware/error.middleware');
const passport         = require('./config/passport');
const v1Router         = require('./routes/v1/index');
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./config/sentry');

const app = express();

// Initialize Sentry (must be before any other middleware)
initSentry(app);
app.use(sentryRequestHandler());
app.use(requestId);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: config.isProd,
}));

const corsOptions = {
  origin: (origin, cb) => {
    // 1. Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return cb(null, true);
    
    // 2. Allow ALL origins during local development to prevent Network Errors
    if (config.isDev) return cb(null, true);
    
    // 3. Check if the origin is in our allowed list (.env)
    if (config.cors.allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    
    // 4. Gracefully reject CORS without throwing a 500 Error
    // This tells the browser "No" cleanly instead of crashing the server.
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204 // Ensures OPTIONS return 204 No Content
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(httpLogger);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Session ONLY for OAuth state — short-lived, not used for auth
app.use(session({
  secret:            config.jwt.secret,
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, httpOnly: true, maxAge: 10 * 60 * 1000 },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

app.use('/api', apiLimiter);

app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: res.locals.requestId,
  })
);

app.use('/api/v1', v1Router);
app.use('/api', (req, res, next) => {
  if (req.url.startsWith('/v1')) {
    return next();
  }
  res.redirect(301, `/api/v1${req.url}`);
});

app.use(notFound);
app.use(sentryErrorHandler());
app.use(errorMiddleware);

module.exports = app;

export {};
