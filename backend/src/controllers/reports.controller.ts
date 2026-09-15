import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';

const prisma = new PrismaClient();

export const getMonthlyReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()));
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year + 1, 0, 1));

    const expenses = await prisma.expense.findMany({
      where: { userId, date: { gte: startDate, lt: endDate } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const monthMap = new Map<number, { total: number; count: number; categories: Map<string, number> }>();

    for (const exp of expenses) {
      const m = new Date(exp.date).getUTCMonth();
      if (!monthMap.has(m)) {
        monthMap.set(m, { total: 0, count: 0, categories: new Map() });
      }
      const entry = monthMap.get(m)!;
      const amount = Number(exp.amount);
      entry.total += amount;
      entry.count += 1;
      const catName = exp.category?.name ?? 'Unknown';
      entry.categories.set(catName, (entry.categories.get(catName) ?? 0) + amount);
    }

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const months = Array.from({ length: 12 }, (_, i) => {
      const entry = monthMap.get(i);
      const topCategory = entry
        ? [...entry.categories.entries()].sort((a, b) => b[1] - a[1])[0]
        : null;
      return {
        month: monthNames[i],
        monthNum: i + 1,
        year,
        total: entry?.total ?? 0,
        count: entry?.count ?? 0,
        topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      };
    });

    const allExpenses = expenses.map(e => ({
      date: e.date,
      category: e.category?.name ?? '',
      amount: Number(e.amount),
      description: e.description ?? '',
    }));

    return res.status(200).json({ success: true, data: { year, months, allExpenses } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
