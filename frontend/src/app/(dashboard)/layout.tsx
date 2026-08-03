'use client';

/**
 * Dashboard Layout (Protected Route Guard)
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <PageLoader text="Loading your dashboard..." />;
  }

  if (!isAuthenticated) {
    return <PageLoader text="Redirecting to login..." />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
