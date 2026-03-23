/**
 * Mobile AI Debug Overlay
 * 
 * Dev-only floating panel that shows AI diagnostic information on mobile devices.
 * Replaces missing console visibility on mobile.
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { getRuntimeEnvironment } from '../../lib/runtimeEnvironment';

interface AIDiagnostic {
  type: string;
  reason: string;
  platform: string;
  provider?: string;
  model?: string;
  routeId?: string;
  via?: string;
  error?: string;
  timestamp: string;
}

export function MobileAIDebugOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AIDiagnostic[]>([]);
  const env = getRuntimeEnvironment();
  
  useEffect(() => {
    // Load diagnostics from sessionStorage
    const loadDiagnostics = () => {
      try {
        const stored = sessionStorage.getItem('ai_diagnostics');
        if (stored) {
          const parsed = JSON.parse(stored);
          setDiagnostics(parsed);
        }
      } catch (error) {
        console.error('[MobileAIDebugOverlay] Failed to load diagnostics:', error);
      }
    };
    
    loadDiagnostics();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(loadDiagnostics, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Only show in development and on mobile
  if (import.meta.env.PROD || !env.isMobile) {
    return null;
  }
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-orange-500 text-white p-3 rounded-full shadow-lg touch-manipulation"
        aria-label="Show AI Debug Info"
      >
        <Info size={20} />
        {diagnostics.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {diagnostics.length}
          </span>
        )}
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-white border-2 border-orange-500 rounded-lg shadow-2xl max-w-sm w-[calc(100vw-2rem)] max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <Info size={18} />
          <h3 className="font-semibold text-sm">AI Debug Info</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded p-1 touch-manipulation"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Runtime Environment */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-semibold text-gray-900 mb-2">Runtime Environment</h4>
          <div className="space-y-1 text-gray-700">
            <div className="flex justify-between">
              <span>Platform:</span>
              <span className="font-mono">{env.platform}</span>
            </div>
            <div className="flex justify-between">
              <span>Mobile:</span>
              <span className="font-mono">{env.isMobile ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Browser:</span>
              <span className="font-mono">{env.isBrowser ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Server:</span>
              <span className="font-mono">{env.isServer ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
        
        {/* Diagnostics */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">
            Diagnostics ({diagnostics.length})
          </h4>
          {diagnostics.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No diagnostics yet
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {diagnostics.slice().reverse().map((diag, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-2 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-gray-900 capitalize">
                      {diag.type.replace(/_/g, ' ')}
                    </span>
                    {diag.type.includes('error') || diag.type.includes('skipped') ? (
                      <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-gray-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Reason:</span>
                      <span className="font-mono text-[10px]">{diag.reason}</span>
                    </div>
                    {diag.provider && (
                      <div className="flex justify-between">
                        <span>Provider:</span>
                        <span className="font-mono text-[10px]">{diag.provider}</span>
                      </div>
                    )}
                    {diag.via && (
                      <div className="flex justify-between">
                        <span>Via:</span>
                        <span className="font-mono text-[10px]">{diag.via}</span>
                      </div>
                    )}
                    {diag.error && (
                      <div className="text-red-600 text-[10px] mt-1 break-words">
                        {diag.error.substring(0, 100)}
                        {diag.error.length > 100 ? '...' : ''}
                      </div>
                    )}
                    <div className="text-gray-400 text-[10px] mt-1">
                      {new Date(diag.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
