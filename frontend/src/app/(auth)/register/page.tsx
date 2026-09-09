'use client';

/**
 * Registration Page
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone, MapPin, Globe } from 'lucide-react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useAuthForm } from '@/hooks/useAuthForm';
import type { SelectOption } from '@/types';

// ============================================================
// OPTIONS
// ============================================================

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

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name is too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes'),
    email: z.string().email('Please enter a valid email address'),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^(\+91|91|0)?[6-9]\d{9}$/.test(val),
        'Please enter a valid Indian phone number'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/\d/, 'Must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    state: z.string().optional(),
    district: z.string().optional(),
    preferredLanguage: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const { isLoading, setIsLoading, apiErrorMessage, apiErrors, handleApiError } = useAuthForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      preferredLanguage: 'ENGLISH',
    },
  });

  // Map API validation errors back to form fields
  React.useEffect(() => {
    apiErrors.forEach((apiErr) => {
      const field = apiErr.field as keyof RegisterFormData;
      if (field) {
        setError(field, { message: apiErr.message });
      }
    });
  }, [apiErrors, setError]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser(data);
      router.push('/dashboard');
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <AuthLayout
      title="Create your account 🌱"
      subtitle="Join thousands of farmers using AI irrigation"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* API Error */}
        {apiErrorMessage && !apiErrors.length && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Full Name */}
        <Input
          label="Full Name"
          type="text"
          placeholder="Rajesh Kumar"
          autoComplete="name"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.fullName?.message}
          required
          {...register('fullName')}
        />

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="rajesh@example.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          required
          {...register('email')}
        />

        {/* Phone */}
        <Input
          label="Phone Number"
          type="tel"
          placeholder="+91 98765 43210"
          autoComplete="tel"
          leftIcon={<Phone className="w-4 h-4" />}
          error={errors.phone?.message}
          hint="Optional - Indian mobile number"
          {...register('phone')}
        />

        {/* Password */}
        <Input
          label="Password"
          isPassword
          placeholder="Create a strong password"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          hint="Min 8 chars with uppercase, lowercase, number, and special character"
          required
          {...register('password')}
        />

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          isPassword
          placeholder="Re-enter your password"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />

        {/* State & District (2 cols) */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="State"
            type="text"
            placeholder="Andhra Pradesh"
            leftIcon={<MapPin className="w-4 h-4" />}
            error={errors.state?.message}
            {...register('state')}
          />
          <Input
            label="District"
            type="text"
            placeholder="Krishna"
            error={errors.district?.message}
            {...register('district')}
          />
        </div>

        {/* Preferred Language */}
        <Select
          label="Preferred Language"
          options={languageOptions}
          leftIcon={<Globe className="w-4 h-4" />}
          error={errors.preferredLanguage?.message}
          {...register('preferredLanguage')}
        />

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          className="mt-2"
        >
          Create Account
        </Button>

        {/* Terms */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          By registering, you agree to our{' '}
          <a href="#" className="text-primary-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-primary-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>

        {/* Login link */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
