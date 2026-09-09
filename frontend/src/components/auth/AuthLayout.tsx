'use client';

/**
 * Auth Layout - Shared layout for login/register pages
 */

import React from 'react';
import Link from 'next/link';
import { Leaf } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left panel - Decorative (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-farm-gradient flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl">IrriSmart</h1>
              <p className="text-primary-200 text-sm">AI Irrigation System</p>
            </div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-white text-2xl font-bold mb-2">
              Smart Farming,
              <br />
              Better Yields 🌾
            </h2>
            <p className="text-primary-200 text-sm leading-relaxed">
              Use AI-powered insights to optimize irrigation, save water, and maximize crop productivity.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '40%', label: 'Water Saved' },
              { value: '25%', label: 'Better Yield' },
              { value: '1000+', label: 'Farmers' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
              >
                <p className="text-white font-bold text-xl">{stat.value}</p>
                <p className="text-primary-200 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-primary-300 text-xs">
            © 2024 IrriSmart - AI Irrigation Management System
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-20 overflow-y-auto">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-primary-700 text-xl">IrriSmart</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{subtitle}</p>
            )}
          </div>

          {/* Form content */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
