'use client';

/**
 * Profile Page
 */

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Camera,
  Lock,
  Save,
  Shield,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile, useUploadPhoto } from '@/hooks/useProfile';
import { changePassword } from '@/services/auth.service';
import { getProfilePhotoUrl, formatDate } from '@/utils/formatters';
import toast from 'react-hot-toast';
import type { SelectOption } from '@/types';

// Language options
const languageOptions: SelectOption[] = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'HINDI', label: 'हिंदी (Hindi)' },
  { value: 'TELUGU', label: 'తెలుగు (Telugu)' },
  { value: 'TAMIL', label: 'தமிழ் (Tamil)' },
  { value: 'KANNADA', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'MARATHI', label: 'मराठी (Marathi)' },
  { value: 'GUJARATI', label: 'ગુજરાતી (Gujarati)' },
  { value: 'PUNJABI', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { value: 'BENGALI', label: 'বাংলা (Bengali)' },
  { value: 'ODIA', label: 'ଓଡ଼ିଆ (Odia)' },
];

// Profile form schema
const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+91|91|0)?[6-9]\d{9}$/.test(val),
      'Enter a valid Indian phone number'
    ),
  state: z.string().optional(),
  district: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

// Password form schema
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/\d/, 'Must contain a number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain special character'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadPhoto = useUploadPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentUser = profile || user;

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: currentUser?.fullName || '',
      phone: currentUser?.phone || '',
      state: currentUser?.state || '',
      district: currentUser?.district || '',
      preferredLanguage: currentUser?.preferredLanguage || 'ENGLISH',
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleProfileSubmit = async (data: ProfileFormData) => {
    await updateProfile.mutateAsync(data as Parameters<typeof updateProfile.mutateAsync>[0]);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    await uploadPhoto.mutateAsync(file);
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await changePassword(data);
      toast.success('Password changed! Please login again.');
      passwordForm.reset();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account information and settings
        </p>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Photo Section */}
          <div className="flex items-center gap-5 mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden border-4 border-primary-200 dark:border-primary-700">
                {currentUser?.profilePhoto ? (
                  <Image
                    src={getProfilePhotoUrl(currentUser.profilePhoto)}
                    alt={currentUser.fullName}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-primary-700 dark:text-primary-300 font-bold text-3xl">
                    {currentUser?.fullName?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload button overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center shadow-md transition-colors"
                aria-label="Upload profile photo"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {currentUser?.fullName}
              </h3>
              <p className="text-gray-500 text-sm">{currentUser?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={currentUser?.role === 'ADMIN' ? 'info' : 'success'} size="sm">
                  <Shield className="w-3 h-3 mr-1" />
                  {currentUser?.role}
                </Badge>
                {currentUser?.isEmailVerified && (
                  <Badge variant="success" size="sm">Verified</Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Member since {currentUser?.createdAt ? formatDate(currentUser.createdAt) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Full Name"
                leftIcon={<User className="w-4 h-4" />}
                error={profileForm.formState.errors.fullName?.message}
                required
                {...profileForm.register('fullName')}
              />
              <Input
                label="Email Address"
                type="email"
                leftIcon={<Mail className="w-4 h-4" />}
                value={currentUser?.email || ''}
                disabled
                hint="Email cannot be changed"
              />
              <Input
                label="Phone Number"
                type="tel"
                leftIcon={<Phone className="w-4 h-4" />}
                error={profileForm.formState.errors.phone?.message}
                placeholder="+91 98765 43210"
                {...profileForm.register('phone')}
              />
              <Select
                label="Preferred Language"
                options={languageOptions}
                error={profileForm.formState.errors.preferredLanguage?.message}
                {...profileForm.register('preferredLanguage')}
              />
              <Input
                label="State"
                leftIcon={<MapPin className="w-4 h-4" />}
                placeholder="Andhra Pradesh"
                error={profileForm.formState.errors.state?.message}
                {...profileForm.register('state')}
              />
              <Input
                label="District"
                placeholder="Krishna"
                error={profileForm.formState.errors.district?.message}
                {...profileForm.register('district')}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                leftIcon={<Save className="w-4 h-4" />}
                isLoading={updateProfile.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-600" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-5">
            <Input
              label="Current Password"
              isPassword
              placeholder="Enter your current password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={passwordForm.formState.errors.currentPassword?.message}
              required
              {...passwordForm.register('currentPassword')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="New Password"
                isPassword
                placeholder="Create new password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={passwordForm.formState.errors.newPassword?.message}
                hint="Min 8 chars, uppercase, lowercase, number, special char"
                required
                {...passwordForm.register('newPassword')}
              />
              <Input
                label="Confirm New Password"
                isPassword
                placeholder="Re-enter new password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={passwordForm.formState.errors.confirmNewPassword?.message}
                required
                {...passwordForm.register('confirmNewPassword')}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                leftIcon={<Lock className="w-4 h-4" />}
                isLoading={isChangingPassword}
                variant="secondary"
              >
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
