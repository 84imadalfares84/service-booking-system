import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@booking.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin12345!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'System Admin',
      email: adminEmail,
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  const services = [
    {
      name: 'Haircut',
      description: 'Standard haircut with wash and style.',
      price: 25.0,
      durationMinutes: 45,
    },
    {
      name: 'Home Cleaning',
      description: 'Two-hour apartment cleaning visit.',
      price: 80.0,
      durationMinutes: 120,
    },
    {
      name: 'Consultation',
      description: 'One-on-one consultation session.',
      price: 50.0,
      durationMinutes: 60,
    },
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }

  console.log(`Seeded admin ${admin.email} and sample services.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
