'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Radio, Leaf, ArrowLeft, Activity, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Field, Sensor, Crop } from '@/types';
import Link from 'next/link';

interface LatestSensorData {
  sensorId: string; sensorName: string; type: string; status: string;
  batteryLevel?: number | null; lastReading?: string | null;
  latestData: {
    soilMoisture?: number | null; temperature?: number | null;
    humidity?: number | null; rainfall?: number | null; timestamp: string;
  } | null;
}

export default function FieldDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ingestingTest, setIngestingTest] = useState(false);

  const { data: field, isLoading } = useQuery({
    queryKey: ['field', id],
    queryFn: async () => {
      const res = await api.get(`/fields/${id}`);
      return res.data.data as Field & { sensors: Sensor[]; crops: Crop[] };
    },
  });

  const { data: latestData, refetch: refetchLatest } = useQuery({
    queryKey: ['field-latest', id],
    queryFn: async () => {
      const res = await api.get(`/sensors/fields/${id}/latest`);
      return res.data.data as LatestSensorData[];
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  const ingestTest = async () => {
    setIngestingTest(true);
    try {
      await api.post(`/sensors/fields/${id}/test-data`);
      refetchLatest();
      queryClient.invalidateQueries({ queryKey: ['field', id] });
      toast.success('Test data ingested successfully!');
    } catch {
      toast.error('No active sensors found in this field.');
    } finally {
      setIngestingTest(false);
    }
  };

  const sensorTypeIcon: Record<string, string> = {
    SOIL_MOISTURE: '💧', TEMPERATURE: '🌡️', HUMIDITY: '💨',
    RAINFALL: '🌧️', FLOW_METER: '🔄', PH_SENSOR: '⚗️', NPK_SENSOR: '🧪', WATER_LEVEL: '📊',
  };

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    </div>
  );

  if (!field) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Field not found.</p>
      <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fields">
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{field.name}</h1>
            <StatusBadge status={field.status} size="md" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {[field.village, field.district, field.state].filter(Boolean).join(', ')}
          </p>
        </div>
        <Button size="sm" onClick={ingestTest} disabled={ingestingTest}
          leftIcon={ingestingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}>
          Inject Test Data
        </Button>
      </div>

      {/* Field Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Area', value: `${field.area} ${field.areaUnit}`, icon: '📐' },
          { label: 'Soil Type', value: field.soilType ?? 'N/A', icon: '🌍' },
          { label: 'Irrigation', value: field.irrigationMethod?.replace('_', ' ') ?? 'N/A', icon: '💧' },
          { label: 'Water Source', value: field.waterSource?.replace('_', ' ') ?? 'N/A', icon: '🚰' },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="!p-4 text-center">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value}</p>
          </Card>
        ))}
      </div>

      {/* GPS */}
      {field.latitude && field.longitude && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">GPS Location</h2>
          </div>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Lat: <strong>{field.latitude.toFixed(6)}</strong></span>
            <span>Lng: <strong>{field.longitude.toFixed(6)}</strong></span>
            <a href={`https://maps.google.com/?q=${field.latitude},${field.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="text-primary-600 hover:underline font-medium">
              View on Maps →
            </a>
          </div>
        </Card>
      )}

      {/* Latest Sensor Readings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Sensor Data</h2>
          <span className="text-xs text-gray-400 ml-1">(auto-refreshes every 30s)</span>
        </div>
        {latestData && latestData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {latestData.map((s) => (
              <Card key={s.sensorId} className="!p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sensorTypeIcon[s.type] ?? '📡'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.sensorName}</p>
                      <p className="text-xs text-gray-500">{s.type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                {s.latestData ? (
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {s.latestData.soilMoisture != null && <p>💧 Soil: <strong>{s.latestData.soilMoisture.toFixed(1)}%</strong></p>}
                    {s.latestData.temperature != null && <p>🌡️ Temp: <strong>{s.latestData.temperature.toFixed(1)}°C</strong></p>}
                    {s.latestData.humidity != null && <p>💨 Humidity: <strong>{s.latestData.humidity.toFixed(1)}%</strong></p>}
                    {s.latestData.rainfall != null && <p>🌧️ Rainfall: <strong>{s.latestData.rainfall.toFixed(1)} mm</strong></p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(s.latestData.timestamp).toLocaleString()}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No readings yet. Click "Inject Test Data".</p>
                )}
                {s.batteryLevel != null && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className={`text-xs font-medium ${s.batteryLevel > 60 ? 'text-green-500' : s.batteryLevel > 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                      🔋 Battery: {s.batteryLevel}%
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-center text-gray-500 py-6">No active sensors. Go to Sensors to register one.</p></Card>
        )}
      </div>

      {/* Crops */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Crops ({field.crops?.length ?? 0})</h2>
          </div>
          <Link href="/dashboard/crops">
            <Button variant="ghost" size="sm">Manage Crops →</Button>
          </Link>
        </div>
        {field.crops && field.crops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {field.crops.map(crop => (
              <Card key={crop.id} className="!p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900 dark:text-white">{crop.name}</p>
                  <StatusBadge status={crop.currentStatus} />
                </div>
                <p className="text-xs text-gray-500">{crop.growthStage} • {crop.variety ?? 'No variety'}</p>
                {crop.expectedWaterReq && <p className="text-xs text-blue-600 mt-1">💧 {crop.expectedWaterReq} L/day</p>}
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-center text-gray-500 py-6">No crops assigned. Go to Crops to add one.</p></Card>
        )}
      </div>

      {/* Sensors list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sensors ({field.sensors?.length ?? 0})</h2>
          </div>
          <Link href="/dashboard/sensors">
            <Button variant="ghost" size="sm">Manage Sensors →</Button>
          </Link>
        </div>
        {field.sensors && field.sensors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {field.sensors.map(sensor => (
              <Card key={sensor.id} className="!p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{sensor.name}</p>
                  <StatusBadge status={sensor.status} />
                </div>
                <p className="text-xs text-gray-500">{sensor.type.replace(/_/g, ' ')}</p>
                <p className="text-xs font-mono text-gray-400">#{sensor.serialNumber}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-center text-gray-500 py-6">No sensors registered in this field.</p></Card>
        )}
      </div>
    </div>
  );
}
