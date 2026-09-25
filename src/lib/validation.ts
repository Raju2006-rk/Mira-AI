import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Please tell us your name").max(80),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});

export const chatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, "Say something first").max(2000),
  mode: z
    .enum([
      "CONVERSATION",
      "TEACHER",
      "CORRECTION",
      "INTERVIEW",
      "ROLEPLAY",
      "PRONUNCIATION",
    ])
    .default("CONVERSATION"),
});

export const phrasingSchema = z.object({
  idea: z.string().min(1).max(500),
});

export const fixSchema = z.object({
  sentence: z.string().min(1).max(500),
});

export const findWordSchema = z.object({
  description: z.string().min(1).max(500),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
