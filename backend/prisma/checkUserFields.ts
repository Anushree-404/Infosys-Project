import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({ select: { id: true, email: true, fullName: true } });
  for (const u of users) {
    const fields = await p.field.findMany({ where: { userId: u.id, deletedAt: null }, select: { id: true, name: true, state: true, district: true, latitude: true, longitude: true } });
    console.log(`\nUser: ${u.email}`);
    if (fields.length === 0) console.log('  No fields');
    for (const f of fields) {
      console.log(`  Field: ${f.name} | state=${f.state} | district=${f.district} | lat=${f.latitude} | lon=${f.longitude}`);
    }
  }
  await p.$disconnect();
}
main().catch(console.error);
