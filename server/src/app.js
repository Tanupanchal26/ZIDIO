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

const app = express();

app.use(requestId);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: config.isProd,
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || config.cors.allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.options('*', cors());

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
app.use(errorMiddleware);

module.exports = app;
