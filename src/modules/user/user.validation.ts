import { z } from 'zod';

export const blockWalletSchema = z.object({
  block: z.boolean(),
});

export const approveAgentSchema = z.object({
  approve: z.boolean(),
});
