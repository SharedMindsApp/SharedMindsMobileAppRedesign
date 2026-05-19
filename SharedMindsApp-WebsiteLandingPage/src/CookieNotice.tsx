import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('cookieConsent', 'dismissed');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-white/95 backdrop-blur-sm border-t-2 border-slate-200 shadow-2xl"
      role="complementary"
      aria-label="Cookie consent notice"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            We use minimal essential cookies to improve your experience. We do not use tracking or advertising cookies.{' '}
            <a
              href="#privacy"
              className="text-blue-600 hover:text-blue-700 underline font-medium"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'privacy';
                handleAccept();
              }}
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
            aria-label="Accept cookies"
          >
            Accept
          </button>
          <button
            onClick={handleDismiss}
            className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss cookie notice"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
