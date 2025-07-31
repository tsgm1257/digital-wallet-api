import { z } from 'zod';

export const transactionSchema = z.object({
  username: z.string().min(3, { message: 'Username is required' }),
  amount: z.number().min(0.01, { message: 'Amount must be greater than 0' }),
});

export const sendMoneySchema = z.object({
  recipientUsername: z.string().min(3, { message: 'Recipient username is required' }),
  amount: z.number().min(0.01, { message: 'Amount must be greater than 0' }),
});
