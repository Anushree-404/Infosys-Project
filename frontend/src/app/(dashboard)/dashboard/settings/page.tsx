'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, User, Lock, Key, Server, Cloud, Database, Wifi } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Account preferences and system configuration</p>
      </div>

      {/* Account */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" /> Account Settings
        </h2>
        <div className="space-y-2">
          {[
            { href: '/dashboard/profile', icon: <User className="w-5 h-5 text-primary-600" />, bg: 'bg-primary-100 dark:bg-primary-900/30', title: 'Profile Information', desc: 'Update your name, phone, location and language' },
            { href: '/dashboard/profile', icon: <Lock className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-100 dark:bg-orange-900/30', title: 'Change Password', desc: 'Update your account password securely' },
          ].map(({ href, icon, bg, title, desc }) => (
            <Link key={title} href={href}>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all cursor-pointer">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* System Info */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-gray-600" /> System Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { icon: <Server className="w-4 h-4 text-blue-500" />, label: 'API Endpoint', value: apiUrl },
            { icon: <Database className="w-4 h-4 text-green-500" />, label: 'Database', value: 'PostgreSQL (Connected)' },
            { icon: <Cloud className="w-4 h-4 text-sky-500" />, label: 'Weather API', value: 'OpenWeatherMap' },
            { icon: <Wifi className="w-4 h-4 text-purple-500" />, label: 'MQTT', value: 'Stub Mode (Phase 3)' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="mt-0.5">{icon}</div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-all">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* API Keys */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-500" /> API Configuration
        </h2>
        <div className="space-y-3">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">🌤️ OpenWeatherMap API Key</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
              Required for live weather data on field pages. Get a free key at{' '}
              <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="underline font-medium">openweathermap.org</a>
            </p>
            <p className="text-xs font-mono bg-amber-100 dark:bg-amber-800 px-2 py-1 rounded text-amber-900 dark:text-amber-200">
              Set in: backend/.env → OPENWEATHER_API_KEY=your_key_here
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
            <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">🔌 MQTT Broker (Phase 3)</p>
            <p className="text-xs text-purple-700 dark:text-purple-400 mb-2">
              Currently in stub mode. Enable real MQTT by setting <code className="font-mono">MQTT_ENABLED=true</code> and configuring the broker URL.
            </p>
            <p className="text-xs font-mono bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded text-purple-900 dark:text-purple-200">
              Set in: backend/.env → MQTT_ENABLED=true, MQTT_BROKER_URL=mqtt://your-broker
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">📧 Email / SMTP (Nodemailer)</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
              Required for password reset emails. Use a Gmail App Password or any SMTP provider.
            </p>
            <p className="text-xs font-mono bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-blue-900 dark:text-blue-200">
              Set in: backend/.env → EMAIL_USER, EMAIL_PASS
            </p>
          </div>
        </div>
      </Card>

      {/* Phase roadmap */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" /> Phase Roadmap
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { phase: 'Phase 1', title: 'Authentication & User Management', done: true },
            { phase: 'Phase 2', title: 'Fields, Crops, Sensors, Weather', done: true },
            { phase: 'Phase 3', title: 'ML Models, Irrigation AI, MQTT Live Data', done: false },
            { phase: 'Phase 4', title: 'Mobile App, Push Notifications, Analytics', done: false },
          ].map(({ phase, title, done }) => (
            <div key={phase} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
              <span className={`text-lg ${done ? '' : 'opacity-40'}`}>{done ? '✅' : '🔜'}</span>
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">{phase}: </span>
                <span className="text-gray-600 dark:text-gray-400">{title}</span>
              </div>
              {done && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Complete</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
