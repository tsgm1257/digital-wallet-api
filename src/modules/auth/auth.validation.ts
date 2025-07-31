import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['user', 'agent', 'admin']),
});

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});
