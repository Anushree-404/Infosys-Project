'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Droplets, Thermometer, Radio, Leaf } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import type { Field } from '@/types';

export default function AnalyticsPage() {
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['fields-list'],
    queryFn: async () => {
      const res = await api.get('/fields', { params: { limit: 100 } });
      return res.data.data as Field[];
    },
  });

  const fields = fieldsData ?? [];
  const totalArea = fields.reduce((sum, f) => sum + (f.area ?? 0), 0);
  const totalSensors = fields.reduce((sum, f) => sum + (f._count?.sensors ?? 0), 0);
  const totalCrops = fields.reduce((sum, f) => sum + (f._count?.crops ?? 0), 0);
  const activeFields = fields.filter(f => f.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Farm performance overview and insights</p>
      </div>

      {/* Phase 3 banner */}
      <div className="bg-gradient-to-r from-primary-600 to-emerald-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6" />
          <h2 className="text-lg font-bold">Advanced Analytics — Phase 3</h2>
        </div>
        <p className="text-primary-100 text-sm mb-4">
          AI-powered irrigation predictions, Random Forest models, LSTM time-series analysis, and automated recommendations are coming in Phase 3.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Irrigation Prediction', 'Yield Forecasting', 'Water Usage Optimization', 'Anomaly Detection', 'MQTT Live Charts'].map(item => (
            <span key={item} className="text-xs bg-white/20 px-3 py-1 rounded-full">{item}</span>
          ))}
        </div>
      </div>

      {/* Current summary stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Farm Area', value: `${totalArea.toFixed(1)} acres`, icon: <Leaf className="w-6 h-6" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
            { label: 'Active Fields', value: `${activeFields} / ${fields.length}`, icon: <TrendingUp className="w-6 h-6" />, color: 'text-primary-600', bg: 'bg-primary-100 dark:bg-primary-900/30' },
            { label: 'Active Crops', value: `${totalCrops} crops`, icon: <Droplets className="w-6 h-6" />, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { label: 'Total Sensors', value: `${totalSensors} sensors`, icon: <Radio className="w-6 h-6" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          ].map(({ label, value, icon, color, bg }) => (
            <Card key={label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center`}>{icon}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Field breakdown */}
      {fields.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" /> Field Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Field</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Crops</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Sensors</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(f => (
                  <tr key={f.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                    <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">{f.area} {f.areaUnit}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-medium">{f._count?.crops ?? 0}</td>
                    <td className="py-2 px-3 text-right text-blue-600 font-medium">{f._count?.sensors ?? 0}</td>
                    <td className="py-2 px-3 text-gray-500 text-xs">{[f.district, f.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        f.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        f.status === 'FALLOW' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Irrigation method distribution */}
      {fields.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" /> Irrigation Methods
            </h2>
            {(() => {
              const counts: Record<string, number> = {};
              fields.forEach(f => { const k = f.irrigationMethod ?? 'NOT SET'; counts[k] = (counts[k] ?? 0) + 1; });
              const total = fields.length;
              return (
                <div className="space-y-2">
                  {Object.entries(counts).map(([method, count]) => (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{method.replace('_', ' ')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count} fields ({Math.round(count / total * 100)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-500" /> Soil Types
            </h2>
            {(() => {
              const counts: Record<string, number> = {};
              fields.forEach(f => { const k = f.soilType ?? 'NOT SET'; counts[k] = (counts[k] ?? 0) + 1; });
              const total = fields.length;
              return (
                <div className="space-y-2">
                  {Object.entries(counts).map(([soil, count]) => (
                    <div key={soil}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{soil}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count} ({Math.round(count / total * 100)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>
      )}
    </div>
  );
}
