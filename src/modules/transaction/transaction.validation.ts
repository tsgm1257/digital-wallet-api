import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const transactionSchema = z.object({
  username: z.string().trim().min(3, { message: "Username is required" }),
  amount: z.coerce
    .number()
    .min(0.01, { message: "Amount must be greater than 0" }),
});

export const sendMoneySchema = z.object({
  // username | @username | email | phone | _id
  recipient: z.string().trim().min(1, { message: "Recipient is required" }),
  amount: z.coerce
    .number()
    .min(0.01, { message: "Amount must be greater than 0" }),
});

// Accept either { userId } or { username } for cashIn / cashOut
const cashTarget = z.union([
  z.object({ userId: objectId }),
  z.object({ username: z.string().trim().min(3) }),
]);

export const cashInSchema = z
  .object({ amount: z.coerce.number().min(0.01) })
  .and(cashTarget);
export const cashOutSchema = z
  .object({ amount: z.coerce.number().min(0.01) })
  .and(cashTarget);
