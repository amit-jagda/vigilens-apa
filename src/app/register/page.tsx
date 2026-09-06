'use client';

import React from 'react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { SignupForm } from '@/components/auth/SignupForm';

export default function RegisterPage() {
  return (
    <AuthSplitLayout>
      <SignupForm />
    </AuthSplitLayout>
  );
}
