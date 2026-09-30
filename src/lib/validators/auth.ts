import { Role } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(64)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(64)
});

export const assignableRoleSchema = z.enum([Role.SUPER_ADMIN, Role.EMPLOYEE], { message: "Role must be Admin or Employee." });

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: assignableRoleSchema,
  birthday: z.string().optional().nullable(),
  tempPassword: z.string().min(8).max(64)
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: assignableRoleSchema,
  name: z.string().optional().nullable()
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: assignableRoleSchema.optional(),
  birthday: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(64)
});
