'use client';

/**
 * Login Page
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react';
import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useAuthForm } from '@/hooks/useAuthForm';

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { isLoading, setIsLoading, apiErrorMessage, handleApiError } = useAuthForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      router.push('/dashboard');
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <AuthLayout
      title="Welcome back 👋"
      subtitle="Sign in to your IrriSmart account"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* API Error */}
        {apiErrorMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          required
          {...register('email')}
        />

        {/* Password */}
        <div>
          <Input
            label="Password"
            isPassword
            placeholder="Enter your password"
            autoComplete="current-password"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            required
            {...register('password')}
          />
          <div className="mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Remember Me */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-primary-600 rounded"
            {...register('rememberMe')}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Remember me for 30 days
          </span>
        </label>

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
        >
          Sign In
        </Button>

        {/* Register link */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Create free account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
