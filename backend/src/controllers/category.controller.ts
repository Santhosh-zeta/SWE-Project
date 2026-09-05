import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { categorySchema } from '../validators/category.validator';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const validatedData = categorySchema.parse(req.body);

    const existingCategory = await prisma.category.findFirst({
      where: { userId, name: { equals: validatedData.name, mode: 'insensitive' } }
    });

    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: {
        userId,
        ...validatedData
      }
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const categoryId = parseInt(req.params.id as string);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const validatedData = categorySchema.parse(req.body);

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: validatedData
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const archiveCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const categoryId = parseInt(req.params.id as string);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: false }
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
