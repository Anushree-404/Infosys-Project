/**
 * useDashboard Hook
 * React Query hook for fetching dashboard data
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/services/dashboard.service';
import { useAuth } from '@/context/AuthContext';

export const useDashboard = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 2,
  });
};
