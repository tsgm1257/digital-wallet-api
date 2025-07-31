import { z } from 'zod';

export const moneySchema = z.object({
  amount: z.number().min(0.01, { message: 'Amount must be greater than 0' }),
});
