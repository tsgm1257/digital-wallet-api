import { z } from "zod";

export const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s\-().]{7,20}$/)
    .optional(),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const lookupSchema = z
  .object({
    username: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^[+]?[\d\s\-().]{7,20}$/)
      .optional(),
    q: z.string().min(1).optional(), // generic single field search
  })
  .refine((obj) => !!(obj.username || obj.email || obj.phone || obj.q), {
    message: "Provide username, email, phone, or q",
  });
