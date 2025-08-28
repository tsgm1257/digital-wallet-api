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
  recipient: z.string().trim().min(1, { message: "Recipient is required" }), // username | email | phone | @username
  amount: z.coerce
    .number()
    .min(0.01, { message: "Amount must be greater than 0" }),
});

export const cashInSchema = z.object({
  userId: objectId,
  amount: z.coerce
    .number()
    .min(0.01, { message: "Amount must be greater than 0" }),
});

export const cashOutSchema = z.object({
  userId: objectId,
  amount: z.coerce
    .number()
    .min(0.01, { message: "Amount must be greater than 0" }),
});
