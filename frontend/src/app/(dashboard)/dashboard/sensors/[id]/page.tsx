'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Radio, Activity, RefreshCw, BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SensorChart } from '@/components/charts/SensorChart';
import api from '@/services/api';
import type { Sensor, SensorReading, PaginationMeta } from '@/types';
import Link from 'next/link';
import { formatSensorValue } from '@/utils/formatters';

const sensorTypeIcon: Record<string, string> = {
  SOIL_MOISTURE: '💧', TEMPERATURE: '🌡️', HUMIDITY: '💨',
  RAINFALL: '🌧️', FLOW_METER: '🔄', PH_SENSOR: '⚗️', NPK_SENSOR: '🧪', WATER_LEVEL: '📊',
};

export default function SensorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  const { data: sensor, isLoading: sensorLoading } = useQuery({
    queryKey: ['sensor', id],
    queryFn: async () => {
      const res = await api.get(`/sensors/${id}`);
      return res.data.data as Sensor & { readings: SensorReading[] };
    },
  });

  // Fetch more readings for chart (last 200)
  const { data: allReadings, refetch } = useQuery({
    queryKey: ['sensor-readings-chart', id],
    queryFn: async () => {
      const res = await api.get(`/sensors/${id}/data`, { params: { page: 1, limit: 200 } });
      return res.data.data as SensorReading[];
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: readingsData, isLoading: readingsLoading } = useQuery({
    queryKey: ['sensor-readings-table', id, page],
    queryFn: async () => {
      const res = await api.get(`/sensors/${id}/data`, { params: { page, limit: 20 } });
      return { readings: res.data.data as SensorReading[], meta: res.data.meta as PaginationMeta };
    },
    enabled: !!id,
  });

  const tableReadings = readingsData?.readings ?? [];
  const meta = readingsData?.meta;
  const chartReadings = allReadings ?? sensor?.readings ?? [];

  const getReadingValue = (r: SensorReading, type: string): string => {
    switch (type) {
      case 'SOIL_MOISTURE': return formatSensorValue(type, r.soilMoisture);
      case 'TEMPERATURE': return formatSensorValue(type, r.temperature);
      case 'HUMIDITY': return formatSensorValue(type, r.humidity);
      case 'RAINFALL': return formatSensorValue(type, r.rainfall);
      case 'WATER_LEVEL': return formatSensorValue(type, r.waterLevel);
      case 'PH_SENSOR': return formatSensorValue(type, r.ph);
      default:
        return [r.soilMoisture, r.temperature, r.humidity].filter(v => v != null).map(v => `${v?.toFixed(1)}`).join(' / ') || 'N/A';
    }
  };

  // Farmer-friendly helpers
  const getBatteryLabel = (level?: number | null) => {
    if (level == null) return { text: 'Unknown', color: 'text-gray-400', icon: '🔋' };
    if (level > 60) return { text: `Good (${level}%)`, color: 'text-green-500', icon: '🔋' };
    if (level > 30) return { text: `Low (${level}%)`, color: 'text-yellow-500', icon: '🪫' };
    return { text: `Critical (${level}%)`, color: 'text-red-500', icon: '⚠️' };
  };

  const getSignalLabel = (strength?: number | null) => {
    if (strength == null) return { text: 'Unknown', color: 'text-gray-400' };
    if (strength >= -60) return { text: '📶 Excellent', color: 'text-green-500' };
    if (strength >= -75) return { text: '📶 Good', color: 'text-blue-500' };
    if (strength >= -90) return { text: '📶 Weak', color: 'text-yellow-500' };
    return { text: '📵 No Signal', color: 'text-red-500' };
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { text: string; color: string }> = {
      ACTIVE: { text: '✅ Sending Data', color: 'text-green-600' },
      INACTIVE: { text: '⚠️ Not Sending Data', color: 'text-yellow-600' },
      FAULTY: { text: '❌ Device Problem', color: 'text-red-600' },
      MAINTENANCE: { text: '🔧 Under Maintenance', color: 'text-blue-600' },
    };
    return map[status] ?? { text: status, color: 'text-gray-500' };
  };

  const getSensorTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SOIL_MOISTURE: 'Soil Moisture Sensor',
      TEMPERATURE: 'Temperature Sensor',
      HUMIDITY: 'Humidity Sensor',
      RAINFALL: 'Rainfall Sensor',
      FLOW_METER: 'Water Flow Sensor',
      PH_SENSOR: 'Soil pH Sensor',
      NPK_SENSOR: 'Soil Nutrients Sensor',
      WATER_LEVEL: 'Water Level Sensor',
    };
    return map[type] ?? type;
  };

  if (sensorLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!sensor) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Sensor not found.</p>
      <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
    </div>
  );

  const latest = sensor.readings?.[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/sensors">
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">{sensorTypeIcon[sensor.type] ?? '📡'}</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sensor.name}</h1>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm text-gray-500">{getSensorTypeLabel(sensor.type)}</span>
            <span className={`text-sm font-medium ${getStatusLabel(sensor.status).color}`}>
              {getStatusLabel(sensor.status).text}
            </span>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
      </div>

      {/* Info cards — farmer friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="!p-4 text-center">
          <p className="text-2xl mb-1">🌾</p>
          <p className="text-xs text-gray-500 mb-1">Farm Field</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{sensor.field?.name ?? 'N/A'}</p>
        </Card>
        <Card className="!p-4 text-center">
          <p className="text-2xl mb-1">🕐</p>
          <p className="text-xs text-gray-500 mb-1">Last Updated</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {sensor.lastReading ? new Date(sensor.lastReading).toLocaleString() : 'Never'}
          </p>
        </Card>
        <Card className="!p-4 text-center">
          <p className="text-2xl mb-1">📊</p>
          <p className="text-xs text-gray-500 mb-1">Readings Recorded</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {String(meta?.total ?? chartReadings.length)} readings
          </p>
        </Card>
      </div>

      {/* Latest reading highlight */}
      {latest && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-600" /> Latest Reading
            <span className="text-xs text-gray-400 font-normal ml-1">{new Date(latest.timestamp).toLocaleString()}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {latest.soilMoisture != null && (
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{latest.soilMoisture.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">Soil Moisture</p>
              </div>
            )}
            {latest.temperature != null && (
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <p className="text-2xl font-bold text-orange-500">{latest.temperature.toFixed(1)}°C</p>
                <p className="text-xs text-gray-500 mt-1">Temperature</p>
              </div>
            )}
            {latest.humidity != null && (
              <div className="text-center p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                <p className="text-2xl font-bold text-sky-500">{latest.humidity.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">Humidity</p>
              </div>
            )}
            {latest.rainfall != null && (
              <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <p className="text-2xl font-bold text-indigo-500">{latest.rainfall.toFixed(1)} mm</p>
                <p className="text-xs text-gray-500 mt-1">Rainfall</p>
              </div>
            )}
          </div>
          {!latest.isValid && (
            <p className="text-xs text-red-500 mt-2">⚠️ Invalid reading: {latest.invalidReason}</p>
          )}
        </Card>
      )}

      {/* Chart + Table tabs */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary-600" /> Sensor History
            {meta && <span className="text-sm text-gray-400 font-normal">({meta.total} total readings)</span>}
          </h2>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${activeTab === 'chart' ? 'bg-white dark:bg-gray-800 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
              📈 Chart
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${activeTab === 'table' ? 'bg-white dark:bg-gray-800 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
              📋 Table
            </button>
          </div>
        </div>

        {activeTab === 'chart' ? (
          chartReadings.length > 0 ? (
            <SensorChart readings={chartReadings} sensorType={sensor.type} height={300} />
          ) : (
            <p className="text-center text-gray-500 py-12">No readings yet. Use "Test Data" on the sensors page to inject sample data.</p>
          )
        ) : (
          <>
            {readingsLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : tableReadings.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Reading</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Data OK?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableReadings.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                            {new Date(r.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-gray-800 dark:text-gray-200">
                            {getReadingValue(r, sensor.type)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {r.isValid
                              ? <span className="text-green-500 text-xs font-medium">✅ Yes</span>
                              : <span className="text-red-500 text-xs font-medium" title={r.invalidReason ?? ''}>❌ No</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="text-sm text-gray-500">Page {page} of {meta.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500 py-8">No readings yet.</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
