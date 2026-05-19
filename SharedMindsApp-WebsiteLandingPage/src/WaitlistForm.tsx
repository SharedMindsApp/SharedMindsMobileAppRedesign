import { useState, FormEvent } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import SharedMindsLogo from './assets/shared_minds_logo_2.svg';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    setMessage('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/join-waitlist`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Waitlist signup error:', error);
      setStatus('error');
      setMessage('Unable to connect. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-16 h-16" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={isSubmitting || status === 'success'}
            className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border-2 border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/20 backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            aria-label="Email address"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || status === 'success'}
          className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-blue-500 text-base shadow-lg shadow-cyan-500/20"
        >
          {isSubmitting ? 'Joining...' : status === 'success' ? 'You\'re on the list' : 'Join Waitlist'}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-4 rounded-xl flex items-start gap-3 backdrop-blur-sm border-2 ${
            status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          {status === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <p
            className={`text-sm font-medium ${
              status === 'success' ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {message}
          </p>
        </div>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        We respect your privacy. No spam, ever.
      </p>
    </div>
  );
}
