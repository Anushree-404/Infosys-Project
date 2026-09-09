import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const records = await p.weatherData.findMany({
    select: { id: true, fieldId: true, temperature: true, description: true, location: true, expiresAt: true, fetchedAt: true },
    orderBy: { fetchedAt: 'desc' },
    take: 5,
  });
  console.log(`WeatherData records: ${records.length}`);
  for (const r of records) {
    const expired = r.expiresAt < new Date();
    console.log(`  fieldId=${r.fieldId} | ${r.location} | ${r.temperature}C | ${r.description} | expires=${expired ? 'EXPIRED' : 'VALID'}`);
  }
  await p.$disconnect();
}
main().catch(console.error);
