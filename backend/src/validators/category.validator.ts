import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['FIXED', 'MONTHLY_RESET', 'CUSTOM']),
  configuredAmount: z.coerce.number().min(0, 'Amount must be positive'),
  color: z.string().min(1, 'Color is required'),
  description: z.string().optional().nullable(),
});
