# IntellMeet — Environment Variables Reference

All variables are documented with type, requirement, and description.

---

## Server (`server/.env`)

### Application

| Variable   | Required | Default       | Description |
|------------|----------|---------------|-------------|
| `NODE_ENV` | No       | `development` | Runtime environment: `development`, `staging`, `production`, `test` |
| `PORT`     | No       | `5000`        | HTTP server port |

### Database

| Variable    | Required | Description |
|-------------|----------|-------------|
| `MONGO_URI` | **Yes**  | MongoDB connection string. Include credentials and `authSource` for Atlas. Example: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/intellmeet` |

### Redis

| Variable    | Required | Default                    | Description |
|-------------|----------|----------------------------|-------------|
| `REDIS_URL` | No       | `redis://localhost:6379`   | Redis connection URL. Supports `rediss://` for TLS. |

### JWT Security

> Generate strong secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

| Variable                | Required | Default | Description |
|-------------------------|----------|---------|-------------|
| `JWT_SECRET`            | **Yes**  | —       | Access token HMAC secret. Min 32 chars. Use 64+ in production. |
| `JWT_EXPIRES_IN`        | No       | `15m`   | Access token lifetime. |
| `JWT_REFRESH_SECRET`    | **Yes**  | —       | Refresh token secret. **Must differ from JWT_SECRET.** |
| `JWT_REFRESH_EXPIRES_IN`| No       | `7d`    | Refresh token lifetime. |

### CORS & Cookies

| Variable          | Required | Default                     | Description |
|-------------------|----------|-----------------------------|-------------|
| `ALLOWED_ORIGINS` | No       | `http://localhost:5173`     | Comma-separated list of allowed frontend origins. |
| `CLIENT_URL`      | No       | `http://localhost:5173`     | Base URL of frontend, used in email links. |
| `COOKIE_DOMAIN`   | No       | —                           | Cookie domain for multi-subdomain setups (e.g. `.intellmeet.com`). |

### Google OAuth (optional)

| Variable               | Required | Description |
|------------------------|----------|-------------|
| `GOOGLE_CLIENT_ID`     | No       | Google OAuth 2.0 client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | No       | Google OAuth 2.0 client secret. |
| `GOOGLE_CALLBACK_URL`  | No       | Must match the redirect URI registered in Google Cloud. Example: `https://api.intellmeet.com/api/v1/auth/google/callback` |

### Cloudinary (file uploads)

| Variable                | Required | Description |
|-------------------------|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | No       | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY`    | No       | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | No       | Cloudinary API secret. |

### OpenAI (AI features)

| Variable         | Required | Description |
|------------------|----------|-------------|
| `OPENAI_API_KEY` | No       | OpenAI API key. Required for AI summary, transcription, and assistant features. Without this key, AI endpoints return empty results. |

### SMTP (email notifications)

| Variable     | Required | Default                       | Description |
|--------------|----------|-------------------------------|-------------|
| `SMTP_HOST`  | No       | —                             | SMTP server hostname (e.g. `smtp.sendgrid.net`) |
| `SMTP_PORT`  | No       | `587`                         | SMTP port. 587 for STARTTLS, 465 for SSL. |
| `SMTP_USER`  | No       | —                             | SMTP username / API key username. |
| `SMTP_PASS`  | No       | —                             | SMTP password / API key. |
| `SMTP_FROM`  | No       | `noreply@intellmeet.com`      | Sender address shown in emails. |
| `SMTP_SECURE`| No       | `false`                       | Use SSL on connect (`true` for port 465). |

---

## Client (`client/.env`)

| Variable              | Required | Default                          | Description |
|-----------------------|----------|----------------------------------|-------------|
| `VITE_API_BASE_URL`   | **Yes**  | `http://localhost:5000/api/v1`   | Full backend API URL **including `/api/v1` suffix**. |
| `VITE_SOCKET_URL`     | **Yes**  | `http://localhost:5000`          | Socket.IO server URL (no path). |
| `VITE_GOOGLE_CLIENT_ID` | No     | —                                | Google OAuth client ID (same as server `GOOGLE_CLIENT_ID`). Used for the Google login button. |

---

## Production Checklist

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are randomly generated 64-char strings
- [ ] `.env` files are **not** committed to version control
- [ ] Secrets are stored in AWS Secrets Manager / Parameter Store
- [ ] `MONGO_URI` uses authentication and TLS
- [ ] `REDIS_URL` uses `rediss://` (TLS) in production
- [ ] `ALLOWED_ORIGINS` contains only your production frontend URL
- [ ] `NODE_ENV=production` is set
- [ ] `COOKIE_DOMAIN` is set for multi-subdomain deployments
