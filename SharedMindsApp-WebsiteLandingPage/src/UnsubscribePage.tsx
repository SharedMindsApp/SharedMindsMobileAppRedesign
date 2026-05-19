import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface UnsubscribePageProps {
  token: string | null;
}

export default function UnsubscribePage({ token }: UnsubscribePageProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No unsubscribe token provided. Please use the link from your email.');
      return;
    }

    const unsubscribe = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/unsubscribe?token=${token}`);

        const data = await response.json();

        if (response.ok && data.success) {
          setEmail(data.email);
          if (data.alreadyUnsubscribed) {
            setStatus('already');
          } else {
            setStatus('success');
          }
        } else {
          setStatus('error');
          setErrorMessage(data.message || data.error || 'Unable to process your request');
        }
      } catch (error) {
        console.error('Unsubscribe error:', error);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again later.');
      }
    };

    unsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Processing...</h1>
            <p className="text-slate-600">Please wait while we unsubscribe you.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">You've been unsubscribed</h1>
            <p className="text-slate-600 mb-4">
              {email && <span className="font-medium">{email}</span>} will no longer receive emails from SharedMinds.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              We're sorry to see you go. If you change your mind, you can always rejoin the waitlist.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Return to SharedMinds
            </a>
          </div>
        )}

        {status === 'already' && (
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Already unsubscribed</h1>
            <p className="text-slate-600 mb-4">
              {email && <span className="font-medium">{email}</span>} is already unsubscribed from our mailing list.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              You won't receive any more emails from us. If you'd like to rejoin, visit our homepage.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Return to SharedMinds
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-4">{errorMessage}</p>
            <p className="text-sm text-slate-500 mb-6">
              If you continue to receive emails, please contact us at support@sharedminds.app
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Return to SharedMinds
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
