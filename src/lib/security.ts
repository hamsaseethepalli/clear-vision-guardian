import { z } from "zod";

// ── OWASP-aligned input validation schemas ──

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(255, "Email too long")
  .transform((e) => e.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Minimum 8 characters")
  .max(128, "Maximum 128 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(100, "Too long")
  .regex(/^[a-zA-Z\s'-]+$/, "Only letters, spaces, hyphens, and apostrophes");

export const licenseSchema = z
  .string()
  .trim()
  .min(3, "License number too short")
  .max(50, "License number too long")
  .regex(/^[A-Za-z0-9\-/]+$/, "Invalid license format");

export const specializationSchema = z
  .string()
  .trim()
  .min(2, "Specialization too short")
  .max(100, "Specialization too long");

export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must be numeric");

// ── Rate limiting (client-side) ──
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

// ── Sanitize output (XSS prevention) ──
export function sanitize(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── CSP nonce generator ──
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
