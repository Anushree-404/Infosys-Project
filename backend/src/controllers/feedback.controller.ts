import { Request, Response } from 'express';
import prisma from '../config/database';

export const createFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      fieldId,
      action,
      predictionType,
      recommendation,
      reason,
      waterApplied,
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!fieldId || !action || !predictionType || !recommendation) {
      res.status(400).json({
        success: false,
        message:
          'fieldId, action, predictionType and recommendation are required',
      });
      return;
    }

    // Verify that the field exists
    const field = await prisma.field.findUnique({
      where: {
        id: fieldId,
      },
    });

    if (!field) {
      res.status(404).json({
        success: false,
        message: 'Field not found',
      });
      return;
    }

    const feedback = await prisma.irrigationFeedback.create({
      data: {
        userId,
        fieldId,
        action: String(action),
        predictionType: String(predictionType),
        recommendation: String(recommendation),
        reason: reason ? String(reason) : null,
        waterApplied:
          waterApplied !== undefined && waterApplied !== null
            ? Number(waterApplied)
            : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    console.error('Create feedback error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
};