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
      oldName: 'Haircut',
      name: 'طلب صرف مواد من المستودع',
      description:
        'صرف واستلام مواد من المستودع المركزي حسب طلب الجهة المستفيدة.',
      price: 25.0,
      durationMinutes: 45,
    },
    {
      oldName: 'Home Cleaning',
      name: 'نقل وإمداد',
      description:
        'حجز آلية لنقل المواد بين المستودعات والجهات الطالبة ضمن المديرية.',
      price: 80.0,
      durationMinutes: 120,
    },
    {
      oldName: 'Consultation',
      name: 'دراسة احتياج وتوريد',
      description:
        'دراسة احتياج الدائرة وإعداد طلب توريد للمواد والمستلزمات المطلوبة.',
      price: 50.0,
      durationMinutes: 60,
    },
  ];

  for (const service of services) {
    const { oldName, ...data } = service;
    const existing = await prisma.service.findFirst({
      where: { OR: [{ name: oldName }, { name: data.name }] },
    });
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.service.create({ data });
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
