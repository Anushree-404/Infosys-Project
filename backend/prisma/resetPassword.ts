import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Test@1234', 12);
  const result = await p.user.updateMany({
    where: { email: 'anushreedhanashetti@gmail.com' },
    data: { passwordHash: hash },
  });
  console.log(`Updated ${result.count} user(s). New password: Test@1234`);
  await p.$disconnect();
}
main().catch(console.error);
