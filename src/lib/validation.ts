import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name too long'),
    email: z.string().email('Enter a valid email address').toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: z
      .string()
      .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format')
      .optional()
      .or(z.literal('')),
    terms: z.literal(true, { error: 'You must accept the terms' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address').toLowerCase(),
});

const todayStr = new Date().toISOString().split('T')[0];
export const bookingSchema = z.object({
  service: z.string().min(1, 'Select a service'),
  date: z.string().min(1, 'Select a date').refine((d) => d >= todayStr, 'Date must be today or in the future'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Select a time slot'),
  notes: z.string().max(200, 'Notes must be 200 characters or less').optional(),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;

export function getPasswordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#f87171', '#f87171', '#FFB347', '#52E89A', '#4ade80'];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score], color: colors[score] };
}
