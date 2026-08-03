'use client';

/**
 * Dashboard Navbar - Phase 2 (with notification bell)
 */

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getProfilePhotoUrl } from '@/utils/formatters';
import * as notificationService from '@/services/notification.service';
import type { Notification } from '@/services/notification.service';
import { Bell, ChevronDown, LogOut, User, Settings, Menu, X, Leaf, CheckCheck, Trash2 } from 'lucide-react';

const notifColor: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-yellow-100 text-yellow-700',
  ALERT: 'bg-red-100 text-red-700',
  SUCCESS: 'bg-green-100 text-green-700',
};

interface NavbarProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: 60000,
  });

  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.notifications ?? [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-primary-700 dark:text-primary-400">IrriSmart</span>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setIsNotifOpen(o => !o); setIsUserOpen(false); }}
              className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Notifications {unreadCount > 0 && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                  </h3>
                  {unreadCount > 0 && (
                    <button onClick={() => markAllMutation.mutate()}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((n: Notification) => (
                      <div key={n.id}
                        className={`flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${!n.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${notifColor[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {n.type}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {!n.isRead && (
                            <button onClick={() => markReadMutation.mutate(n.id)}
                              className="p-1 text-gray-400 hover:text-blue-500" title="Mark read">
                              <CheckCheck className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => deleteMutation.mutate(n.id)}
                            className="p-1 text-gray-400 hover:text-red-500" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => { setIsUserOpen(o => !o); setIsNotifOpen(false); }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-haspopup="true" aria-expanded={isUserOpen}>
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border-2 border-primary-200">
                {user?.profilePhoto ? (
                  <Image src={getProfilePhotoUrl(user.profilePhoto)} alt={user.fullName} width={32} height={32} className="object-cover" />
                ) : (
                  <span className="text-primary-700 font-semibold text-sm">{user?.fullName?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.fullName?.split(' ')[0]}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUserOpen ? 'rotate-180' : ''}`} />
            </button>

            {isUserOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsUserOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{user?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <Link href="/dashboard/profile" onClick={() => setIsUserOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <User className="w-4 h-4" /> My Profile
                    </Link>
                    <Link href="/dashboard/settings" onClick={() => setIsUserOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
