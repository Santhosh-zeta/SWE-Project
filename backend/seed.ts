import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CATEGORY_CONFIGS = [
  // Fixed expenses
  { name: 'Rent',          type: 'FIXED' as const,         configuredAmount: 22000, color: '#EF4444', description: 'Apartment monthly rent' },
  { name: 'Electricity',   type: 'FIXED' as const,         configuredAmount: 3200,  color: '#F59E0B', description: 'EB / Power utility bill' },
  { name: 'Water',         type: 'FIXED' as const,         configuredAmount: 850,   color: '#3B82F6', description: 'Water & sewage bill' },
  { name: 'Food',          type: 'FIXED' as const,         configuredAmount: 18000, color: '#10B981', description: 'Groceries, supermart & daily dairy' },
  { name: 'Gas',           type: 'FIXED' as const,         configuredAmount: 2800,  color: '#8B5CF6', description: 'Fuel & LPG cylinder' },
  // Monthly-reset expenses
  { name: 'Entertainment', type: 'MONTHLY_RESET' as const, configuredAmount: 6000,  color: '#EC4899', description: 'Outings, clubs, weekend events' },
  { name: 'Movies',        type: 'MONTHLY_RESET' as const, configuredAmount: 2500,  color: '#F97316', description: 'Cinema tickets, Netflix, Prime' },
  { name: 'Hobbies',       type: 'MONTHLY_RESET' as const, configuredAmount: 4500,  color: '#14B8A6', description: 'Gym membership, books, gaming' },
  // Custom categories
  { name: 'Dining Out',    type: 'CUSTOM' as const,        configuredAmount: 8000,  color: '#06B6D4', description: 'Restaurants, Swiggy, Zomato' },
  { name: 'Investments',   type: 'CUSTOM' as const,        configuredAmount: 15000, color: '#6366F1', description: 'SIP, stocks, mutual funds' },
];

async function seedUserWithData(email: string, name: string, age: number, monthlySalary: number, defaultPassword?: string) {
  console.log(`\n========================================`);
  console.log(`Seeding data for: ${email}`);
  console.log(`========================================`);

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const password = defaultPassword || 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        age,
        monthlySalary,
      },
    });
    console.log(`✓ Created user: ${email} with password: ${password}`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        monthlySalary,
        age: age || user.age,
        name: name || user.name,
      },
    });
    console.log(`✓ Updated user: ${email} (Salary: ₹${monthlySalary})`);
  }

  // Ensure categories are created/updated with realistic budgets
  const catMap = new Map<string, number>();

  for (const cat of CATEGORY_CONFIGS) {
    const existing = await prisma.category.findFirst({
      where: { userId: user.id, name: cat.name },
    });

    if (existing) {
      const updated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          configuredAmount: cat.configuredAmount,
          color: cat.color,
          description: cat.description,
          isActive: true,
        },
      });
      catMap.set(cat.name, updated.id);
    } else {
      const created = await prisma.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          type: cat.type,
          configuredAmount: cat.configuredAmount,
          color: cat.color,
          description: cat.description,
          isActive: true,
        },
      });
      catMap.set(cat.name, created.id);
    }
  }

  console.log(`✓ Configured ${catMap.size} categories with realistic monthly budget allocations`);

  // Clear existing expenses for a clean, deterministic seed demo
  await prisma.expense.deleteMany({ where: { userId: user.id } });
  console.log(`✓ Cleaned previous expense entries for fresh seed`);

  // Generate realistic expenses across multiple months:
  // - Previous months (May 2026 -> Sep 2026) for reports & analytics
  // - Current month (Oct 2026) with detailed daily spreadsheet expenses
  const expensesToCreate: {
    userId: number;
    categoryId: number;
    date: Date;
    amount: number;
    description: string;
  }[] = [];

  // Helper for UTC dates
  const d = (year: number, monthZeroIndexed: number, day: number) => {
    return new Date(Date.UTC(year, monthZeroIndexed, day, 12, 0, 0));
  };

  // 1. Current Month: October 2026 (Detailed daily expenses)
  const octExpenses = [
    { cat: 'Rent', amount: 22000, day: 1, desc: 'October apartment rent via NetBanking' },
    { cat: 'Electricity', amount: 2950, day: 2, desc: 'TNEB Electricity bill payment' },
    { cat: 'Water', amount: 850, day: 3, desc: 'Metro water quarterly bill' },
    { cat: 'Gas', amount: 1100, day: 2, desc: 'Indane 14.2kg LPG cylinder refill' },
    { cat: 'Gas', amount: 1200, day: 5, desc: 'Shell petrol station fuel refill' },
    { cat: 'Food', amount: 3450, day: 1, desc: 'BigBasket monthly staple groceries' },
    { cat: 'Food', amount: 1240, day: 3, desc: 'Fresh fruits and vegetable market' },
    { cat: 'Food', amount: 2150, day: 5, desc: 'Nature Basket organic items & olive oil' },
    { cat: 'Food', amount: 890, day: 6, desc: 'Daily bread, milk, and eggs' },
    { cat: 'Dining Out', amount: 1650, day: 2, desc: 'Dinner at Barbeque Nation' },
    { cat: 'Dining Out', amount: 480, day: 4, desc: 'Swiggy lunch order (Biryani)' },
    { cat: 'Dining Out', amount: 620, day: 6, desc: 'Zomato weekend breakfast' },
    { cat: 'Entertainment', amount: 1999, day: 4, desc: 'Live comedy club tickets' },
    { cat: 'Movies', amount: 950, day: 3, desc: 'PVR IMAX Movie tickets (2x) + Popcorn' },
    { cat: 'Hobbies', amount: 2500, day: 1, desc: 'Cult.fit monthly fitness membership' },
    { cat: 'Hobbies', amount: 1200, day: 5, desc: 'Kindle books and tech audiobooks' },
    { cat: 'Investments', amount: 15000, day: 5, desc: 'Monthly SIP in Nifty 50 Index Fund' },
  ];

  for (const exp of octExpenses) {
    const catId = catMap.get(exp.cat);
    if (catId) {
      expensesToCreate.push({
        userId: user.id,
        categoryId: catId,
        date: d(2026, 9, exp.day), // Month index 9 = October
        amount: exp.amount,
        description: exp.desc,
      });
    }
  }

  // 2. Previous Months (May, June, July, August, September 2026) for complete Annual Reports & Trends
  const historicalMonths = [
    { month: 4, label: 'May', foodTotal: 16800, dining: 6800, ent: 4800, movies: 1800, hobbies: 4000, invest: 15000 },
    { month: 5, label: 'Jun', foodTotal: 17200, dining: 7200, ent: 5500, movies: 2100, hobbies: 4200, invest: 15000 },
    { month: 6, label: 'Jul', foodTotal: 18400, dining: 8100, ent: 6200, movies: 2600, hobbies: 4500, invest: 15000 },
    { month: 7, label: 'Aug', foodTotal: 17900, dining: 7500, ent: 5100, movies: 2200, hobbies: 3800, invest: 15000 },
    { month: 8, label: 'Sep', foodTotal: 18100, dining: 7900, ent: 5800, movies: 2400, hobbies: 4100, invest: 15000 },
  ];

  for (const hm of historicalMonths) {
    // Fixed recurring
    expensesToCreate.push(
      { userId: user.id, categoryId: catMap.get('Rent')!, date: d(2026, hm.month, 1), amount: 22000, description: `${hm.label} Apartment rent` },
      { userId: user.id, categoryId: catMap.get('Electricity')!, date: d(2026, hm.month, 4), amount: 3100, description: `${hm.label} Electricity bill` },
      { userId: user.id, categoryId: catMap.get('Water')!, date: d(2026, hm.month, 5), amount: 850, description: `${hm.label} Water bill` },
      { userId: user.id, categoryId: catMap.get('Gas')!, date: d(2026, hm.month, 3), amount: 2600, description: `${hm.label} Fuel & cooking gas` },
      { userId: user.id, categoryId: catMap.get('Food')!, date: d(2026, hm.month, 7), amount: hm.foodTotal / 2, description: `${hm.label} Supermarket haul #1` },
      { userId: user.id, categoryId: catMap.get('Food')!, date: d(2026, hm.month, 20), amount: hm.foodTotal / 2, description: `${hm.label} Supermarket haul #2` },
      { userId: user.id, categoryId: catMap.get('Dining Out')!, date: d(2026, hm.month, 12), amount: hm.dining, description: `${hm.label} Dinners & cafe visits` },
      { userId: user.id, categoryId: catMap.get('Entertainment')!, date: d(2026, hm.month, 15), amount: hm.ent, description: `${hm.label} Weekend activities` },
      { userId: user.id, categoryId: catMap.get('Movies')!, date: d(2026, hm.month, 18), amount: hm.movies, description: `${hm.label} Multiplex & subscriptions` },
      { userId: user.id, categoryId: catMap.get('Hobbies')!, date: d(2026, hm.month, 10), amount: hm.hobbies, description: `${hm.label} Fitness & equipment` },
      { userId: user.id, categoryId: catMap.get('Investments')!, date: d(2026, hm.month, 5), amount: hm.invest, description: `${hm.label} Index Fund SIP` },
    );
  }

  // Insert all expenses
  await prisma.expense.createMany({
    data: expensesToCreate,
  });

  console.log(`✓ Seeded ${expensesToCreate.length} comprehensive expense records across May-October 2026`);
  console.log(`  - Current month: ₹${octExpenses.reduce((s, x) => s + x.amount, 0).toLocaleString('en-IN')} spent with itemized records`);
  console.log(`  - Historical months seeded: May, Jun, Jul, Aug, Sep (Enables Analytics & Annual Reports)`);
}

async function main() {
  // 1. Seed user requested by user
  await seedUserWithData('iamsanthosh2425@gmail.com', 'Santhosh V', 25, 100000);

  // 2. Also keep demo user pat@example.com populated for tests/showcases
  await seedUserWithData('pat@example.com', 'Pat Example', 30, 80000, 'password123');

  console.log(`\n========================================`);
  console.log(`ALL SEEDING COMPLETED SUCCESSFULLY! 🎉`);
  console.log(`========================================\n`);
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
