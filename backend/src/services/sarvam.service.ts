/**
 * Sarvam AI Service — Milestone 3
 * Backend proxy for Sarvam AI translation and TTS.
 * API key never exposed to frontend.
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const SARVAM_API_URL = 'https://api.sarvam.ai';
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

export type SarvamLanguage = 'hi-IN' | 'kn-IN' | 'en-IN' | 'te-IN' | 'ta-IN' | 'mr-IN' | 'gu-IN' | 'pa-IN' | 'bn-IN' | 'or-IN';

const LANG_MAP: Record<string, SarvamLanguage> = {
  HINDI:    'hi-IN',
  KANNADA:  'kn-IN',
  ENGLISH:  'en-IN',
  TELUGU:   'te-IN',
  TAMIL:    'ta-IN',
  MARATHI:  'mr-IN',
  GUJARATI: 'gu-IN',
  PUNJABI:  'pa-IN',
  BENGALI:  'bn-IN',
  ODIA:     'or-IN',
};

export const getUserLanguageCode = (preferredLanguage: string): SarvamLanguage => {
  return LANG_MAP[preferredLanguage.toUpperCase()] ?? 'en-IN';
};

export const translateText = async (
  text: string,
  targetLang: SarvamLanguage,
  sourceLang: SarvamLanguage = 'en-IN'
): Promise<string> => {
  if (!SARVAM_API_KEY) {
    logger.debug('Sarvam AI: API key not configured, returning original text');
    return text;
  }
  if (targetLang === 'en-IN' || targetLang === sourceLang) return text;

  try {
    const res = await axios.post(
      `${SARVAM_API_URL}/translate`,
      { input: text, source_language_code: sourceLang, target_language_code: targetLang, speaker_gender: 'Female', mode: 'formal', enable_preprocessing: true },
      { headers: { 'api-subscription-key': SARVAM_API_KEY, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    return res.data?.translated_text ?? text;
  } catch (err) {
    logger.warn('Sarvam translate failed:', err instanceof Error ? err.message : err);
    return text;
  }
};

export const textToSpeech = async (
  text: string,
  targetLang: SarvamLanguage
): Promise<string | null> => {
  if (!SARVAM_API_KEY) return null;

  try {
    const res = await axios.post(
      `${SARVAM_API_URL}/text-to-speech`,
      { inputs: [text], target_language_code: targetLang, speaker: 'meera', pitch: 0, pace: 1.0, loudness: 1.5, speech_sample_rate: 8000, enable_preprocessing: true, model: 'bulbul:v1' },
      { headers: { 'api-subscription-key': SARVAM_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    // Returns base64 audio
    return res.data?.audios?.[0] ?? null;
  } catch (err) {
    logger.warn('Sarvam TTS failed:', err instanceof Error ? err.message : err);
    return null;
  }
};
