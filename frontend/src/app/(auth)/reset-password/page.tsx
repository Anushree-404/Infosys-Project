'use client';

/**
 * Reset Password Page
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { resetPassword } from '@/services/auth.service';
import { useAuthForm } from '@/hooks/useAuthForm';
import toast from 'react-hot-toast';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/\d/, 'Must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [isSuccess, setIsSuccess] = useState(false);
  const { isLoading, setIsLoading, apiErrorMessage, handleApiError } = useAuthForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthLayout title="Invalid Link" subtitle="">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-600">This password reset link is invalid or has expired.</p>
          <Link href="/forgot-password" className="text-primary-600 hover:underline font-medium">
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await resetPassword({ token, ...data });
      setIsSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => router.push('/login'), 2000);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Set New Password 🔒" subtitle="Create a strong new password for your account">
      {isSuccess ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Password Reset!</h3>
          <p className="text-gray-600 text-sm">Redirecting you to login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {apiErrorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{apiErrorMessage}</p>
            </div>
          )}

          <Input
            label="New Password"
            isPassword
            placeholder="Create a strong password"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            hint="Min 8 chars with uppercase, lowercase, number, and special character"
            required
            {...register('password')}
          />

          <Input
            label="Confirm New Password"
            isPassword
            placeholder="Re-enter your new password"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
            required
            {...register('confirmPassword')}
          />

          <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
            Reset Password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
