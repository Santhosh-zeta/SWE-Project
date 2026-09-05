import { z } from 'zod';

export const expenseSchema = z.object({
  categoryId: z.number().int().positive('Category is required'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date string',
  }),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().optional().nullable(),
});
