/**
 * Report Controller - Milestone 3
 */

import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { sendError } from '../utils/apiResponse';

export const downloadReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const { format = 'pdf', startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end   = endDate   ? new Date(endDate as string)   : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return sendError(res, 'Invalid date format', 400);
    }

    const data = await reportService.getFieldReportData(fieldId, req.user!.id, start, end);

    if (format === 'csv') {
      const csv = reportService.generateCSV(data);
      const fieldName = data.field.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr   = new Date().toISOString().slice(0, 10);
      // charset=utf-8 tells browsers/Excel the encoding is UTF-8.
      // The BOM inside the CSV body ensures Excel opens it correctly directly.
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fieldName}_report_${dateStr}.csv"`);
      return res.send(csv);
    }

    // Default: PDF
    const pdfBuffer = await reportService.generatePDF(data);
    const fieldName = data.field.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr   = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fieldName}_report_${dateStr}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) { next(err); }
};

export const getAlertConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const { getAlertThresholds } = await import('../services/alert.service');
    const config = await getAlertThresholds(fieldId);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

export const updateAlertConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const { default: prisma } = await import('../config/database');
    const config = await prisma.alertConfig.upsert({
      where:  { fieldId },
      update: req.body,
      create: { fieldId, ...req.body },
    });
    res.json({ success: true, message: 'Alert config updated', data: config });
  } catch (err) { next(err); }
};
