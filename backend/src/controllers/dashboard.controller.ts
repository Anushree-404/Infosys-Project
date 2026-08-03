/**
 * Dashboard Controller
 * Provides aggregated data for the farmer dashboard
 */

import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { sendSuccess } from '../utils/apiResponse';

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get farmer dashboard data
 *     security:
 *       - bearerAuth: []
 *     description: Returns aggregated dashboard data including stats, weather, and recent activity
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalFields:
 *                           type: number
 *                         totalSensors:
 *                           type: number
 *                     weather:
 *                       type: object
 *                       nullable: true
 *                     recentActivity:
 *                       type: array
 */
export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const dashboardData = await dashboardService.getDashboardData(userId);
    sendSuccess(res, 'Dashboard data retrieved successfully', dashboardData);
  } catch (error) {
    next(error);
  }
};
