import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { generateToken } from '../utils/jwt';

const DEFAULT_CATEGORIES = [
  { name: 'Rent',          type: 'FIXED' as const, configuredAmount: 0, color: '#EF4444', description: 'Monthly rent' },
  { name: 'Water',         type: 'FIXED' as const, configuredAmount: 0, color: '#3B82F6', description: 'Water bill' },
  { name: 'Electricity',   type: 'FIXED' as const, configuredAmount: 0, color: '#F59E0B', description: 'Electricity bill' },
  { name: 'Food',          type: 'FIXED' as const, configuredAmount: 0, color: '#10B981', description: 'Groceries and meals' },
  { name: 'Gas',           type: 'FIXED' as const, configuredAmount: 0, color: '#8B5CF6', description: 'Gas / fuel' },
  { name: 'Entertainment', type: 'MONTHLY_RESET' as const, configuredAmount: 0, color: '#EC4899', description: 'Entertainment budget' },
  { name: 'Movies',        type: 'MONTHLY_RESET' as const, configuredAmount: 0, color: '#F97316', description: 'Movies and streaming' },
  { name: 'Hobbies',       type: 'MONTHLY_RESET' as const, configuredAmount: 0, color: '#14B8A6', description: 'Hobbies and leisure' },
];

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        age: validatedData.age,
        monthlySalary: validatedData.monthlySalary
      }
    });

    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user.id }))
    });

    const token = generateToken(user.id);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          age: user.age,
          monthlySalary: user.monthlySalary
        }
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(validatedData.password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          age: user.age,
          monthlySalary: user.monthlySalary
        }
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        monthlySalary: user.monthlySalary
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
