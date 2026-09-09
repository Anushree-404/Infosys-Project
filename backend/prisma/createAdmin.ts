import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@irrigation.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@irrigation.com',
      passwordHash: hash,
      role: 'ADMIN',
      isEmailVerified: true,
      preferredLanguage: 'ENGLISH',
    },
  });
  console.log('✅ Admin created:', admin.email);
  console.log('📝 Email: admin@irrigation.com');
  console.log('📝 Password: Admin@123456');
  await prisma.$disconnect();
}

main().catch(console.error);
