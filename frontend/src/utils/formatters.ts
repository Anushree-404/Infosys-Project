/**
 * Formatting utility functions
 */

/**
 * Format date to readable string
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

/**
 * Get weather icon URL from OpenWeatherMap
 */
export const getWeatherIconUrl = (icon: string): string => {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
};

/**
 * Format area in acres
 */
export const formatArea = (acres: number): string => {
  return `${acres.toFixed(2)} acres`;
};

/**
 * Get profile photo URL
 */
export const getProfilePhotoUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${path}`;
};

/**
 * Get sensor type label
 */
export const getSensorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    SOIL_MOISTURE: 'Soil Moisture',
    TEMPERATURE: 'Temperature',
    HUMIDITY: 'Humidity',
    RAINFALL: 'Rainfall',
    FLOW_METER: 'Flow Meter',
    PH_SENSOR: 'pH Sensor',
    NPK_SENSOR: 'NPK Sensor',
    WATER_LEVEL: 'Water Level',
  };
  return labels[type] || type.replace(/_/g, ' ');
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    ACTIVE: 'text-green-600 bg-green-100',
    INACTIVE: 'text-gray-600 bg-gray-100',
    FAULTY: 'text-red-600 bg-red-100',
    MAINTENANCE: 'text-blue-600 bg-blue-100',
    FALLOW: 'text-yellow-600 bg-yellow-100',
    GROWING: 'text-emerald-600 bg-emerald-100',
    PLANNED: 'text-purple-600 bg-purple-100',
    HARVESTED: 'text-amber-600 bg-amber-100',
    FAILED: 'text-red-600 bg-red-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
};

/**
 * Format number with unit
 */
export const formatSensorValue = (type: string, value?: number | null): string => {
  if (value == null) return 'N/A';
  const units: Record<string, string> = {
    SOIL_MOISTURE: '%',
    TEMPERATURE: '°C',
    HUMIDITY: '%',
    RAINFALL: ' mm',
    WATER_LEVEL: ' cm',
    PH_SENSOR: ' pH',
  };
  return `${value.toFixed(1)}${units[type] ?? ''}`;
};

/**
 * Battery level color
 */
export const getBatteryColor = (level?: number | null): string => {
  if (level == null) return 'text-gray-400';
  if (level > 60) return 'text-green-500';
  if (level > 30) return 'text-yellow-500';
  return 'text-red-500';
};
