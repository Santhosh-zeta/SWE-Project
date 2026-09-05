import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  age: z.coerce.number().min(1, 'Age must be positive').optional(),
  monthlySalary: z.coerce.number().min(0, 'Salary must be positive').optional(),
});
