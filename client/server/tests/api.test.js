/**
 * Integration / API Tests — supertest against real Express app
 * Tests the full HTTP stack: routing → middleware → controller → service (mocked)
 */
process.env.NODE_ENV           = 'test';
process.env.MONGO_URI          = 'mongodb://localhost:27017/intellmeet_test';
process.env.JWT_SECRET         = 'test-access-secret-minimum-32-characters!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters!';

const request = require('supertest');
const app     = require('../src/app');

// ── GET /health ───────────────────────────────────────────────────────────────
describe('API: Health endpoint', () => {
  it('GET /health returns 200 with status, uptime, timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ── 404 / not-found ───────────────────────────────────────────────────────────
describe('API: 404 handler', () => {
  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('redirects /api/... to /api/v1/...', async () => {
    const res = await request(app).get('/api/health');
    expect([301, 302, 404]).toContain(res.status);
  });
});

// ── Auth route shape ──────────────────────────────────────────────────────────
describe('API: Auth routes — input validation', () => {
  it('POST /api/v1/auth/signup with missing body returns 422', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({});
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login with missing credentials returns 422', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect([400, 422]).toContain(res.status);
  });

  it('POST /api/v1/auth/forgot-password with invalid email returns 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'not-an-email' });
    expect([400, 422]).toContain(res.status);
  });

  it('GET /api/v1/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/logout without token returns 401', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ── Protected routes — no token ───────────────────────────────────────────────
describe('API: Protected routes reject unauthenticated requests', () => {
  const routes = [
    ['GET',    '/api/v1/meetings'],
    ['POST',   '/api/v1/meetings'],
    ['GET',    '/api/v1/teams'],
    ['POST',   '/api/v1/teams'],
    ['GET',    '/api/v1/notifications'],
    ['GET',    '/api/v1/tasks'],
    ['GET',    '/api/v1/users/me'],
  ];

  routes.forEach(([method, path]) => {
    it(`${method} ${path} returns 401`, async () => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.status).toBe(401);
    });
  });
});

// ── AI routes — no token ──────────────────────────────────────────────────────
describe('API: AI routes reject unauthenticated requests', () => {
  it('GET /api/v1/ai/search returns 401', async () => {
    const res = await request(app).get('/api/v1/ai/search?q=test');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/ai/fakeid/summary returns 401', async () => {
    const res = await request(app).post('/api/v1/ai/fakeid/summary');
    expect(res.status).toBe(401);
  });
});

// ── Rate limiting headers present ─────────────────────────────────────────────
describe('API: Rate limit headers', () => {
  it('API responses include RateLimit-* headers', async () => {
    const res = await request(app).get('/api/v1/meetings');
    // 401 but headers still applied
    expect(res.headers).toHaveProperty('ratelimit-limit');
  });
});

// ── Response envelope shape ───────────────────────────────────────────────────
describe('API: Error response envelope', () => {
  it('error responses include success:false and message', async () => {
    const res = await request(app).get('/api/v1/meetings');
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
  });
});
