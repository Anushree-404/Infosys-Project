/**
 * Report Generation Service - Milestone 3
 * Generates PDF and CSV reports for fields.
 */

import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export const getFieldReportData = async (
  fieldId: string,
  userId: string,
  startDate: Date,
  endDate: Date
) => {
  const field = await prisma.field.findFirst({
    where: { id: fieldId, userId, deletedAt: null },
    include: {
      crops:   { where: { deletedAt: null }, take: 5 },
      sensors: { where: { deletedAt: null }, select: { id: true, name: true, type: true, status: true } },
    },
  });
  if (!field) throw new AppError('Field not found', 404);

  const [readings, notifications, weather, feedback] = await Promise.all([
    prisma.sensorReading.findMany({
      where: {
        sensor: { fieldId, deletedAt: null },
        timestamp: { gte: startDate, lte: endDate },
        isValid: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
      include: { sensor: { select: { name: true, type: true } } },
    }),
    prisma.notification.findMany({
      where: {
        userId,
        metadata: { path: ['fieldId'], equals: fieldId },
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.weatherData.findFirst({
      where: { fieldId },
      orderBy: { fetchedAt: 'desc' },
    }),
    prisma.irrigationFeedback.findMany({
      where: { fieldId, createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { field, readings, notifications, weather, feedback, startDate, endDate };
};

// ── CSV helpers ───────────────────────────────────────────────────────────────

/** Wrap a value in double-quotes and escape any internal double-quotes. */
const csvCell = (value: unknown): string => {
  const s = String(value ?? '').replace(/"/g, '""');
  // Always quote to handle commas, newlines, and Unicode (Kannada/Hindi)
  return `"${s}"`;
};

const csvRow = (...values: unknown[]): string => values.map(csvCell).join(',');

// CSV export
export const generateCSV = (data: Awaited<ReturnType<typeof getFieldReportData>>): string => {
  const { field, readings, notifications, feedback } = data;

  // UTF-8 BOM — makes Excel open the file in UTF-8 automatically
  const BOM = '\uFEFF';

  const lines: string[] = [];

  // ── Field header ──────────────────────────────────────────────────────────
  lines.push(csvRow('Field Report', field.name));
  lines.push(csvRow('Area',               `${field.area} ${field.areaUnit}`));
  lines.push(csvRow('Soil Type',          field.soilType ?? 'N/A'));
  lines.push(csvRow('Irrigation Method',  field.irrigationMethod ?? 'N/A'));
  lines.push(csvRow('Water Source',       field.waterSource ?? 'N/A'));
  lines.push(csvRow('State/District',     [field.state, field.district, field.village].filter(Boolean).join(', ')));
  lines.push(csvRow('Report Period',      `${data.startDate.toDateString()} — ${data.endDate.toDateString()}`));
  lines.push('');

  // ── Sensor Readings ───────────────────────────────────────────────────────
  lines.push(csvRow('--- Sensor Readings ---'));
  lines.push(csvRow('Timestamp', 'Sensor', 'Type', 'Soil Moisture (%)', 'Temperature (C)', 'Humidity (%)', 'Rainfall (mm)', 'Battery (%)'));
  for (const r of readings) {
    lines.push(csvRow(
      new Date(r.timestamp).toISOString(),
      r.sensor.name,
      r.sensor.type,
      r.soilMoisture ?? '',
      r.temperature  ?? '',
      r.humidity     ?? '',
      r.rainfall     ?? '',
      r.batteryLevel ?? '',
    ));
  }
  if (readings.length === 0) lines.push(csvRow('No readings in this period'));
  lines.push('');

  // ── Alerts / Notifications ────────────────────────────────────────────────
  lines.push(csvRow('--- Alerts ---'));
  lines.push(csvRow('Timestamp', 'Title', 'Type', 'Message'));
  for (const n of notifications) {
    lines.push(csvRow(
      new Date(n.createdAt).toISOString(),
      n.title,
      n.type,
      n.message,
    ));
  }
  if (notifications.length === 0) lines.push(csvRow('No alerts in this period'));
  lines.push('');

  // ── Farmer Feedback ───────────────────────────────────────────────────────
  lines.push(csvRow('--- Farmer Feedback ---'));
  lines.push(csvRow('Timestamp', 'Action', 'Reason', 'Water Applied (L)'));
  for (const f of feedback) {
    lines.push(csvRow(
      new Date(f.createdAt).toISOString(),
      f.action,
      f.reason ?? '',
      f.waterApplied ?? '',
    ));
  }
  if (feedback.length === 0) lines.push(csvRow('No feedback in this period'));

  return BOM + lines.join('\r\n');
};

// PDF — returns Buffer
export const generatePDF = async (data: Awaited<ReturnType<typeof getFieldReportData>>): Promise<Buffer> => {
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { field, readings, notifications, feedback, startDate, endDate } = data;

    // Header
    doc.fontSize(20).fillColor('#16a34a').text('IrriSmart Field Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#374151').text(`Field: ${field.name}`, { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280')
       .text(`Period: ${startDate.toDateString()} to ${endDate.toDateString()}`, { align: 'center' });
    doc.moveDown();

    // Field details
    doc.fontSize(13).fillColor('#111827').text('Field Details');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.3);
    const details = [
      ['Area', `${field.area} ${field.areaUnit}`],
      ['Soil Type', field.soilType ?? 'N/A'],
      ['Irrigation', field.irrigationMethod ?? 'N/A'],
      ['Water Source', field.waterSource ?? 'N/A'],
      ['State', field.state ?? 'N/A'],
      ['District', field.district ?? 'N/A'],
    ];
    for (const [k, v] of details) {
      doc.fontSize(10).fillColor('#374151').text(`${k}: `, { continued: true }).fillColor('#6b7280').text(v);
    }
    doc.moveDown();

    // Sensor summary
    doc.fontSize(13).fillColor('#111827').text('Sensor Readings Summary');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151').text(`Total readings: ${readings.length}`);
    if (readings.length > 0) {
      const moistures = readings.map(r => r.soilMoisture).filter((v): v is number => v != null);
      if (moistures.length) {
        const avg = moistures.reduce((a, b) => a + b, 0) / moistures.length;
        const min = Math.min(...moistures);
        const max = Math.max(...moistures);
        doc.text(`Soil Moisture — Avg: ${avg.toFixed(1)}%  Min: ${min.toFixed(1)}%  Max: ${max.toFixed(1)}%`);
      }
    }
    doc.moveDown();

    // Alerts
    doc.fontSize(13).fillColor('#111827').text(`Alerts (${notifications.length})`);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.3);
    for (const n of notifications.slice(0, 20)) {
      doc.fontSize(9).fillColor('#374151')
         .text(`${new Date(n.createdAt).toLocaleDateString()} — ${n.title}: `, { continued: true })
         .fillColor('#6b7280').text(n.message);
    }
    if (notifications.length === 0) doc.fontSize(10).fillColor('#9ca3af').text('No alerts in this period.');
    doc.moveDown();

    // Feedback
    doc.fontSize(13).fillColor('#111827').text(`Farmer Feedback (${feedback.length})`);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.3);
    for (const f of feedback.slice(0, 20)) {
      doc.fontSize(9).fillColor('#374151')
         .text(`${new Date(f.createdAt).toLocaleDateString()} — ${f.action}`, { continued: true })
         .fillColor('#6b7280').text(f.reason ? `: ${f.reason}` : '');
    }
    if (feedback.length === 0) doc.fontSize(10).fillColor('#9ca3af').text('No feedback in this period.');

    doc.end();
  });
};
