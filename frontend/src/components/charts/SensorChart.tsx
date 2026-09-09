'use client';

/**
 * SensorChart - Live line chart for sensor readings
 * Shows soil moisture, temperature, humidity over time
 */

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import type { SensorReading, SensorType } from '@/types';

interface ChartDataPoint {
  time: string;
  soilMoisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  rainfall?: number | null;
  waterLevel?: number | null;
  ph?: number | null;
}

interface SensorChartProps {
  readings: SensorReading[];
  sensorType: SensorType;
  height?: number;
}

const METRICS: Record<string, { key: keyof ChartDataPoint; color: string; label: string; unit: string; min?: number; max?: number }[]> = {
  SOIL_MOISTURE: [{ key: 'soilMoisture', color: '#3b82f6', label: 'Soil Moisture', unit: '%', min: 0, max: 100 }],
  TEMPERATURE:   [{ key: 'temperature', color: '#f97316', label: 'Temperature', unit: '°C', min: 0, max: 50 }],
  HUMIDITY:      [{ key: 'humidity', color: '#06b6d4', label: 'Humidity', unit: '%', min: 0, max: 100 }],
  RAINFALL:      [{ key: 'rainfall', color: '#6366f1', label: 'Rainfall', unit: 'mm' }],
  WATER_LEVEL:   [{ key: 'waterLevel', color: '#0ea5e9', label: 'Water Level', unit: 'cm' }],
  PH_SENSOR:     [{ key: 'ph', color: '#8b5cf6', label: 'pH', unit: '', min: 0, max: 14 }],
  NPK_SENSOR:    [{ key: 'soilMoisture', color: '#10b981', label: 'NPK Reading', unit: 'ppm' }],
  FLOW_METER:    [{ key: 'waterLevel', color: '#14b8a6', label: 'Flow Rate', unit: 'L/s' }],
};

// Multi-metric for combined view
const MULTI_METRICS = [
  { key: 'soilMoisture' as keyof ChartDataPoint, color: '#3b82f6', label: 'Soil %', unit: '%' },
  { key: 'temperature' as keyof ChartDataPoint, color: '#f97316', label: 'Temp °C', unit: '°C' },
  { key: 'humidity' as keyof ChartDataPoint, color: '#06b6d4', label: 'Humidity %', unit: '%' },
];

type Range = '1h' | '6h' | '24h' | '7d';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number; unit?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.value != null ? p.value.toFixed(1) : 'N/A'}
        </p>
      ))}
    </div>
  );
};

export const SensorChart: React.FC<SensorChartProps> = ({ readings, sensorType, height = 280 }) => {
  const [range, setRange] = useState<Range>('24h');
  const [showMulti, setShowMulti] = useState(false);

  const rangeMs: Record<Range, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  const cutoff = Date.now() - rangeMs[range];

  const chartData: ChartDataPoint[] = readings
    .filter(r => new Date(r.timestamp).getTime() > cutoff)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        ...(range === '7d' ? { month: 'short', day: 'numeric' } : {}),
      }),
      soilMoisture: r.soilMoisture,
      temperature: r.temperature,
      humidity: r.humidity,
      rainfall: r.rainfall,
      waterLevel: r.waterLevel,
      ph: r.ph,
    }));

  const metrics = showMulti ? MULTI_METRICS : (METRICS[sensorType] ?? METRICS.SOIL_MOISTURE);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400" style={{ height }}>
        <p className="text-sm">No data in the selected time range</p>
        <p className="text-xs mt-1">Try a longer range or inject test data</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {(['1h', '6h', '24h', '7d'] as Range[]).map(r => (
            <button key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                range === r
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowMulti(m => !m)}
          className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
            showMulti
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}>
          {showMulti ? '📊 Multi-metric' : '📈 Single metric'}
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            domain={metrics[0]?.min !== undefined ? [metrics[0].min, metrics[0].max ?? 'auto'] : ['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            formatter={(value) => <span className="text-gray-600 dark:text-gray-400">{value}</span>}
          />

          {/* Critical threshold lines */}
          {sensorType === 'SOIL_MOISTURE' && !showMulti && (
            <>
              <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical Low', position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }} />
              <ReferenceLine y={80} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Optimal High', position: 'insideTopLeft', fontSize: 10, fill: '#f97316' }} />
            </>
          )}

          {metrics.map(m => (
            <Line
              key={m.key as string}
              type="monotone"
              dataKey={m.key as string}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              dot={chartData.length <= 20 ? { r: 3, fill: m.color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 text-right">{chartData.length} data points</p>
    </div>
  );
};

export default SensorChart;
