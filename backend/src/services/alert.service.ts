/**
 * Alert Engine - Milestone 3
 * Centralised rule-based alert generation.
 * Severity: LOW | MEDIUM | HIGH | CRITICAL
 *
 * Duplicate prevention: same field + alert type is not re-dispatched
 * unless severity increases, or the cooldown window has elapsed.
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { createNotification } from './notification.service';
import { sendPushToUser } from './push.service';
import { sendSmsAlert } from './sms.service';
import { sendEmailAlert } from './email.service';
import { getUserLanguageCode, translateText } from './sarvam.service';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AlertEvent {
  userId:    string;
  fieldId:   string;
  fieldName: string;
  type:      'DROUGHT_RISK' | 'OVER_WATERING' | 'SENSOR_FAILURE' | 'LOW_BATTERY' | 'HIGH_TEMP' | 'LOW_HUMIDITY';
  severity:  AlertSeverity;
  title:     string;
  message:   string;
  metadata?: Record<string, unknown>;
  /** Bypass cooldown (demo / scenario ingest) */
  force?:    boolean;
}

export const DEFAULT_THRESHOLDS = {
  soilMoistureLow:  20,
  soilMoistureHigh: 80,
  temperatureHigh:  45,
  humidityLow:      20,
  sensorOfflineMin: 60,
  batteryLow:       20,
};

const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const SEVERITY_RANK: Record<AlertSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

type UiLang = 'en' | 'hi' | 'kn';

const TEMPLATES: Record<UiLang, Record<string, string>> = {
  en: {
    drought_title: 'Low Soil Moisture — {{field}}',
    drought_msg: 'Soil moisture in {{field}} is critically low at {{value}}%. Irrigate immediately.',
    drought_title_med: 'Drought Risk — {{field}}',
    drought_msg_med: 'Soil moisture in {{field}} is low at {{value}}%. Consider irrigation soon.',
    overwater_title: 'Over-watering Risk — {{field}}',
    overwater_msg: 'Soil moisture in {{field}} is too high at {{value}}%. Pause irrigation.',
    sensor_title: 'Sensor Offline — {{sensor}}',
    sensor_msg: '{{sensor}} in {{field}} has not reported data for over {{minutes}} minutes.',
    battery_title: 'Low Battery — {{sensor}}',
    battery_msg: '{{sensor}} in {{field}} battery is at {{value}}%. Please replace or recharge.',
    temp_title: 'High Temperature — {{field}}',
    temp_msg: 'Temperature in {{field}} is {{value}}°C, above the {{threshold}}°C limit.',
    humidity_title: 'Low Humidity — {{field}}',
    humidity_msg: 'Humidity in {{field}} is {{value}}%, below the {{threshold}}% limit.',
  },
  hi: {
    drought_title: 'मिट्टी में नमी कम है — {{field}}',
    drought_msg: 'खेत {{field}} में मिट्टी की नमी {{value}}% पर बहुत कम है। तुरंत सिंचाई करें।',
    drought_title_med: 'सूखे का खतरा — {{field}}',
    drought_msg_med: 'खेत {{field}} में मिट्टी की नमी {{value}}% पर कम है। जल्द सिंचाई करें।',
    overwater_title: 'अधिक पानी का खतरा — {{field}}',
    overwater_msg: 'खेत {{field}} में मिट्टी की नमी {{value}}% पर बहुत अधिक है। सिंचाई रोकें।',
    sensor_title: 'सेंसर ऑफलाइन — {{sensor}}',
    sensor_msg: '{{field}} में {{sensor}} ने {{minutes}} मिनट से अधिक समय से डेटा नहीं भेजा है।',
    battery_title: 'कम बैटरी — {{sensor}}',
    battery_msg: '{{field}} में {{sensor}} की बैटरी {{value}}% पर है। कृपया बदलें या रिचार्ज करें।',
    temp_title: 'उच्च तापमान — {{field}}',
    temp_msg: '{{field}} में तापमान {{value}}°C है, जो {{threshold}}°C की सीमा से अधिक है।',
    humidity_title: 'कम आर्द्रता — {{field}}',
    humidity_msg: '{{field}} में आर्द्रता {{value}}% है, जो {{threshold}}% की सीमा से कम है।',
  },
  kn: {
    drought_title: 'ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆಯಾಗಿದೆ — {{field}}',
    drought_msg: 'ಹೊಲ {{field}} ನಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ {{value}}% ನಲ್ಲಿ ತುಂಬಾ ಕಡಿಮೆಯಾಗಿದೆ. ತಕ್ಷಣ ನೀರಾವರಿ ಮಾಡಿ.',
    drought_title_med: 'ಬರಗಾಲದ ಅಪಾಯ — {{field}}',
    drought_msg_med: 'ಹೊಲ {{field}} ನಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ {{value}}% ನಲ್ಲಿ ಕಡಿಮೆಯಾಗಿದೆ. ಶೀಘ್ರದಲ್ಲೇ ನೀರಾವರಿ ಮಾಡಿ.',
    overwater_title: 'ಅಧಿಕ ನೀರಾವರಿ ಅಪಾಯ — {{field}}',
    overwater_msg: 'ಹೊಲ {{field}} ನಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ {{value}}% ನಲ್ಲಿ ತುಂಬಾ ಹೆಚ್ಚಾಗಿದೆ. ನೀರಾವರಿ ನಿಲ್ಲಿಸಿ.',
    sensor_title: 'ಸೆನ್ಸರ್ ಆಫ್‌ಲೈನ್ — {{sensor}}',
    sensor_msg: '{{field}} ನಲ್ಲಿ {{sensor}} {{minutes}} ನಿಮಿಷಗಳಿಗಿಂತ ಹೆಚ್ಚು ಕಾಲ ಡೇಟಾ ವರದಿ ಮಾಡಿಲ್ಲ.',
    battery_title: 'ಕಡಿಮೆ ಬ್ಯಾಟರಿ — {{sensor}}',
    battery_msg: '{{field}} ನಲ್ಲಿ {{sensor}} ಬ್ಯಾಟರಿ {{value}}% ನಲ್ಲಿದೆ. ದಯವಿಟ್ಟು ಬದಲಾಯಿಸಿ ಅಥವಾ ರೀಚಾರ್ಜ್ ಮಾಡಿ.',
    temp_title: 'ಹೆಚ್ಚಿನ ತಾಪಮಾನ — {{field}}',
    temp_msg: '{{field}} ನಲ್ಲಿ ತಾಪಮಾನ {{value}}°C ಇದೆ, {{threshold}}°C ಮಿತಿಯನ್ನು ಮೀರಿದೆ.',
    humidity_title: 'ಕಡಿಮೆ ಆರ್ದ್ರತೆ — {{field}}',
    humidity_msg: '{{field}} ನಲ್ಲಿ ಆರ್ದ್ರತೆ {{value}}% ಇದೆ, {{threshold}}% ಮಿತಿಗಿಂತ ಕಡಿಮೆ.',
  },
};

const fill = (tpl: string, vars: Record<string, string | number>): string =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''));

const prismaLangToUi = (lang?: string | null): UiLang => {
  if (lang === 'HINDI') return 'hi';
  if (lang === 'KANNADA') return 'kn';
  return 'en';
};

export const getAlertThresholds = async (fieldId: string) => {
  const cfg = await prisma.alertConfig.findUnique({ where: { fieldId } });
  return {
    soilMoistureLow:  cfg?.soilMoistureLow  ?? DEFAULT_THRESHOLDS.soilMoistureLow,
    soilMoistureHigh: cfg?.soilMoistureHigh ?? DEFAULT_THRESHOLDS.soilMoistureHigh,
    temperatureHigh:  cfg?.temperatureHigh  ?? DEFAULT_THRESHOLDS.temperatureHigh,
    humidityLow:      cfg?.humidityLow      ?? DEFAULT_THRESHOLDS.humidityLow,
    enablePush:       cfg?.enablePush       ?? true,
    enableSms:        cfg?.enableSms        ?? false,
    enableEmail:      cfg?.enableEmail      ?? false,
    smsPhone:         cfg?.smsPhone         ?? null,
    emailAddress:     cfg?.emailAddress     ?? null,
  };
};

const shouldSkipDuplicate = async (event: AlertEvent): Promise<boolean> => {
  if (event.force) return false;

  const recent = await prisma.notification.findMany({
    where: {
      userId: event.userId,
      createdAt: { gte: new Date(Date.now() - ALERT_COOLDOWN_MS) },
    },
    select: { metadata: true },
    take: 50,
  });

  for (const n of recent) {
    const meta = (n.metadata ?? {}) as Record<string, unknown>;
    if (meta.alertType !== event.type || meta.fieldId !== event.fieldId) continue;
    if (event.metadata?.sensorId && meta.sensorId && meta.sensorId !== event.metadata.sensorId) continue;
    const prev = SEVERITY_RANK[(meta.severity as AlertSeverity) || 'LOW'] ?? 1;
    const next = SEVERITY_RANK[event.severity];
    if (next <= prev) return true;
  }
  return false;
};

const localizeAlert = async (
  userId: string,
  titleKey: string,
  msgKey: string,
  vars: Record<string, string | number>
): Promise<{ title: string; message: string; lang: UiLang }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLanguage: true },
  });
  const lang = prismaLangToUi(user?.preferredLanguage);
  const pack = TEMPLATES[lang];
  let title = fill(pack[titleKey] ?? TEMPLATES.en[titleKey], vars);
  let message = fill(pack[msgKey] ?? TEMPLATES.en[msgKey], vars);

  // Optional Sarvam enhancement for non-English. Never crash; fall back to templates.
  if (lang !== 'en') {
    try {
      const target = getUserLanguageCode(user?.preferredLanguage ?? 'ENGLISH');
      const englishMsg = fill(TEMPLATES.en[msgKey], vars);
      const translated = await translateText(englishMsg, target, 'en-IN');
      if (translated && translated !== englishMsg) {
        message = translated;
      }
    } catch (err) {
      logger.warn('[AlertEngine] Sarvam localization failed, using templates:', err instanceof Error ? err.message : err);
    }
  }

  return { title, message, lang };
};

export const dispatchAlert = async (event: AlertEvent): Promise<void> => {
  try {
    if (await shouldSkipDuplicate(event)) {
      logger.debug(`[AlertEngine] skipped duplicate ${event.type} for field ${event.fieldId}`);
      return;
    }

    await createNotification({
      userId:   event.userId,
      title:    event.title,
      message:  event.message,
      type:     severityToNotificationType(event.severity),
      metadata: {
        ...event.metadata,
        fieldId: event.fieldId,
        fieldName: event.fieldName,
        alertType: event.type,
        severity: event.severity,
      },
    });

    const cfg = await getAlertThresholds(event.fieldId);
    const url = `/dashboard/fields/${event.fieldId}`;

    if (cfg.enablePush) {
      await sendPushToUser(event.userId, {
        title: event.title,
        body: event.message,
        tag: `${event.type}-${event.fieldId}`,
        url,
      });
    }

    if (cfg.enableSms && cfg.smsPhone) {
      await sendSmsAlert(cfg.smsPhone, `[${event.severity}] ${event.title}: ${event.message}`);
    }

    if (cfg.enableEmail && cfg.emailAddress) {
      await sendEmailAlert(cfg.emailAddress, event.title, event.message, event.severity);
    }
  } catch (err) {
    logger.error('[AlertEngine] dispatch failed:', err instanceof Error ? err.message : err);
  }
};

const severityToNotificationType = (s: AlertSeverity): 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS' => {
  if (s === 'CRITICAL' || s === 'HIGH') return 'ALERT';
  if (s === 'MEDIUM') return 'WARNING';
  return 'INFO';
};

/**
 * Evaluate a single ingested reading against AlertConfig thresholds.
 * Called from sensor ingest (REST + MQTT) so alerts use real field data.
 */
export const evaluateReadingAlerts = async (
  sensorId: string,
  reading: {
    soilMoisture?: number | null;
    temperature?: number | null;
    humidity?: number | null;
    batteryLevel?: number | null;
    isValid?: boolean;
  },
  options?: { force?: boolean }
): Promise<void> => {
  if (reading.isValid === false) return;

  const sensor = await prisma.sensor.findFirst({
    where: { id: sensorId, deletedAt: null },
    include: { field: { select: { id: true, name: true, userId: true } } },
  });
  if (!sensor) return;

  const field = sensor.field;
  const thresholds = await getAlertThresholds(field.id);
  const force = options?.force ?? false;
  const varsBase = { field: field.name, sensor: sensor.name };

  if (reading.soilMoisture != null) {
    const moisture = reading.soilMoisture;
    if (moisture < thresholds.soilMoistureLow) {
      const severity: AlertSeverity = moisture < 10 ? 'CRITICAL' : moisture < 15 ? 'HIGH' : 'MEDIUM';
      const titleKey = severity === 'MEDIUM' ? 'drought_title_med' : 'drought_title';
      const msgKey = severity === 'MEDIUM' ? 'drought_msg_med' : 'drought_msg';
      const loc = await localizeAlert(field.userId, titleKey, msgKey, { ...varsBase, value: moisture.toFixed(1) });
      await dispatchAlert({
        userId: field.userId, fieldId: field.id, fieldName: field.name,
        type: 'DROUGHT_RISK', severity, title: loc.title, message: loc.message, force,
        metadata: { moisture, threshold: thresholds.soilMoistureLow, sensorId: sensor.id, sensorName: sensor.name },
      });
    } else if (moisture > thresholds.soilMoistureHigh) {
      const loc = await localizeAlert(field.userId, 'overwater_title', 'overwater_msg', { ...varsBase, value: moisture.toFixed(1) });
      await dispatchAlert({
        userId: field.userId, fieldId: field.id, fieldName: field.name,
        type: 'OVER_WATERING', severity: 'MEDIUM', title: loc.title, message: loc.message, force,
        metadata: { moisture, threshold: thresholds.soilMoistureHigh, sensorId: sensor.id, sensorName: sensor.name },
      });
    }
  }

  if (reading.temperature != null && reading.temperature > thresholds.temperatureHigh) {
    const loc = await localizeAlert(field.userId, 'temp_title', 'temp_msg', {
      ...varsBase,
      value: reading.temperature.toFixed(1),
      threshold: thresholds.temperatureHigh,
    });
    await dispatchAlert({
      userId: field.userId, fieldId: field.id, fieldName: field.name,
      type: 'HIGH_TEMP', severity: reading.temperature > thresholds.temperatureHigh + 5 ? 'HIGH' : 'MEDIUM',
      title: loc.title, message: loc.message, force,
      metadata: { temperature: reading.temperature, threshold: thresholds.temperatureHigh, sensorId: sensor.id },
    });
  }

  if (reading.humidity != null && reading.humidity < thresholds.humidityLow) {
    const loc = await localizeAlert(field.userId, 'humidity_title', 'humidity_msg', {
      ...varsBase,
      value: reading.humidity.toFixed(1),
      threshold: thresholds.humidityLow,
    });
    await dispatchAlert({
      userId: field.userId, fieldId: field.id, fieldName: field.name,
      type: 'LOW_HUMIDITY', severity: 'MEDIUM', title: loc.title, message: loc.message, force,
      metadata: { humidity: reading.humidity, threshold: thresholds.humidityLow, sensorId: sensor.id },
    });
  }

  const battery = reading.batteryLevel ?? sensor.batteryLevel;
  if (battery != null && battery < DEFAULT_THRESHOLDS.batteryLow) {
    const severity: AlertSeverity = battery < 10 ? 'CRITICAL' : 'HIGH';
    const loc = await localizeAlert(field.userId, 'battery_title', 'battery_msg', { ...varsBase, value: battery });
    await dispatchAlert({
      userId: field.userId, fieldId: field.id, fieldName: field.name,
      type: 'LOW_BATTERY', severity, title: loc.title, message: loc.message, force,
      metadata: { sensorId: sensor.id, sensorName: sensor.name, batteryLevel: battery },
    });
  }
};

export const checkSoilMoistureAlerts = async (): Promise<void> => {
  const recentReadings = await prisma.sensorReading.findMany({
    where: {
      soilMoisture: { not: null },
      isValid: true,
      timestamp: { gt: new Date(Date.now() - 30 * 60 * 1000) },
      sensor: { type: 'SOIL_MOISTURE', deletedAt: null },
    },
    include: { sensor: { include: { field: { select: { id: true, name: true, userId: true } } } } },
    distinct: ['sensorId'],
    orderBy: { timestamp: 'desc' },
  });

  for (const r of recentReadings) {
    await evaluateReadingAlerts(r.sensorId, r);
  }
};

export const checkSensorFailureAlerts = async (options?: { force?: boolean; sensorId?: string }): Promise<void> => {
  const thresholdTime = new Date(Date.now() - DEFAULT_THRESHOLDS.sensorOfflineMin * 60 * 1000);
  const offline = await prisma.sensor.findMany({
    where: {
      status: 'ACTIVE',
      lastReading: { lt: thresholdTime },
      deletedAt: null,
      ...(options?.sensorId ? { id: options.sensorId } : {}),
    },
    include: { field: { select: { id: true, name: true, userId: true } } },
  });

  for (const sensor of offline) {
    await prisma.sensor.update({ where: { id: sensor.id }, data: { status: 'INACTIVE' } });
    const loc = await localizeAlert(sensor.field.userId, 'sensor_title', 'sensor_msg', {
      field: sensor.field.name,
      sensor: sensor.name,
      minutes: DEFAULT_THRESHOLDS.sensorOfflineMin,
    });
    await dispatchAlert({
      userId: sensor.field.userId, fieldId: sensor.field.id, fieldName: sensor.field.name,
      type: 'SENSOR_FAILURE', severity: 'HIGH',
      title: loc.title, message: loc.message, force: options?.force,
      metadata: { sensorId: sensor.id, sensorName: sensor.name },
    });
  }
};

export const checkBatteryAlerts = async (): Promise<void> => {
  const low = await prisma.sensor.findMany({
    where: { status: 'ACTIVE', batteryLevel: { lt: DEFAULT_THRESHOLDS.batteryLow, not: null }, deletedAt: null },
    include: { field: { select: { id: true, name: true, userId: true } } },
  });

  for (const sensor of low) {
    await evaluateReadingAlerts(sensor.id, { batteryLevel: sensor.batteryLevel, isValid: true });
  }
};
