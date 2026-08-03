import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.field.findMany({ select: { id: true, name: true, state: true, district: true, latitude: true, longitude: true } })
  .then(fields => { console.log(JSON.stringify(fields, null, 2)); return p.$disconnect(); });
