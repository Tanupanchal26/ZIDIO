import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const signToken = (payload: object, expiresIn = '7d'): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): { valid: boolean; payload?: any; error?: any } => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err };
  }
};
