/**
 * Database Seed Script
 * Creates initial admin user and sample data
 */

import { PrismaClient, Role, Language } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@irrigation.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@irrigation.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isEmailVerified: true,
      state: 'Andhra Pradesh',
      district: 'Krishna',
      preferredLanguage: Language.ENGLISH,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample farmer
  const farmerPassword = await bcrypt.hash('Farmer@123456', 12);

  const farmer = await prisma.user.upsert({
    where: { email: 'rajesh@example.com' },
    update: {},
    create: {
      fullName: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '9876543210',
      passwordHash: farmerPassword,
      role: Role.FARMER,
      isEmailVerified: true,
      state: 'Telangana',
      district: 'Warangal',
      preferredLanguage: Language.TELUGU,
    },
  });

  console.log('✅ Sample farmer created:', farmer.email);

  // Create sample field
  const field = await prisma.field.upsert({
    where: { id: 'sample-field-001' },
    update: {},
    create: {
      id: 'sample-field-001',
      name: 'North Paddy Field',
      area: 5.5,
      cropType: 'Paddy',
      soilType: 'Clay Loam',
      location: 'Warangal, Telangana',
      latitude: 17.9784,
      longitude: 79.5941,
      userId: farmer.id,
    },
  });

  console.log('✅ Sample field created:', field.name);

  // Create sample sensor
  await prisma.sensor.upsert({
    where: { serialNumber: 'SENS-001-SM' },
    update: {},
    create: {
      name: 'Soil Moisture Sensor 1',
      serialNumber: 'SENS-001-SM',
      type: 'SOIL_MOISTURE',
      status: 'ACTIVE',
      batteryLevel: 85,
      fieldId: field.id,
    },
  });

  console.log('✅ Sample sensor created');
  console.log('\n🎉 Database seeding completed!');
  console.log('\n📝 Login Credentials:');
  console.log('   Admin: admin@irrigation.com / Admin@123456');
  console.log('   Farmer: rajesh@example.com / Farmer@123456');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
