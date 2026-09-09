'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, Droplets, Wind, RefreshCw, MapPin, Sunrise, Sunset, Eye, Gauge, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Field, WeatherData } from '@/types';

interface ForecastItem {
  dt_txt: string;
  main: { temp: number; humidity: number };
  weather: { description: string; icon: string }[];
  pop: number;
  wind: { speed: number };
}

export default function WeatherPage() {
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: fieldsData } = useQuery({
    queryKey: ['fields-list'],
    queryFn: async () => {
      const res = await api.get('/fields', { params: { limit: 100 } });
      return res.data.data as Field[];
    },
  });
  const fields = fieldsData ?? [];

  useEffect(() => {
    if (fields.length > 0 && !selectedFieldId) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId]);

  const { data: weather, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['weather', selectedFieldId],
    queryFn: async () => {
      const res = await api.get(`/weather/current/${selectedFieldId}`);
      return res.data.data as WeatherData;
    },
    enabled: !!selectedFieldId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const { data: forecast } = useQuery({
    queryKey: ['forecast', selectedFieldId],
    queryFn: async () => {
      const res = await api.get(`/weather/forecast/${selectedFieldId}`);
      return res.data.data as { list: ForecastItem[] };
    },
    enabled: !!selectedFieldId && !!weather,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = async () => {
    if (!selectedFieldId) return;
    setRefreshing(true);
    try {
      await api.post(`/weather/refresh/${selectedFieldId}`);
      refetch();
      toast.success('Weather refreshed!');
    } catch {
      toast.error('Failed to refresh. Check field location and API key in backend/.env');
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const errorMsg =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'Weather unavailable';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weather Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time weather for your fields</p>
        </div>
        <div className="flex gap-2 items-center">
          {fields.length > 0 && (
            <div className="relative">
              <select
                className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                value={selectedFieldId}
                onChange={e => setSelectedFieldId(e.target.value)}>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh}
            disabled={refreshing || !selectedFieldId}
            leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}>
            {refreshing ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* No fields */}
      {fields.length === 0 && (
        <Card>
          <p className="text-center text-gray-500 py-10">
            Create a field first to view weather data.
          </p>
        </Card>
      )}

      {/* Error */}
      {isError && selectedFieldId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300 mb-2">⚠️ {errorMsg}</p>
          <ul className="ml-4 list-disc space-y-1 text-amber-700 dark:text-amber-400 text-xs">
            <li>Edit the field and set <strong>State</strong> or <strong>District</strong> to a city name like <strong>Mangalore</strong>, <strong>Bengaluru</strong>, <strong>Hyderabad</strong></li>
            <li>Or add GPS coordinates (latitude/longitude) to the field</li>
            <li>Make sure <code className="font-mono bg-amber-100 dark:bg-amber-800 px-1 rounded">OPENWEATHER_API_KEY</code> is set in <code className="font-mono bg-amber-100 dark:bg-amber-800 px-1 rounded">backend/.env</code></li>
          </ul>
          <p className="mt-2 text-xs text-amber-600">After fixing, click <strong>Refresh</strong> above.</p>
        </div>
      )}

      {/* Not yet loaded — show prompt */}
      {!isLoading && !isError && !weather && selectedFieldId && fields.length > 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CloudSun className="w-16 h-16 text-sky-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Weather not loaded yet
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 max-w-sm">
            Click below to fetch live weather for <strong>{fields.find(f => f.id === selectedFieldId)?.name ?? 'this field'}</strong>.
          </p>
          <Button onClick={handleRefresh} disabled={refreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}>
            {refreshing ? 'Fetching weather...' : 'Load Weather Now'}
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
        </div>
      )}

      {/* Weather data */}
      {weather && !isError && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-sky-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-sky-200" />
                    <span className="text-sky-200 text-sm">{weather.location}, {weather.country}</span>
                  </div>
                  {weather.fetchedAt && (
                    <p className="text-sky-300 text-xs">Updated: {new Date(weather.fetchedAt).toLocaleTimeString()}</p>
                  )}
                </div>
                {weather.icon && (
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt={weather.description}
                    className="w-16 h-16"
                  />
                )}
              </div>
              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <p className="text-6xl font-bold">{weather.temperature}°C</p>
                  <p className="text-sky-200 capitalize mt-1">{weather.description}</p>
                  <p className="text-sky-300 text-sm mt-1">Feels like {weather.feelsLike}°C</p>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-1">
                  <div className="flex items-center gap-2 text-sky-100 text-sm">
                    <Droplets className="w-4 h-4" /> {weather.humidity}%
                  </div>
                  <div className="flex items-center gap-2 text-sky-100 text-sm">
                    <Wind className="w-4 h-4" /> {weather.windSpeed} m/s
                  </div>
                  {weather.pressure && (
                    <div className="flex items-center gap-2 text-sky-100 text-sm">
                      <Gauge className="w-4 h-4" /> {weather.pressure} hPa
                    </div>
                  )}
                  {weather.visibility !== undefined && (
                    <div className="flex items-center gap-2 text-sky-100 text-sm">
                      <Eye className="w-4 h-4" /> {weather.visibility} km
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side cards */}
            <div className="space-y-3">
              <Card className="!p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Sun Times</p>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Sunrise className="w-4 h-4" /> {formatTime(weather.sunrise)}
                  </div>
                  <div className="flex items-center gap-2 text-orange-500">
                    <Sunset className="w-4 h-4" /> {formatTime(weather.sunset)}
                  </div>
                </div>
              </Card>

              <Card className="!p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Rain Probability</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${weather.rainProbability ?? 0}%` }} />
                  </div>
                  <span className="text-sm font-bold text-blue-600">{weather.rainProbability ?? 0}%</span>
                </div>
                {weather.rainfall1h !== undefined && weather.rainfall1h > 0 && (
                  <p className="text-xs text-gray-500 mt-2">🌧️ {weather.rainfall1h} mm in last hour</p>
                )}
              </Card>

              <Card className="!p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Irrigation Advisory</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {(weather.humidity ?? 0) > 70 ? '✅ Good moisture — no irrigation needed' :
                   (weather.rainProbability ?? 0) > 60 ? '🌧️ Rain expected soon' :
                   (weather.temperature ?? 0) > 35 ? '⚠️ High heat — consider irrigation' :
                   '💧 Normal conditions'}
                </p>
              </Card>
            </div>
          </div>

          {/* Forecast */}
          {forecast?.list && forecast.list.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">5-Day Forecast</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {forecast.list.slice(0, 8).map((item, i) => (
                  <div key={i} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <p className="text-xs text-gray-500 mb-1">
                      {new Date(item.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {item.weather[0]?.icon && (
                      <img
                        src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                        alt=""
                        className="w-10 h-10 mx-auto"
                      />
                    )}
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{Math.round(item.main.temp)}°C</p>
                    <p className="text-xs text-blue-600">{Math.round(item.pop * 100)}% 🌧️</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
