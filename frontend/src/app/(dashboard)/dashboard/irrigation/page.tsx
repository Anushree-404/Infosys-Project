'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Droplets, Zap, CheckCircle, AlertTriangle, XCircle,
  Clock, ChevronDown, Loader2, Calendar, Leaf,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Field } from '@/types';

type Tab = 'crop' | 'schedule' | 'kaggle';

const urgencyConfig = {
  URGENT:  { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:border-red-700',          icon: <XCircle className="w-5 h-5 text-red-600" />,         label: 'Irrigate Immediately' },
  SOON:    { color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20',                   icon: <AlertTriangle className="w-5 h-5 text-orange-500" />, label: 'Irrigate Soon' },
  MONITOR: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20',                   icon: <Clock className="w-5 h-5 text-yellow-600" />,        label: 'Monitor Closely' },
  OK:      { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:border-green-700', icon: <CheckCircle className="w-5 h-5 text-green-600" />,   label: 'No Irrigation Needed' },
};

const stressColor: Record<string, string> = {
  LOW: 'text-green-600 bg-green-100', MEDIUM: 'text-yellow-600 bg-yellow-100',
  HIGH: 'text-orange-600 bg-orange-100', CRITICAL: 'text-red-600 bg-red-100',
};

export default function IrrigationAIPage() {
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('crop');
  const [cropResult, setCropResult] = useState<Record<string, unknown> | null>(null);
  const [schedResult, setSchedResult] = useState<Record<string, unknown> | null>(null);
  const [kaggleIrrResult, setKaggleIrrResult] = useState<Record<string, unknown> | null>(null);
  const [kagglelCropResult, setKaggleCropResult] = useState<Record<string, unknown> | null>(null);
  const [kaggleN, setKaggleN] = useState('90');
  const [kaggleP, setKaggleP] = useState('42');
  const [kaggleK, setKaggleK] = useState('43');
  const [kagglePh, setKagglePh] = useState('6.5');
  const [cropType, setCropType] = useState('Rice');
  const [growthStage, setGrowthStage] = useState('Vegetative');
  const [season, setSeason] = useState('Kharif');
  const [rainfall7, setRainfall7] = useState('10');

  const CROPS = ['Rice','Wheat','Maize','Cotton','Sugarcane','Soybean','Groundnut','Tomato','Potato','Onion'];
  const STAGES = ['Seedling','Vegetative','Flowering','Fruiting','Maturity'];
  const SEASONS = ['Kharif','Rabi','Zaid'];

  const selCls = 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  const ML_URL = 'http://localhost:8000';

  const { data: fieldsData } = useQuery({
    queryKey: ['fields-list'],
    queryFn: async () => {
      const res = await api.get('/fields', { params: { limit: 100 } });
      const f = res.data.data as Field[];
      if (f.length > 0 && !selectedFieldId) setSelectedFieldId(f[0].id);
      return f;
    },
  });
  const fields = fieldsData ?? [];

  const { data: mlStatus } = useQuery({
    queryKey: ['ml-health'],
    queryFn: async () => {
      const res = await api.get('/ml/health');
      return res.data.data as { status: string; model?: { model_name: string; accuracy: number } };
    },
    refetchInterval: 30000,
  });
  const mlOnline = mlStatus?.status === 'online';

  const cropMut = useMutation({
    mutationFn: () => api.post(`/ml/recommend/crop/${selectedFieldId}`, { crop_type: cropType, growth_stage: growthStage, season }),
    onSuccess: (d) => { setCropResult(d.data.data); toast.success('Crop recommendation ready!'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const schedMut = useMutation({
    mutationFn: () => api.post(`/ml/recommend/schedule/${selectedFieldId}`, { crop_type: cropType, growth_stage: growthStage, season, rainfall_7day: parseFloat(rainfall7) }),
    onSuccess: (d) => { setSchedResult(d.data.data); toast.success('7-day schedule ready!'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const kaggleIrrMut = useMutation({
    mutationFn: () => api.post(`/ml/kaggle/irrigation/${selectedFieldId}`, { crop_type: cropType, crop_growth_stage: growthStage, season }),
    onSuccess: (d) => { setKaggleIrrResult(d.data.data); toast.success('Kaggle prediction ready!'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ML service offline'),
  });

  const kaggleCropMut = useMutation({
    mutationFn: () => api.post(`/ml/kaggle/crop/${selectedFieldId}`, { nitrogen: parseFloat(kaggleN), phosphorus: parseFloat(kaggleP), potassium: parseFloat(kaggleK), ph: parseFloat(kagglePh) }),
    onSuccess: (d) => { setKaggleCropResult(d.data.data); toast.success('Crop recommendation ready!'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'crop',     label: 'Crop Water Needs', icon: <Leaf className="w-4 h-4" /> },
    { id: 'schedule', label: '7-Day Schedule',   icon: <Calendar className="w-4 h-4" /> },
    { id: 'kaggle',   label: 'Kaggle AI',        icon: <Zap className="w-4 h-4 text-purple-600" /> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Droplets className="w-7 h-7 text-primary-600" /> Irrigation AI
        </h1>
        <p className="text-gray-500 mt-1">AI-powered irrigation recommendations — Phase 3</p>
      </div>

      {/* ML Status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${mlOnline ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'}`}>
        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${mlOnline ? 'bg-green-500' : 'bg-amber-500'}`} />
        <span className={mlOnline ? 'text-green-800 dark:text-green-300 font-medium' : 'text-amber-800 dark:text-amber-300 font-medium'}>
          {mlOnline ? `ML Service Online — ${mlStatus?.model?.model_name ?? 'Models loaded'} (${mlStatus?.model?.accuracy ? (mlStatus.model.accuracy*100).toFixed(1)+'%' : ''} accuracy)` : 'ML Service Offline — start it with: python -m uvicorn main:app --port 8000'}
        </span>
        {mlOnline && <Zap className="w-4 h-4 text-green-600 ml-auto" />}
      </div>

      {/* Field + crop selector */}
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Field</label>
            <div className="relative">
              <select className={selCls + ' w-full appearance-none'} value={selectedFieldId} onChange={e => setSelectedFieldId(e.target.value)}>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Crop</label>
            <select className={selCls + ' w-full'} value={cropType} onChange={e => setCropType(e.target.value)}>
              {CROPS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Growth Stage</label>
            <select className={selCls + ' w-full'} value={growthStage} onChange={e => setGrowthStage(e.target.value)}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Season</label>
            <select className={selCls + ' w-full'} value={season} onChange={e => setSeason(e.target.value)}>
              {SEASONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white dark:bg-gray-800 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}

      {/* ── Tab 1: Crop Water Needs ── */}
      {activeTab === 'crop' && (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-gray-500 mb-3">Calculate the exact water requirement for your crop based on species, growth stage, soil type, and current weather conditions.</p>
            <Button onClick={() => cropMut.mutate()} disabled={!selectedFieldId || cropMut.isPending || !mlOnline}
              leftIcon={cropMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Leaf className="w-4 h-4" />}>
              {cropMut.isPending ? 'Calculating...' : 'Get Crop Water Recommendation'}
            </Button>
          </Card>

          {cropResult && (() => {
            const r = (cropResult as { recommendation: Record<string, unknown> }).recommendation;
            const stress = String(r?.stress_level ?? 'LOW');
            // Convert mm to litres (need field area - default 1 ha if unknown)
            const field = fields.find(f => f.id === selectedFieldId);
            const areaHa = field?.area ?? 1;
            const mmPerDay = Number(r?.water_req_mm_day ?? 0);
            const litresPerDay = Math.round(mmPerDay * areaHa * 10000);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Card className="!p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Daily Water Requirement</p>
                    <p className="text-3xl font-bold text-blue-600">{litresPerDay.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">litres / day</p>
                    <p className="text-xs text-gray-400">({mmPerDay} mm · {areaHa} ha)</p>
                  </Card>
                  <Card className="!p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Water Stress Level</p>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${stressColor[stress] ?? 'bg-gray-100 text-gray-700'}`}>{stress}</span>
                  </Card>
                  <Card className="!p-4 text-center sm:col-span-1 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Irrigation Times</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {((r?.irrigation_times ?? []) as string[]).join(' · ')}
                    </p>
                  </Card>
                </div>
                <Card>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Stress Description</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{String(r?.stress_description ?? '')}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Daily Schedule</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {(() => {
                      const sched = String(r?.daily_schedule ?? '');
                      // Replace mm with litres in schedule text
                      const sessions = ((r?.irrigation_times ?? []) as string[]).length || 1;
                      const litresPerSession = Math.round(litresPerDay / sessions);
                      return `Apply ${litresPerSession.toLocaleString()} litres at each session (${((r?.irrigation_times ?? []) as string[]).join(', ')})`;
                    })()}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Tips</p>
                  <ul className="space-y-1">{((r?.tips ?? []) as string[]).map((t, i) => {
                    // Replace mm with litres in tips
                    const fixedTip = t.replace(/(\d+\.?\d*)\s*mm/g, (_, val) => {
                      const litres = Math.round(parseFloat(val) * areaHa * 10000);
                      return `${litres.toLocaleString()} litres`;
                    });
                    return (
                      <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-primary-500">💡</span>{fixedTip}
                      </li>
                    );
                  })}</ul>
                </Card>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab 4: 7-Day Schedule ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-gray-500 mb-3">Generate a personalised 7-day irrigation schedule based on your crop, field size, and recent rainfall.</p>
            <div className="flex items-center gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rainfall last 7 days (mm)</label>
                <input type="number" min="0" max="500" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white w-36 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={rainfall7} onChange={e => setRainfall7(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => schedMut.mutate()} disabled={!selectedFieldId || schedMut.isPending || !mlOnline}
              leftIcon={schedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}>
              {schedMut.isPending ? 'Generating...' : 'Generate 7-Day Schedule'}
            </Button>
          </Card>

          {schedResult && (() => {
            const s = (schedResult as { schedule: Record<string, unknown> }).schedule;
            const weekly = (s?.weekly_schedule ?? []) as Array<{ day: string; action: string; recommended_time: string; water_mm: number }>;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="!p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Total Water This Week</p>
                    <p className="text-2xl font-bold text-blue-600">{String(s?.total_water_m3 ?? 0)} m³</p>
                  </Card>
                  <Card className="!p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Water Saving vs Flood</p>
                    <p className="text-2xl font-bold text-green-600">{String(s?.cost_saving_pct ?? 0)}%</p>
                  </Card>
                </div>
                <Card>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">📅 Weekly Plan</p>
                  <div className="space-y-2">
                    {weekly.map((day, i) => {
                      // Convert mm to litres for each day
                      const field = fields.find(f => f.id === selectedFieldId);
                      const areaHa = field?.area ?? 1;
                      const dayLitres = day.water_mm > 0 ? Math.round(day.water_mm * areaHa * 10000) : 0;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${day.water_mm === 0 ? 'bg-green-50 dark:bg-green-900/10' : 'bg-blue-50 dark:bg-blue-900/10'}`}>
                          <span className="w-24 text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">{day.day}</span>
                          <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                            {day.water_mm === 0 ? day.action : `Apply ${dayLitres.toLocaleString()} litres`}
                          </span>
                          {day.water_mm > 0 && <span className="text-xs text-blue-600 font-medium shrink-0">{day.recommended_time}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">{String(s?.recommendation ?? '')}</p>
                </Card>
              </div>
            );
          })()}
        </div>
      )}
      {/* ── Tab 5: Kaggle AI (Real Data) ── */}
      {activeTab === 'kaggle' && (
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 text-sm">
            <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">🧠 Trained on Real Kaggle Data</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-purple-700 dark:text-purple-400">
              <span>📊 Irrigation: 10,000 records (F1=99.9%)</span>
              <span>🌾 Crop Rec: 2,200 records — 22 crops (F1=99.5%)</span>
            </div>
          </div>

          {/* Kaggle Irrigation */}
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">💧 Irrigation Prediction (Kaggle Model)</h3>
            <p className="text-xs text-gray-500 mb-3">Uses Gradient Boosting trained on real irrigation dataset with soil, crop, weather features.</p>
            <Button onClick={() => kaggleIrrMut.mutate()} disabled={!selectedFieldId || kaggleIrrMut.isPending || !mlOnline}
              leftIcon={kaggleIrrMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700">
              {kaggleIrrMut.isPending ? 'Predicting...' : 'Predict with Kaggle Model'}
            </Button>
            {kaggleIrrResult && (() => {
              const p = (kaggleIrrResult as { prediction: Record<string, unknown> }).prediction;
              const urgency = String(p?.urgency ?? 'OK') as keyof typeof urgencyConfig;
              const cfg = urgencyConfig[urgency] ?? urgencyConfig.OK;
              return (
                <div className={`mt-3 rounded-xl border-2 p-4 ${cfg.color}`}>
                  <div className="flex items-center gap-2 mb-1">{cfg.icon}<span className="font-bold text-sm">{cfg.label}</span></div>
                  <p className="text-xs mb-2">{String(p?.recommendation ?? '')}</p>
                  <div className="flex gap-4 text-xs font-medium">
                    <span>Level: {String(p?.irrigation_level ?? '')}</span>
                    <span>Confidence: {Math.round(Number(p?.confidence ?? 0)*100)}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Source: {String(p?.data_source ?? '')}</p>
                </div>
              );
            })()}
          </Card>

          {/* Kaggle Crop Recommendation */}
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">🌾 Crop Recommendation (Kaggle Model)</h3>
            <p className="text-xs text-gray-500 mb-3">Enter soil NPK values to get the best crop recommendation from 22 Indian crops.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Nitrogen (N)', val: kaggleN, set: setKaggleN },
                { label: 'Phosphorus (P)', val: kaggleP, set: setKaggleP },
                { label: 'Potassium (K)', val: kaggleK, set: setKaggleK },
                { label: 'Soil pH', val: kagglePh, set: setKagglePh },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input type="number" step="0.1" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={val} onChange={e => set(e.target.value)} />
                </div>
              ))}
            </div>
            <Button onClick={() => kaggleCropMut.mutate()} disabled={!selectedFieldId || kaggleCropMut.isPending || !mlOnline}
              leftIcon={kaggleCropMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Leaf className="w-4 h-4" />}>
              {kaggleCropMut.isPending ? 'Analysing...' : 'Recommend Best Crop'}
            </Button>

            {kagglelCropResult && (() => {
              const r = (kagglelCropResult as { recommendation: Record<string, unknown> }).recommendation;
              const top3 = (r?.top_3_crops ?? []) as Array<{ crop: string; confidence: number }>;
              return (
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Best Recommended Crop</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">🌾 {String(r?.recommended_crop ?? '')}</p>
                    <p className="text-xs text-gray-500 mt-1">Confidence: {Math.round(Number(r?.confidence ?? 0)*100)}%</p>
                    <p className="text-xs text-gray-500">{String(r?.soil_condition ?? '')}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {top3.map((c, i) => (
                      <div key={i} className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <p className="text-xs text-gray-500">#{i+1}</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.crop}</p>
                        <p className="text-xs text-primary-600">{Math.round(c.confidence*100)}%</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Source: {String(r?.data_source ?? '')}</p>
                </div>
              );
            })()}
          </Card>
        </div>
      )}
    </div>
  );
}
