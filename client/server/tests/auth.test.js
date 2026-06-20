/**
 * Auth Service Unit Tests
 * Run: npm test
 */

// Set test env before loading any module
process.env.NODE_ENV           = 'test';
process.env.MONGO_URI          = 'mongodb://localhost:27017/intellmeet_test';
process.env.JWT_SECRET         = 'test-access-secret-minimum-32-characters!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters!';

const mongoose = require('mongoose');

// ── Test doubles ──────────────────────────────────────────────────────────────
jest.mock('../src/repositories/user.repository');
jest.mock('../src/services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const userRepo   = require('../src/repositories/user.repository');
const authService = require('../src/services/auth.service');
const jwtService  = require('../src/services/jwt.service');
const ApiError   = require('../src/utils/ApiError');
const { ROLES, USER_STATUS, AUTH } = require('../src/constants');

// ── Factory helpers ──────────────────────────────────────────────────────────
const makeUser = (overrides = {}) => ({
  _id:           new mongoose.Types.ObjectId(),
  name:          'Test User',
  email:         'test@intellmeet.com',
  role:          ROLES.EMPLOYEE,
  status:        USER_STATUS.ACTIVE,
  isVerified:    false,
  loginAttempts: 0,
  lockUntil:     null,
  isLocked:      false,
  refreshTokens: [],
  comparePassword:  jest.fn().mockResolvedValue(true),
  incLoginAttempts: jest.fn().mockResolvedValue(undefined),
  resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
  createToken:   jest.fn().mockReturnValue('raw-token-abc'),
  save:          jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. SIGNUP
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.signup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates user, issues tokens, queues verification email', async () => {
    const user = makeUser();
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.create.mockResolvedValue(user);
    userRepo.addRefreshToken.mockResolvedValue(undefined);

    const result = await authService.signup({
      name: 'Test User', email: 'test@intellmeet.com', password: 'P@ssw0rd!',
    });

    expect(userRepo.create).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user).toBeDefined();
  });

  it('throws conflict when email already exists', async () => {
    userRepo.findByEmail.mockResolvedValue(makeUser());
    await expect(authService.signup({ name: 'X', email: 'test@intellmeet.com', password: 'P@ssw0rd!' }))
      .rejects.toThrow('already exists');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOGIN
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns tokens on valid credentials', async () => {
    const user = makeUser();
    userRepo.findByEmailForAuth.mockResolvedValue(user);
    userRepo.addRefreshToken.mockResolvedValue(undefined);

    const result = await authService.login({ email: 'test@intellmeet.com', password: 'P@ssw0rd!' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(user.resetLoginAttempts).toHaveBeenCalled();
  });

  it('throws unauthorized for unknown email', async () => {
    userRepo.findByEmailForAuth.mockResolvedValue(null);
    await expect(authService.login({ email: 'no@test.com', password: 'pass' }))
      .rejects.toBeInstanceOf(ApiError);
  });

  it('throws unauthorized for wrong password and increments attempts', async () => {
    const user = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
    userRepo.findByEmailForAuth.mockResolvedValue(user);

    await expect(authService.login({ email: 'test@intellmeet.com', password: 'Wrong!' }))
      .rejects.toBeInstanceOf(ApiError);
    expect(user.incLoginAttempts).toHaveBeenCalled();
  });

  it('throws forbidden for banned account', async () => {
    const user = makeUser({ status: USER_STATUS.BANNED });
    userRepo.findByEmailForAuth.mockResolvedValue(user);

    await expect(authService.login({ email: 'test@intellmeet.com', password: 'P@ssw0rd!' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws forbidden when account is locked', async () => {
    const user = makeUser({
      isLocked:  true,
      lockUntil: new Date(Date.now() + 5 * 60 * 1000),
    });
    userRepo.findByEmailForAuth.mockResolvedValue(user);

    await expect(authService.login({ email: 'test@intellmeet.com', password: 'P@ssw0rd!' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.logout', () => {
  it('removes hashed refresh token from user record', async () => {
    userRepo.removeRefreshToken.mockResolvedValue(undefined);
    await authService.logout('user-id', 'raw-refresh-token');
    expect(userRepo.removeRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('does nothing if no refresh token provided', async () => {
    userRepo.removeRefreshToken.mockClear();
    await authService.logout('user-id', undefined);
    expect(userRepo.removeRefreshToken).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. REFRESH TOKEN ROTATION
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.refreshTokens', () => {
  it('throws if no token provided', async () => {
    await expect(authService.refreshTokens(undefined))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('detects token reuse and revokes all sessions', async () => {
    // Issue a valid refresh token
    const user = makeUser();
    const { refreshToken } = jwtService.generateTokenPair(user);

    // Token is NOT in the DB (already rotated = reuse)
    userRepo.findByRefreshToken.mockResolvedValue(null);
    userRepo.clearAllRefreshTokens.mockResolvedValue(undefined);

    await expect(authService.refreshTokens(refreshToken))
      .rejects.toMatchObject({ statusCode: 401 });

    expect(userRepo.clearAllRefreshTokens).toHaveBeenCalled();
  });

  it('issues new token pair on valid token', async () => {
    const user = makeUser();
    const { refreshToken } = jwtService.generateTokenPair(user);

    userRepo.findByRefreshToken.mockResolvedValue(user);
    userRepo.removeRefreshToken.mockResolvedValue(undefined);
    userRepo.addRefreshToken.mockResolvedValue(undefined);

    // Small delay so JWT iat differs (tokens issued within same ms are identical)
    await new Promise(r => setTimeout(r, 1100));

    const result = await authService.refreshTokens(refreshToken);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(refreshToken);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.forgotPassword', () => {
  it('silently returns for unknown email (no information leak)', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    await expect(authService.forgotPassword('unknown@test.com')).resolves.toBeUndefined();
  });

  it('creates reset token and sends email for known email', async () => {
    const user = makeUser();
    userRepo.findByEmail.mockResolvedValue(user);

    await authService.forgotPassword('test@intellmeet.com');
    expect(user.createToken).toHaveBeenCalledWith('passwordReset');
    expect(user.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.resetPassword', () => {
  it('throws for invalid/expired token', async () => {
    userRepo.findByResetToken.mockResolvedValue(null);
    await expect(authService.resetPassword('bad-token', 'NewP@ss1!'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('resets password and clears token for valid token', async () => {
    const user = makeUser();
    userRepo.findByResetToken.mockResolvedValue(user);

    await authService.resetPassword('valid-raw-token', 'NewP@ss1!');
    expect(user.password).toBe('NewP@ss1!');
    expect(user.passwordResetToken).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. VERIFY EMAIL
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.verifyEmail', () => {
  it('throws for invalid token', async () => {
    userRepo.findByVerifyToken.mockResolvedValue(null);
    await expect(authService.verifyEmail('invalid-token'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('sets isVerified = true and clears token', async () => {
    const user = makeUser({ isVerified: false });
    userRepo.findByVerifyToken.mockResolvedValue(user);

    await authService.verifyEmail('valid-token');
    expect(user.isVerified).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.changePassword', () => {
  it('throws if current password is wrong', async () => {
    const user = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
    userRepo.findByIdWithPassword.mockResolvedValue(user);

    await expect(authService.changePassword('uid', 'wrong', 'NewP@ss1!'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('updates password when current is correct', async () => {
    const user = makeUser();
    userRepo.findByIdWithPassword.mockResolvedValue(user);

    await authService.changePassword('uid', 'correct', 'NewP@ss1!');
    expect(user.password).toBe('NewP@ss1!');
    expect(user.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. JWT SERVICE
// ─────────────────────────────────────────────────────────────────────────────
describe('jwtService', () => {
  const mockUser = makeUser();

  it('generates a valid token pair', () => {
    const { accessToken, refreshToken } = jwtService.generateTokenPair(mockUser);
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
  });

  it('access token verifies correctly', () => {
    const { accessToken } = jwtService.generateTokenPair(mockUser);
    const decoded = jwtService.verifyAccessToken(accessToken);
    expect(decoded.id).toBe(mockUser._id.toString());
    expect(decoded.role).toBe(mockUser.role);
  });

  it('refresh token verifies correctly', () => {
    const { refreshToken } = jwtService.generateTokenPair(mockUser);
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    expect(decoded.id).toBe(mockUser._id.toString());
  });

  it('hashes tokens deterministically', () => {
    const hash1 = jwtService.hashToken('same-token');
    const hash2 = jwtService.hashToken('same-token');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe('same-token');
  });
});
