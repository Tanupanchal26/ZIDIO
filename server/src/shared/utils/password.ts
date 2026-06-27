import bcrypt from 'bcryptjs';

export const hashPassword = async (plain: string, rounds = 10): Promise<string> => {
  return await bcrypt.hash(plain, rounds);
};

export const comparePassword = async (plain: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(plain, hash);
};
