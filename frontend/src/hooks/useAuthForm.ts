/**
 * useAuthForm Hook
 * Handles error parsing from API responses in forms
 */

import { useState } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { ApiResponse, ValidationError } from '@/types';

interface UseAuthFormReturn {
  isLoading: boolean;
  apiErrors: ValidationError[];
  apiErrorMessage: string;
  setIsLoading: (v: boolean) => void;
  handleApiError: (error: unknown) => void;
  clearErrors: () => void;
}

export const useAuthForm = (): UseAuthFormReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState<ValidationError[]>([]);
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  const handleApiError = (error: unknown) => {
    setIsLoading(false);
    const axiosError = error as AxiosError<ApiResponse>;

    if (axiosError.response?.data) {
      const { message, errors } = axiosError.response.data;
      setApiErrorMessage(message || 'An error occurred');

      if (errors && errors.length > 0) {
        setApiErrors(errors);
      } else {
        toast.error(message || 'An error occurred');
      }
    } else if (axiosError.request) {
      const msg = 'Cannot connect to server. Please check your connection.';
      setApiErrorMessage(msg);
      toast.error(msg);
    } else {
      const msg = 'An unexpected error occurred';
      setApiErrorMessage(msg);
      toast.error(msg);
    }
  };

  const clearErrors = () => {
    setApiErrors([]);
    setApiErrorMessage('');
  };

  return {
    isLoading,
    apiErrors,
    apiErrorMessage,
    setIsLoading,
    handleApiError,
    clearErrors,
  };
};
