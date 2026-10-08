interface ParsedSmsResult {
  merchant: string;
  amount: number;
  date: string;
  categoryName: string;
  description: string;
  isExpense: boolean;
  rawText: string;
  confidence: number;
}

interface CategoryOption {
  id: number;
  name: string;
}

export class GeminiService {
  private apiKey: string;
  private primaryModel = 'gemini-2.5-flash-lite';
  private secondaryModel = 'gemini-2.5-flash';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  }

  /**
   * Parse a batch of SMS strings or a single block of SMS text.
   */
  async parseSmsList(
    smsTexts: string[],
    userCategories: CategoryOption[]
  ): Promise<ParsedSmsResult[]> {
    const validTexts = smsTexts
      .map(t => t.trim())
      .filter(t => t.length > 5);

    if (validTexts.length === 0) {
      return [];
    }

    try {
      if (this.apiKey) {
        return await this.callGeminiApi(validTexts, userCategories);
      }
    } catch (err: any) {
      console.warn('Gemini API parse failed, falling back to heuristic parser:', err.message);
    }

    // Fallback heuristic parser
    return this.fallbackRegexParser(validTexts, userCategories);
  }

  private async callGeminiApi(
    smsTexts: string[],
    userCategories: CategoryOption[]
  ): Promise<ParsedSmsResult[]> {
    const categoryNames = userCategories.map(c => c.name).join(', ');
    const systemPrompt = `
You are an expert financial assistant that extracts expense details from banking and transaction SMS messages (e.g. UPI, debit cards, net banking, Swiggy, Zomato, Uber, Blinkit, Amazon, etc.).
The user has the following expense categories: [${categoryNames}].

For each SMS in the list, determine:
1. isExpense: boolean (true ONLY if money was spent/debited/paid by the user. Set to false for OTPs, money credited/received/refunded, bank balance alerts, or marketing spam).
2. merchant: string (The merchant or recipient name, e.g. "Swiggy Instamart", "Zomato", "Uber", "Amazon", "Blinkit", "Airtel", "Netflix", "Electricity Bill", etc. Clean out transaction IDs or noise).
3. amount: number (Transaction amount in positive decimal number, e.g. 349.50).
4. date: string (Transaction date in YYYY-MM-DD format. If year is 2-digit like '26', assume 2026. If date is not found, use current date ${new Date().toISOString().split('T')[0]}).
5. categoryName: string (Match to the best existing user category from [${categoryNames}], or if none fits well, pick an intuitive name like "Food", "Groceries", "Dining", "Shopping", "Transport", "Bills", "Entertainment").
6. description: string (Brief informative summary, e.g. "Paid to Swiggy Instamart").
7. confidence: number (Between 0.1 and 1.0).
8. rawIndex: number (0-based index of the SMS in the input list).

Output MUST be a valid JSON array of objects with the keys:
isExpense, merchant, amount, date, categoryName, description, confidence, rawIndex.
Do NOT include markdown formatting or quotes outside the JSON.
`;

    const smsPayload = smsTexts.map((text, idx) => `[SMS #${idx}]: ${text}`).join('\n\n');

    const prompt = `${systemPrompt}\n\nHere are the SMS messages to analyze:\n${smsPayload}`;

    const modelsToTry = [this.primaryModel, this.secondaryModel];
    let responseText = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`HTTP ${res.status}: ${JSON.stringify(errData)}`);
        }

        const data: any = await res.json();
        responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (responseText) {
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No response from Gemini API');
    }

    // Parse JSON
    const parsedJson = JSON.parse(responseText.trim());
    const items: any[] = Array.isArray(parsedJson) ? parsedJson : (parsedJson.items || parsedJson.expenses || [parsedJson]);

    return items.map((item, i) => {
      const originalText = smsTexts[item.rawIndex ?? i] || smsTexts[i] || '';
      return {
        merchant: item.merchant || 'Unknown Merchant',
        amount: Math.abs(Number(item.amount) || 0),
        date: item.date || new Date().toISOString().split('T')[0],
        categoryName: item.categoryName || 'General',
        description: item.description || `SMS: ${item.merchant || 'Expense'}`,
        isExpense: Boolean(item.isExpense),
        rawText: originalText,
        confidence: item.confidence || 0.9,
      };
    });
  }

  /**
   * Fallback rule-based parser in case of offline/network/rate-limit issues
   */
  fallbackRegexParser(smsTexts: string[], userCategories: CategoryOption[]): ParsedSmsResult[] {
    const categoryNames = userCategories.map(c => c.name);

    return smsTexts.map(text => {
      const lower = text.toLowerCase();

      // Check if it's an OTP or credit
      const isCredit = lower.includes('credited') || lower.includes('deposited') || lower.includes('refund received');
      const isOtp = lower.includes('otp') || lower.includes('verification code') || lower.includes('one time password');
      const isDebit = lower.includes('debited') || lower.includes('spent') || lower.includes('paid') || lower.includes('sent to') || lower.includes('transfer to');

      const isExpense = !isOtp && !isCredit && isDebit;

      // Extract amount
      const amountMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                          text.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:rs|inr|debited)/i);
      let amount = 0;
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }

      // Extract date (e.g., 07-Oct-26, 07/10/2026, 2026-10-07)
      let date = new Date().toISOString().split('T')[0];
      const dateMatch = text.match(/\b(\d{1,2})[-/](\d{1,2}|[A-Za-z]{3})[-/](\d{2,4})\b/);
      if (dateMatch) {
        try {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split('T')[0];
          }
        } catch {}
      }

      // Extract merchant / payee
      let merchant = 'Expense';
      const toMatch = text.match(/(?:to|at|vpa|info)\s+([A-Za-z0-9\s&'-]{3,25})/i);
      if (toMatch) {
        merchant = toMatch[1].replace(/ref.*$/i, '').replace(/upi.*$/i, '').trim();
      }

      if (lower.includes('swiggy instamart') || lower.includes('instamart')) {
        merchant = 'Swiggy Instamart';
      } else if (lower.includes('swiggy')) {
        merchant = 'Swiggy';
      } else if (lower.includes('zomato')) {
        merchant = 'Zomato';
      } else if (lower.includes('blinkit')) {
        merchant = 'Blinkit';
      } else if (lower.includes('zepto')) {
        merchant = 'Zepto';
      } else if (lower.includes('uber')) {
        merchant = 'Uber';
      } else if (lower.includes('ola')) {
        merchant = 'Ola';
      } else if (lower.includes('amazon')) {
        merchant = 'Amazon';
      }

      // Best category guess
      let matchedCategory = 'General';
      if (merchant.toLowerCase().includes('swiggy') || merchant.toLowerCase().includes('zomato')) {
        matchedCategory = categoryNames.find(c => /food|dining|restaurant|grocer/i.test(c)) || 'Food';
      } else if (merchant.toLowerCase().includes('instamart') || merchant.toLowerCase().includes('blinkit') || merchant.toLowerCase().includes('zepto')) {
        matchedCategory = categoryNames.find(c => /grocer|food/i.test(c)) || 'Food';
      } else if (merchant.toLowerCase().includes('uber') || merchant.toLowerCase().includes('ola')) {
        matchedCategory = categoryNames.find(c => /transport|travel|cab/i.test(c)) || 'Transport';
      } else if (categoryNames.length > 0) {
        matchedCategory = categoryNames[0];
      }

      return {
        merchant,
        amount,
        date,
        categoryName: matchedCategory,
        description: `Paid to ${merchant}`,
        isExpense,
        rawText: text,
        confidence: 0.75,
      };
    });
  }
}
