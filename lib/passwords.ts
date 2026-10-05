import { createHash, randomBytes, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-rules";

export { PASSWORD_MIN_LENGTH };

/** New password + confirmation, shared by every set-a-password form. */
export const newPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`).max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// No 0/O, 1/l/I: a temporary password is read aloud or retyped from a message.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** e.g. "Kx7m-Pq4t-Wz9r": ~70 bits, easy to read out, and it's single-use anyway. */
export function generateTemporaryPassword(): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

/** The raw token goes in the emailed link; only its hash is stored. */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
