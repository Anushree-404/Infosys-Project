import { Request, Response } from 'express';
import prisma from '../config/database';

export const fixProductionDatabase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check whether the Prisma-mapped column exists
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('deleted_at', 'deletedAt');
    `);

    const existingColumns = result.map((row) => row.column_name);

    // Your current Prisma schema maps deletedAt -> deleted_at.
    // Create deleted_at if it is missing.
    if (!existingColumns.includes('deleted_at')) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
        ADD COLUMN "deleted_at" TIMESTAMP(3);
      `);
    }

    const verify = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('deleted_at', 'deletedAt');
    `);

    res.status(200).json({
      success: true,
      message: 'Database checked successfully',
      columns: verify.map((row) => row.column_name),
    });
  } catch (error) {
    console.error('Database fix error:', error);

    res.status(500).json({
      success: false,
      message: 'Database fix failed',
    });
  }
};