/**
 * Landing Page
 */

import React from 'react';
import Link from 'next/link';
import { Leaf, Droplets, BarChart3, Wifi, Shield, Zap, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <Droplets className="w-6 h-6" />,
    title: 'Smart Irrigation',
    description: 'AI-powered recommendations to optimize water usage and reduce waste by up to 40%.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: <Wifi className="w-6 h-6" />,
    title: 'IoT Sensors',
    description: 'Real-time soil moisture, temperature, and humidity monitoring from the field.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Analytics Dashboard',
    description: 'Visual insights into your farm performance and irrigation history.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with JWT authentication and role-based access.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Instant Alerts',
    description: 'Get notified when sensors detect anomalies or irrigation action is needed.',
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    icon: <Leaf className="w-6 h-6" />,
    title: 'Multi-Crop Support',
    description: 'Manage multiple fields with different crops, each with tailored recommendations.',
    color: 'bg-emerald-100 text-emerald-600',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">IrriSmart</span>
            </div>

            {/* Nav links (desktop) */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">
                How It Works
              </a>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile CTA */}
            <div className="flex md:hidden gap-2">
              <Link href="/login" className="text-sm text-gray-600 px-3 py-2">Sign In</Link>
              <Link href="/register" className="bg-primary-600 text-white text-sm px-4 py-2 rounded-lg">
                Join
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              AI-Powered Agriculture Technology
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              Smart Irrigation for
              <span className="block text-gradient">Modern Farmers</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Manage your farms, fields, and IoT sensors from one powerful dashboard.
              Get AI recommendations to save water and maximize crop yield.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-base"
              >
                Start for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-base"
              >
                Sign In
              </Link>
            </div>

            {/* Social proof */}
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Join 1,000+ farmers already using IrriSmart
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to
              <span className="text-gradient"> Farm Smarter</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A complete platform for modern farmers to manage irrigation, monitor crops,
              and leverage AI for better decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 hover-lift hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-farm-gradient">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Farm?
          </h2>
          <p className="text-primary-200 text-lg mb-8">
            Register today and start optimizing your irrigation with AI insights.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-base"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">IrriSmart</span>
            </div>
            <p className="text-sm">
              © 2024 IrriSmart. AI Irrigation Management System. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <Link href="/api-docs" className="hover:text-white transition-colors">API Docs</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
