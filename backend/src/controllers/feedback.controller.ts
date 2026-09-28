import { Request, Response } from 'express';
import prisma from '../config/database';

export const createFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fieldId, action, predictionType, recommendation, reason } = req.body;

    if (!fieldId || !action || !predictionType || !recommendation) {
      res.status(400).json({
        success: false,
        message: 'fieldId, action, predictionType and recommendation are required',
      });
      return;
    }

    const feedback = await prisma.irrigationFeedback.create({
      data: {
        fieldId,
        action,
        predictionType,
        recommendation,
        reason: reason || null,
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