import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { resendSignupConfirmation } from '../../lib/auth';
import { Eye, EyeOff } from 'lucide-react';

export function AuthPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isSignUp) {
                const normalizedName = fullName.trim();
                if (!normalizedName) {
                    throw new Error('Please enter your name to create an account.');
                }

                const normalizedEmail = email.trim().toLowerCase();
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/login`,
                        data: {
                            full_name: normalizedName,
                            display_name: normalizedName,
                            name: normalizedName,
                        },
                    },
                });

                if (signUpError) throw signUpError;
                setSuccessMessage(
                    data.session
                        ? 'Account created. You are now signed in.'
                        : `Account created. We sent a confirmation email to ${normalizedEmail}.`
                );
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: email.trim().toLowerCase(),
                    password,
                });

                if (signInError) throw signInError;
            }
        } catch (err: any) {
            const message = err?.message || 'An error occurred during authentication.';

            if (typeof message === 'string' && message.toLowerCase().includes('email not confirmed')) {
                setError('Your email address has not been confirmed yet. Use the resend link below to get another confirmation email.');
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendConfirmation = async () => {
        setError(null);
        setSuccessMessage(null);

        try {
            setIsResending(true);
            await resendSignupConfirmation(email);
            setSuccessMessage(`Confirmation email sent to ${email.trim().toLowerCase()}.`);
        } catch (err: any) {
            setError(err?.message || 'Failed to resend confirmation email.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-8 flex flex-col items-center text-center">
                    <img src="/icon-512.png" alt="SharedMinds" className="mb-4 h-16 w-16 rounded-3xl shadow-sm" />
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isSignUp ? 'Create an account' : 'Welcome back'}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        {isSignUp
                            ? 'Enter your details to get started with SharedMinds.'
                            : 'Sign in to access your personal and shared spaces.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                            {successMessage}
                        </div>
                    )}

                    {isSignUp && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fullName">
                                Your name
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                required={isSignUp}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                                placeholder="e.g. Matthew Jones"
                                autoComplete="name"
                            />
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 pr-12 text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                                placeholder="••••••••"
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition-colors hover:text-slate-800"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
                    >
                        {isLoading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
                    </button>

                    {!isSignUp && (
                        <button
                            type="button"
                            onClick={handleResendConfirmation}
                            disabled={isResending || !email.trim()}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-transparent"
                        >
                            {isResending ? 'Sending confirmation email...' : 'Resend confirmation email'}
                        </button>
                    )}
                </form>

                <div className="mt-6 text-center text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setSuccessMessage(null);
                            if (isSignUp) {
                                setFullName('');
                            }
                        }}
                        className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
