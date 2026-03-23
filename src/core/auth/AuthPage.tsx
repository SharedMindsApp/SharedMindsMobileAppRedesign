import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles } from 'lucide-react';

export function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) throw signUpError;
                setIsSuccess(true);
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication.');
        } finally {
            setIsLoading(false);
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

                    {isSuccess && isSignUp && (
                        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                            Account created. Please check your email to verify your account, or log in if auto-confirm is enabled in the database.
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
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
                    >
                        {isLoading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setIsSuccess(false);
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
