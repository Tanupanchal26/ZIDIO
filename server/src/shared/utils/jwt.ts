import jwt from 'jsonwebtoken';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../../config/env');

export const signToken = (payload: object, expiresIn = '7d'): string => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string): { valid: boolean; payload?: any; error?: any } => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err };
  }
};
