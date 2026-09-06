'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser } from '@/lib/api/auth';

const inputCls =
  'w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all';

function getStrength(p: string) {
  if (!p) return { label: '', color: 'bg-muted', w: 'w-0' };
  if (p.length < 6) return { label: 'Weak', color: 'bg-rose-500', w: 'w-1/3' };
  if (p.length < 10 || !/[A-Z]/.test(p) || !/[0-9]/.test(p))
    return { label: 'Medium', color: 'bg-amber-500', w: 'w-2/3' };
  return { label: 'Strong', color: 'bg-emerald-500', w: 'w-full' };
}

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const strength = getStrength(form.password);

  function update(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Calls FastAPI backend POST /auth/register
      const user = await registerUser({
        email: form.email.trim(),
        password: form.password,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
      });
      toast.success('Account created successfully! Welcome to Vigilens APA.');
      router.push('/people');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Start analysing CCTV footage and tracking journeys in minutes
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">First name</label>
            <input
              type="text"
              placeholder="John"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Last name</label>
            <input
              type="text"
              placeholder="Doe"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Password</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {form.password && (
            <div className="space-y-1 pt-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-accent">
                <div className={`h-full ${strength.color} ${strength.w} transition-all`} />
              </div>
              <p className="text-[10px] text-muted-foreground">Strength: {strength.label}</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/60">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
