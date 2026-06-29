import { Types } from 'mongoose';

export interface AuthUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  status: string;
  tenantId: Types.ObjectId | null;
  isVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: Types.ObjectId;
      tenantFilter?: Record<string, unknown>;
    }
  }
}
