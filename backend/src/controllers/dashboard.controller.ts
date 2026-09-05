import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { month } = req.query; // format YYYY-MM
    let startDate: Date;
    let nextMonth: Date;

    if (month) {
      startDate = new Date(`${month}-01T00:00:00Z`);
    } else {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    
    nextMonth = new Date(startDate);
    nextMonth.setUTCMonth(startDate.getUTCMonth() + 1);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { monthlySalary: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const categories = await prisma.category.findMany({
      where: { userId, isActive: true }
    });

    const expenseAggregations = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: {
          gte: startDate,
          lt: nextMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    const expenseMap = new Map();
    for (const agg of expenseAggregations) {
      expenseMap.set(agg.categoryId, Number(agg._sum.amount || 0));
    }

    let totalSpent = 0;
    let fixedPlanned = 0;
    let monthlyBudget = 0;

    const categoryStats: any[] = [];

    for (const cat of categories) {
      const spent = expenseMap.get(cat.id) || 0;
      
      const configAmount = Number(cat.configuredAmount);

      if (cat.type === 'FIXED') {
        fixedPlanned += configAmount;
      } else if (cat.type === 'MONTHLY_RESET') {
        monthlyBudget += configAmount;
      }

      totalSpent += spent;

      categoryStats.push({
        ...cat,
        spent,
        remaining: cat.type === 'FIXED' ? null : configAmount - spent,
        percentage: configAmount > 0 ? (spent / configAmount) * 100 : 0
      });
    }

    const remaining = Number(user.monthlySalary) - totalSpent;

    const recentExpenses = await prisma.expense.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 5
    });

    return res.status(200).json({
      success: true,
      data: {
        salary: Number(user.monthlySalary),
        totalSpent,
        remaining,
        fixedPlanned,
        monthlyBudget,
        categories: categoryStats,
        recentExpenses
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
