import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
  console.log('🧹 Clearing all seed data...');
  
  await prisma.sensor.deleteMany({});
  console.log('✅ Sensors cleared');
  
  await prisma.field.deleteMany({});
  console.log('✅ Fields cleared');
  
  await prisma.user.deleteMany({});
  console.log('✅ Users cleared');
  
  console.log('\n🎉 Database is now empty. Only your new entries will appear.');
  
  await prisma.$disconnect();
}

clearData().catch((error) => {
  console.error('❌ Clear failed:', error);
  process.exit(1);
});
