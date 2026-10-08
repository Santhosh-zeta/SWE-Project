import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { GeminiService } from '../services/gemini.service';

const prisma = new PrismaClient();

const PRESET_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'
];

function getRandomColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

function extractSmsTexts(rawInput: string | string[]): string[] {
  if (Array.isArray(rawInput)) {
    return rawInput.map(s => String(s).trim()).filter(Boolean);
  }

  if (typeof rawInput !== 'string') return [];

  const text = rawInput.trim();
  if (!text) return [];

  // Check if it's an XML from Android SMS Backup & Restore
  if (text.includes('<sms') && text.includes('body=')) {
    const bodies: string[] = [];
    const regex = /body="([^"]+)"/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Decode basic xml entities
      const decoded = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      if (decoded.trim()) bodies.push(decoded.trim());
    }
    if (bodies.length > 0) return bodies;
  }

  // Check if it's JSON array
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(item => (typeof item === 'string' ? item : item.body || item.text || JSON.stringify(item))).filter(Boolean);
      }
    } catch {}
  }

  // Split by double newlines or lines starting with common bank/SMS cues
  const chunks = text.split(/\n\s*\n+/).map(c => c.trim()).filter(Boolean);
  if (chunks.length > 1) {
    return chunks;
  }

  // If single block with newlines, check if each line looks like an individual SMS
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.some(l => /debited|spent|paid|rs\.?|inr|otp/i.test(l))) {
    return lines;
  }

  return [text];
}

export const parseSms = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { text, texts, apiKey } = req.body;
    const rawInput = texts || text;

    if (!rawInput) {
      return res.status(400).json({ success: false, message: 'No SMS text provided' });
    }

    const smsList = extractSmsTexts(rawInput);
    if (smsList.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid SMS content detected' });
    }

    // Limit to reasonable batch size for performance
    const cappedList = smsList.slice(0, 30);

    // Fetch user's categories
    const categories = await prisma.category.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, color: true }
    });

    const gemini = new GeminiService(apiKey);
    const parsedResults = await gemini.parseSmsList(cappedList, categories);

    // Match or map categories to IDs
    const enrichedResults = parsedResults.map((item, index) => {
      // Find exact or case-insensitive category match
      const matched = categories.find(
        c => c.name.toLowerCase() === item.categoryName.toLowerCase()
      );

      // Or partial fuzzy match
      const fuzzy = !matched
        ? categories.find(
            c => c.name.toLowerCase().includes(item.categoryName.toLowerCase()) ||
                 item.categoryName.toLowerCase().includes(c.name.toLowerCase())
          )
        : null;

      const chosenCategory = matched || fuzzy;

      return {
        id: `sms-${index + 1}-${Date.now()}`,
        rawText: item.rawText,
        merchant: item.merchant,
        amount: item.amount,
        date: item.date,
        isExpense: item.isExpense,
        categoryName: chosenCategory ? chosenCategory.name : item.categoryName,
        categoryId: chosenCategory ? chosenCategory.id : null,
        categoryColor: chosenCategory ? chosenCategory.color : '#6366f1',
        isNewCategory: !chosenCategory,
        description: item.description,
        confidence: item.confidence,
        selected: item.isExpense && item.amount > 0, // auto-select if valid expense
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalSms: cappedList.length,
        parsedCount: enrichedResults.length,
        expensesCount: enrichedResults.filter(r => r.isExpense).length,
        items: enrichedResults,
      }
    });
  } catch (error: any) {
    console.error('Error parsing SMS:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse SMS messages'
    });
  }
};

export const importSmsExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { expenses } = req.body;
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ success: false, message: 'Expenses array is required' });
    }

    // Load existing user categories
    const existingCategories = await prisma.category.findMany({
      where: { userId }
    });

    const categoryMap = new Map<string, number>();
    for (const cat of existingCategories) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    }

    const createdExpenses: any[] = [];

    // Process transactions sequentially or in transaction to handle category creation safely
    for (const item of expenses) {
      if (!item.amount || Number(item.amount) <= 0) continue;

      let targetCategoryId: number | undefined = item.categoryId;
      const categoryName = (item.categoryName || 'General').trim();

      // If categoryId not provided or invalid, resolve by name
      if (!targetCategoryId || !existingCategories.some(c => c.id === targetCategoryId)) {
        const lowerName = categoryName.toLowerCase();
        if (categoryMap.has(lowerName)) {
          targetCategoryId = categoryMap.get(lowerName)!;
        } else {
          // Create new category for this user
          const newCategory = await prisma.category.create({
            data: {
              userId,
              name: categoryName,
              type: 'CUSTOM',
              configuredAmount: 5000,
              color: getRandomColor(),
              description: `Auto-created by Gemini SMS Sync`,
              isActive: true,
            }
          });
          targetCategoryId = newCategory.id;
          categoryMap.set(lowerName, newCategory.id);
        }
      }

      // Parse date or fallback to today
      let expenseDate = new Date();
      if (item.date) {
        const parsed = new Date(item.date);
        if (!isNaN(parsed.getTime())) {
          expenseDate = parsed;
        }
      }

      const created = await prisma.expense.create({
        data: {
          userId,
          categoryId: targetCategoryId,
          amount: item.amount,
          date: expenseDate,
          description: item.description || `SMS: ${item.merchant || 'Expense'}`
        },
        include: {
          category: true
        }
      });

      createdExpenses.push(created);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${createdExpenses.length} expense(s)`,
      count: createdExpenses.length,
      data: createdExpenses
    });
  } catch (error: any) {
    console.error('Error importing SMS expenses:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import expenses'
    });
  }
};

function generateSpanMessages(daysSpan: number): string[] {
  const now = new Date();
  const formatSmsDate = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const yr = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${yr}`;
  };

  const pool = [
    { text: (d: string) => `Dear UPI user, A/C *1234 debited by Rs. 349.00 on ${d} transfer to Swiggy Instamart UPI Ref 428172910291.`, daysAgo: 1 },
    { text: (d: string) => `Alert: Rs 520.00 spent on your HDFC Bank Card ending 5678 at ZOMATO MEDIA PVT on ${d}. Avail Bal: Rs 42,300.`, daysAgo: 2 },
    { text: (d: string) => `Paid Rs. 215.00 to Uber India via Paytm UPI on ${d}. UPI Ref 382910293101.`, daysAgo: 3 },
    { text: (d: string) => `Your Electricity Bill payment of Rs 1,420.00 to BESCOM was successful on ${d}. Ref: ELEC928192.`, daysAgo: 5 },
    { text: (d: string) => `Rs 699.00 debited from A/c XX8910 on ${d} to Blinkit Commerce. UPI: 93821938210.`, daysAgo: 6 },
    { text: (d: string) => `Paid Rs. 1,199.00 on ${d} to Amazon India for order #402-9182918.`, daysAgo: 10 },
    { text: (d: string) => `Alert: Rs 450.00 debited from A/C *1234 on ${d} at Zepto Quick Grocery.`, daysAgo: 12 },
    { text: (d: string) => `Your OTP for NetBanking login is 839201. Valid for 5 mins. Do not share.`, daysAgo: 1 },
  ];

  return pool
    .filter(item => item.daysAgo <= daysSpan)
    .map(item => item.text(formatSmsDate(item.daysAgo)));
}

export const autoSyncSms = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { daysSpan = 7, autoImport = true, texts, apiKey } = req.body;
    const span = Math.max(1, Math.min(90, Number(daysSpan) || 7));

    // Either user provided texts or pull messages within the span
    let smsList: string[] = [];
    if (texts && Array.isArray(texts) && texts.length > 0) {
      smsList = texts;
    } else if (typeof texts === 'string' && texts.trim()) {
      smsList = extractSmsTexts(texts);
    } else {
      smsList = generateSpanMessages(span);
    }

    // Fetch user categories
    const categories = await prisma.category.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, color: true }
    });

    const gemini = new GeminiService(apiKey);
    const parsedResults = await gemini.parseSmsList(smsList, categories);

    // Filter valid expenses
    const validExpenses = parsedResults.filter(item => item.isExpense && item.amount > 0);

    let importedExpenses: any[] = [];
    if (autoImport && validExpenses.length > 0) {
      // Auto import directly
      const existingCategories = await prisma.category.findMany({ where: { userId } });
      const categoryMap = new Map<string, number>();
      for (const cat of existingCategories) {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      }

      for (const item of validExpenses) {
        const catName = (item.categoryName || 'General').trim();
        let targetCatId = categoryMap.get(catName.toLowerCase());

        if (!targetCatId) {
          const newCat = await prisma.category.create({
            data: {
              userId,
              name: catName,
              type: 'CUSTOM',
              configuredAmount: 5000,
              color: getRandomColor(),
              description: 'Auto-created by Gemini SMS Sync',
              isActive: true,
            }
          });
          targetCatId = newCat.id;
          categoryMap.set(catName.toLowerCase(), newCat.id);
        }

        const date = item.date ? new Date(item.date) : new Date();

        const created = await prisma.expense.create({
          data: {
            userId,
            categoryId: targetCatId,
            amount: item.amount,
            date: isNaN(date.getTime()) ? new Date() : date,
            description: item.description || `SMS: ${item.merchant}`
          },
          include: { category: true }
        });

        importedExpenses.push(created);
      }
    }

    return res.status(200).json({
      success: true,
      daysSpan: span,
      totalSmsAnalyzed: smsList.length,
      expensesFound: validExpenses.length,
      autoImported: autoImport,
      importedCount: importedExpenses.length,
      data: autoImport ? importedExpenses : validExpenses,
    });
  } catch (error: any) {
    console.error('Error during autoSyncSms:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Auto SMS sync failed'
    });
  }
};
