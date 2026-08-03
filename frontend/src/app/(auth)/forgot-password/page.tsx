'use client';

/**
 * Forgot Password Page
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { forgotPassword } from '@/services/auth.service';
import { useAuthForm } from '@/hooks/useAuthForm';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const { isLoading, setIsLoading, apiErrorMessage, handleApiError } = useAuthForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await forgotPassword(data);
      setSentEmail(data.email);
      setIsEmailSent(true);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password? 🔐"
      subtitle="Enter your email and we'll send you a reset link"
    >
      {isEmailSent ? (
        /* Success state */
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Check Your Email
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              We sent a password reset link to{' '}
              <strong className="text-gray-900 dark:text-white">{sentEmail}</strong>.
              Check your inbox and click the link.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
            💡 Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              className="underline font-medium"
              onClick={() => setIsEmailSent(false)}
            >
              try again
            </button>
            .
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      ) : (
        /* Form state */
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {apiErrorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{apiErrorMessage}</p>
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="Enter your registered email"
            autoComplete="email"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            required
            {...register('email')}
          />

          <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
            Send Reset Link
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
