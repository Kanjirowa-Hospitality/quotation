import { z } from "zod";

export const emailSchema = z
  .email("Enter a valid email address.")
  .trim()
  .toLowerCase();

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

export const verificationCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6 digit verification code.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password is required."),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
  password: passwordSchema,
});

export const adminPasswordResetConfirmSchema = z.object({
  code: verificationCodeSchema,
  password: passwordSchema,
});

export const createAdminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ""),
  email: emailSchema,
  password: passwordSchema,
});

export const updateAdminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ""),
  email: emailSchema,
  password: z
    .string()
    .optional()
    .transform((value) => value?.trim() || "")
    .refine((value) => !value || value.length >= 8, "Password must be at least 8 characters."),
});

export const deleteAdminUserSchema = z.object({
  email: emailSchema,
});

export function getValidationError(error: z.ZodError) {
  return error.issues[0]?.message || "Invalid request.";
}
