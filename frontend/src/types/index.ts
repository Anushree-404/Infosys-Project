/**
 * Global TypeScript types - Phase 2
 */

export type Role = 'FARMER' | 'ADMIN';
export type Language = 'ENGLISH' | 'HINDI' | 'TELUGU' | 'TAMIL' | 'KANNADA' | 'MARATHI' | 'GUJARATI' | 'PUNJABI' | 'BENGALI' | 'ODIA';
export type FieldStatus = 'ACTIVE' | 'INACTIVE' | 'FALLOW';
export type SensorType = 'SOIL_MOISTURE' | 'TEMPERATURE' | 'HUMIDITY' | 'RAINFALL' | 'FLOW_METER' | 'PH_SENSOR' | 'NPK_SENSOR' | 'WATER_LEVEL';
export type SensorStatus = 'ACTIVE' | 'INACTIVE' | 'FAULTY' | 'MAINTENANCE';
export type CropStatus = 'PLANNED' | 'GROWING' | 'HARVESTED' | 'FAILED';
export type GrowthStage = 'SEEDLING' | 'VEGETATIVE' | 'FLOWERING' | 'FRUITING' | 'MATURITY' | 'HARVESTING';
export type IrrigationMethod = 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'FURROW' | 'SUBSURFACE' | 'RAIN_FED';
export type WaterSource = 'BOREWELL' | 'CANAL' | 'RIVER' | 'POND' | 'RAINWATER' | 'MUNICIPALITY';

// ── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  profilePhoto?: string | null;
  state?: string | null;
  district?: string | null;
  preferredLanguage: Language;
  isEmailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// ── Auth ─────────────────────────────────────────────────────
export interface LoginInput { email: string; password: string; rememberMe?: boolean; }
export interface RegisterInput { fullName: string; email: string; phone?: string; password: string; confirmPassword: string; state?: string; district?: string; preferredLanguage?: Language; }
export interface ForgotPasswordInput { email: string; }
export interface ResetPasswordInput { token: string; password: string; confirmPassword: string; }
export interface ChangePasswordInput { currentPassword: string; newPassword: string; confirmNewPassword: string; }
export interface AuthState { user: User | null; accessToken: string | null; isAuthenticated: boolean; isLoading: boolean; }

// ── Field ────────────────────────────────────────────────────
export interface Field {
  id: string;
  name: string;
  area: number;
  areaUnit: string;
  state?: string | null;
  district?: string | null;
  village?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  soilType?: string | null;
  irrigationMethod?: IrrigationMethod | null;
  waterSource?: WaterSource | null;
  status: FieldStatus;
  description?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { sensors: number; crops: number; };
  sensors?: Sensor[];
  crops?: Crop[];
}

// ── Crop ─────────────────────────────────────────────────────
export interface Crop {
  id: string;
  name: string;
  variety?: string | null;
  growthStage: GrowthStage;
  plantingDate?: string | null;
  expectedHarvestDate?: string | null;
  actualHarvestDate?: string | null;
  expectedWaterReq?: number | null;
  currentStatus: CropStatus;
  notes?: string | null;
  fieldId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Sensor ───────────────────────────────────────────────────
export interface Sensor {
  id: string;
  name: string;
  serialNumber: string;
  type: SensorType;
  status: SensorStatus;
  location?: string | null;
  batteryLevel?: number | null;
  lastReading?: string | null;
  installationDate?: string | null;
  fieldId: string;
  field?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  _count?: { readings: number };
  readings?: SensorReading[];
}

// ── Sensor Reading ───────────────────────────────────────────
export interface SensorReading {
  id: string;
  sensorId: string;
  soilMoisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  rainfall?: number | null;
  waterLevel?: number | null;
  ph?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  batteryLevel?: number | null;
  signalStrength?: number | null;
  isValid: boolean;
  invalidReason?: string | null;
  source: string;
  timestamp: string;
}

// ── Weather ──────────────────────────────────────────────────
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  windDirection?: number;
  pressure?: number;
  visibility?: number;
  rainProbability?: number;
  rainfall1h?: number;
  sunrise?: string;
  sunset?: string;
  location: string;
  country: string;
  fetchedAt?: string;
  expiresAt?: string;
}

// ── Dashboard ────────────────────────────────────────────────
export interface DashboardStats {
  totalFields: number;
  totalSensors: number;
  activeCrops: number;
  sensorHealth: Record<string, number>;
}

export interface ActivityItem {
  id: string;
  type: string;
  name: string;
  description: string;
  status: string;
  location?: string;
  timestamp: string;
}

export interface LatestReading {
  id: string;
  sensorName: string;
  sensorType: SensorType;
  fieldName: string;
  soilMoisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  rainfall?: number | null;
  batteryLevel?: number | null;
  timestamp: string;
}

export interface DashboardData {
  user: User;
  stats: DashboardStats;
  weather: WeatherData | null;
  recentActivity: ActivityItem[];
  latestReadings: LatestReading[];
  quickActions: { label: string; href: string; icon: string }[];
}

// ── API Response ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: PaginationMeta;
}

export interface ValidationError { field: string; message: string; }
export interface PaginationMeta { total: number; page: number; limit: number; totalPages: number; }
export interface SelectOption { value: string; label: string; }
