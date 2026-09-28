import { Request, Response } from 'express';
import prisma from '../config/database';

export const fixProductionDatabase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
    `);

    res.status(200).json({
      success: true,
      message: 'Database fix applied successfully',
    });
  } catch (error) {
    console.error('Database fix error:', error);

    res.status(500).json({
      success: false,
      message: 'Database fix failed',
    });
  }
};