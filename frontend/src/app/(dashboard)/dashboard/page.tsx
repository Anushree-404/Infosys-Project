'use client';

/**
 * Main Dashboard Page - Phase 2
 */

import React from 'react';
import Link from 'next/link';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime, getWeatherIconUrl } from '@/utils/formatters';
import {
  MapPin, Radio, CloudSun, Plus, Thermometer, Droplets, Wind,
  AlertCircle, TrendingUp, Activity, Leaf, CheckCircle, XCircle, Wrench,
} from 'lucide-react';
import Image from 'next/image';
import StatusBadge from '@/components/ui/StatusBadge';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import type { LatestReading } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" text="Loading dashboard..." />
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <p className="text-gray-600 dark:text-gray-400">Failed to load dashboard</p>
      <Button onClick={() => refetch()} variant="outline" size="sm">Retry</Button>
    </div>
  );

  const { stats, weather, recentActivity, latestReadings } = data!;

  const sensorHealthItems = [
    { label: 'Active', count: stats.sensorHealth?.ACTIVE ?? 0, color: 'text-green-600', Icon: CheckCircle },
    { label: 'Inactive', count: stats.sensorHealth?.INACTIVE ?? 0, color: 'text-gray-500', Icon: XCircle },
    { label: 'Faulty', count: stats.sensorHealth?.FAULTY ?? 0, color: 'text-red-500', Icon: AlertCircle },
    { label: 'Maintenance', count: stats.sensorHealth?.MAINTENANCE ?? 0, color: 'text-blue-500', Icon: Wrench },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.fullName?.split(' ')[0]}! 🌱
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here&apos;s your farm overview for today.</p>
        </div>
        <Link href="/dashboard/fields">
          <Button leftIcon={<Plus className="w-4 h-4" />} size="md">Add Field</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Fields" value={stats.totalFields} icon={<MapPin className="w-6 h-6" />}
          iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" href="/dashboard/fields"
          trend={stats.totalFields > 0 ? `${stats.totalFields} registered` : 'Add your first'} />
        <StatCard title="Total Sensors" value={stats.totalSensors} icon={<Radio className="w-6 h-6" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600" href="/dashboard/sensors"
          trend={`${stats.sensorHealth?.ACTIVE ?? 0} active`} />
        <StatCard title="Active Crops" value={stats.activeCrops} icon={<Leaf className="w-6 h-6" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600" href="/dashboard/crops"
          trend="Growing & planned" />
        <div>
          {weather ? (
            <WeatherCard weather={weather} />
          ) : (
            <StatCard title="Weather" value="N/A" icon={<CloudSun className="w-6 h-6" />}
              iconBg="bg-sky-100 dark:bg-sky-900/30" iconColor="text-sky-600" href="/dashboard/weather"
              trend="Set GPS to enable" />
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" /> Recent Fields
              </h2>
              <Link href="/dashboard/fields" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <MapPin className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No fields registered yet.</p>
                <Link href="/dashboard/fields">
                  <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>Register First Field</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((a) => (
                  <Link key={a.id} href={`/dashboard/fields/${a.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{a.name}</p>
                        <p className="text-xs text-gray-500 truncate">{a.description} {a.location ? `· ${a.location}` : ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={a.status} />
                        <span className="text-xs text-gray-400">{formatRelativeTime(a.timestamp)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Latest Sensor Readings */}
          {latestReadings && latestReadings.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-600" /> Latest Sensor Readings
                </h2>
                <Link href="/dashboard/sensors" className="text-sm text-primary-600 hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {latestReadings.map((r: LatestReading) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{r.sensorName}</p>
                      <p className="text-xs text-gray-500">{r.fieldName} · {r.sensorType.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-700 dark:text-gray-300 shrink-0">
                      {r.soilMoisture != null && <span className="text-blue-600">💧{r.soilMoisture.toFixed(0)}%</span>}
                      {r.temperature != null && <span className="text-orange-500">🌡️{r.temperature.toFixed(0)}°C</span>}
                      {r.humidity != null && <span className="text-sky-500">💨{r.humidity.toFixed(0)}%</span>}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(r.timestamp)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Sensor health */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-600" /> Sensor Health
            </h2>
            <div className="space-y-2">
              {sensorHealthItems.map(({ label, count, color, Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                  </div>
                  <span className={`text-sm font-bold ${color}`}>{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" /> Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Register New Field', href: '/dashboard/fields', icon: '🌾', desc: 'Add a farm field' },
                { label: 'Add Crop', href: '/dashboard/crops', icon: '🌱', desc: 'Track crop growth' },
                { label: 'Register Sensor', href: '/dashboard/sensors', icon: '📡', desc: 'Connect IoT sensor' },
                { label: 'AI Irrigation', href: '/dashboard/irrigation', icon: '🤖', desc: 'Get smart recommendation' },
                { label: 'View Weather', href: '/dashboard/weather', icon: '🌤️', desc: 'Check forecast' },
              ].map(({ label, href, icon, desc }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all cursor-pointer">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Sub components ────────────────────────────────────────────

interface StatCardProps { title: string; value: number | string; icon: React.ReactNode; iconBg: string; iconColor: string; href: string; trend?: string; }
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBg, iconColor, href, trend }) => (
  <Link href={href}>
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
        </div>
        <div className={`w-11 h-11 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center`}>{icon}</div>
      </div>
    </div>
  </Link>
);

interface WeatherCardProps { weather: { temperature: number; description: string; icon: string; humidity: number; windSpeed: number; location: string } }
const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => (
  <Link href="/dashboard/weather">
    <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-5 shadow-sm text-white hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sky-100 text-xs font-medium">Weather</p>
          <p className="text-sky-200 text-xs">{weather.location}</p>
        </div>
        {weather.icon && <Image src={getWeatherIconUrl(weather.icon)} alt={weather.description} width={40} height={40} />}
      </div>
      <p className="text-3xl font-bold">{weather.temperature}°C</p>
      <p className="text-sky-200 text-xs capitalize mt-1">{weather.description}</p>
      <div className="flex gap-3 mt-2 text-sky-200 text-xs">
        <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{weather.humidity}%</span>
        <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{weather.windSpeed}m/s</span>
      </div>
    </div>
  </Link>
);
