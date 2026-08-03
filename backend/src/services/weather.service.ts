import axios from "axios";
import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { logger } from "../utils/logger";

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const CACHE_MINUTES = 30;

const getApiKey = (): string => {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || key.startsWith("your_openweather")) {
    throw new AppError("OpenWeatherMap API key not configured. Add OPENWEATHER_API_KEY to backend/.env", 503);
  }
  return key;
};

const hasValidKey = (): boolean => {
  const key = process.env.OPENWEATHER_API_KEY;
  return !!(key && !key.startsWith("your_openweather"));
};

const buildResult = (d: Record<string, unknown>, forecastData: Record<string, unknown> | null) => {
  const main = d.main as Record<string, number>;
  const wind = d.wind as Record<string, number> | undefined;
  const sys = d.sys as Record<string, unknown>;
  const weather = (d.weather as Array<Record<string, string>>)?.[0];
  const rain = d.rain as Record<string, number> | undefined;
  const list = (forecastData?.list as Array<Record<string, unknown>>) ?? [];
  const pop = list[0]?.pop;
  const rainProbability = pop !== undefined ? Math.round((pop as number) * 100) : 0;
  return {
    temperature: Math.round((main.temp ?? 0) * 10) / 10,
    feelsLike: Math.round((main.feels_like ?? 0) * 10) / 10,
    humidity: main.humidity ?? 0,
    description: weather?.description ?? "",
    icon: weather?.icon ?? "",
    windSpeed: wind?.speed ?? 0,
    windDirection: wind?.deg ?? 0,
    pressure: main.pressure ?? 0,
    visibility: ((d.visibility as number) ?? 0) / 1000,
    rainProbability,
    rainfall1h: rain?.["1h"] ?? 0,
    sunrise: new Date(((sys.sunrise as number) ?? 0) * 1000),
    sunset: new Date(((sys.sunset as number) ?? 0) * 1000),
    location: (d.name as string) ?? "",
    country: (sys.country as string) ?? "IN",
    forecastJson: forecastData ?? null,
  };
};

const fetchByCoords = async (lat: number, lon: number) => {
  const key = getApiKey();
  const [curr, fore] = await Promise.all([
    axios.get(`${BASE_URL}/weather`, { params: { lat, lon, appid: key, units: "metric" }, timeout: 8000 }),
    axios.get(`${BASE_URL}/forecast`, { params: { lat, lon, appid: key, units: "metric", cnt: 8 }, timeout: 8000 }).catch(() => null),
  ]);
  return buildResult(curr.data, fore?.data ?? null);
};

const fetchByCity = async (city: string, country = "IN") => {
  const key = getApiKey();
  const q = `${city},${country}`;
  const [curr, fore] = await Promise.all([
    axios.get(`${BASE_URL}/weather`, { params: { q, appid: key, units: "metric" }, timeout: 8000 }),
    axios.get(`${BASE_URL}/forecast`, { params: { q, appid: key, units: "metric", cnt: 8 }, timeout: 8000 }).catch(() => null),
  ]);
  return buildResult(curr.data, fore?.data ?? null);
};

// Try district first, fallback to state, fallback to "New Delhi"
const resolveWeather = async (field: {
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  state: string | null;
}) => {
  if (field.latitude && field.longitude) {
    return fetchByCoords(field.latitude, field.longitude);
  }
  if (field.district) {
    try { return await fetchByCity(field.district); } catch { /* fallthrough */ }
  }
  if (field.state) {
    try { return await fetchByCity(field.state); } catch { /* fallthrough */ }
  }
  // Last resort - fetch for India capital
  try { return await fetchByCity("New Delhi"); } catch {
    throw new AppError("Field has no location. Edit field and add State/District or GPS.", 400);
  }
};

const saveToCache = async (fieldId: string, weather: ReturnType<typeof buildResult>) => {
  const expiresAt = new Date(Date.now() + CACHE_MINUTES * 60 * 1000);
  return prisma.weatherData.create({
    data: { fieldId, ...weather, forecastJson: weather.forecastJson as object, expiresAt },
  });
};

export const getFieldWeather = async (fieldId: string, userId: string) => {
  const field = await prisma.field.findFirst({ where: { id: fieldId, userId, deletedAt: null } });
  if (!field) throw new AppError("Field not found", 404);
  const cached = await prisma.weatherData.findFirst({
    where: { fieldId, expiresAt: { gt: new Date() } },
    orderBy: { fetchedAt: "desc" },
  });
  if (cached) return cached;
  const weather = await resolveWeather(field);
  return saveToCache(fieldId, weather);
};

export const getFieldForecast = async (fieldId: string, userId: string) => {
  const field = await prisma.field.findFirst({ where: { id: fieldId, userId, deletedAt: null } });
  if (!field) throw new AppError("Field not found", 404);
  const key = getApiKey();
  let params: Record<string, unknown>;
  if (field.latitude && field.longitude) {
    params = { lat: field.latitude, lon: field.longitude, appid: key, units: "metric", cnt: 40 };
  } else {
    const city = field.district ?? field.state ?? "New Delhi";
    params = { q: `${city},IN`, appid: key, units: "metric", cnt: 40 };
  }
  const res = await axios.get(`${BASE_URL}/forecast`, { params, timeout: 8000 });
  return res.data;
};

export const refreshFieldWeather = async (fieldId: string, userId: string) => {
  const field = await prisma.field.findFirst({ where: { id: fieldId, userId, deletedAt: null } });
  if (!field) throw new AppError("Field not found", 404);
  const weather = await resolveWeather(field);
  return saveToCache(fieldId, weather);
};

export const refreshAllFieldWeather = async () => {
  if (!hasValidKey()) return;
  logger.info("Weather scheduler: refreshing all field weather...");
  const fields = await prisma.field.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, latitude: true, longitude: true, district: true, state: true },
  });
  let refreshed = 0;
  for (const field of fields) {
    try {
      const weather = await resolveWeather(field).catch(() => null);
      if (!weather) continue;
      const expiresAt = new Date(Date.now() + CACHE_MINUTES * 60 * 1000);
      await prisma.weatherData.create({
        data: { fieldId: field.id, ...weather, forecastJson: weather.forecastJson as object, expiresAt },
      });
      refreshed++;
    } catch (err) {
      logger.warn(`Weather refresh failed for field ${field.id}:`, err instanceof Error ? err.message : err);
    }
  }
  logger.info(`Weather scheduler: refreshed ${refreshed}/${fields.length} fields`);
};