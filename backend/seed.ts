import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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

async function main() {
  const email = 'pat@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword
    },
    create: {
      name: 'Pat Example',
      email: email,
      passwordHash: hashedPassword,
      age: 30,
      monthlySalary: 5000,
    },
  });

  const existingCats = await prisma.category.count({ where: { userId: user.id } });
  if (existingCats === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user.id }))
    });
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
  }

  console.log(`User seeded successfully!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
