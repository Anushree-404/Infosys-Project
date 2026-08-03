import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  // Update all fields that have null state/district to add Karnataka
  await p.field.updateMany({
    where: { state: null, district: null, deletedAt: null },
    data: { state: "Karnataka", district: "Mangalore" }
  });
  // Fix the existing field with "Dakshina Kannada" -> "Mangalore" (valid OWM city)
  await p.field.updateMany({
    where: { district: "Dakshina Kannada" },
    data: { district: "Mangalore" }
  });
  const fields = await p.field.findMany({ select: { name: true, state: true, district: true } });
  console.log("Updated fields:", JSON.stringify(fields, null, 2));
  await p.$disconnect();
}
main().catch(console.error);