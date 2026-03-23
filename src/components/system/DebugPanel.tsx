/**
 * Debug Panel
 * 
 * Mobile-accessible debug panel for viewing logs and app state.
 * Accessible via shake gesture or hidden button.
 */

import { useState, useEffect } from 'react';
import { X, Download, Trash2, AlertCircle, AlertTriangle, Info, Bug, Filter, Copy, CheckCircle2 } from 'lucide-react';
import { 
  getLogs, 
  clearLogs, 
  exportLogs, 
  exportLogsAsText, 
  setLogLevel, 
  getLogLevel,
  getErrorCounts,
  type ErrorLog,
  type LogLevel,
} from '../../lib/errorLogger';
import { getHealthState } from '../../lib/connectionHealth';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatusContext } from '../../contexts/NetworkStatusContext';
import { BottomSheet } from '../shared/BottomSheet';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [logLevel, setLogLevelState] = useState<LogLevel>(getLogLevel());
  
  const { user } = useAuth();
  const { isOnline } = useNetworkStatusContext();
  const healthState = getHealthState();

  useEffect(() => {
    if (isOpen) {
      refreshLogs();
      // Refresh logs every 2 seconds while panel is open
      const interval = setInterval(refreshLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const refreshLogs = () => {
    const allLogs = getLogs();
    setLogs(filter === 'all' 
      ? allLogs 
      : allLogs.filter(log => log.level === filter)
    );
  };

  useEffect(() => {
    refreshLogs();
  }, [filter]);

  const handleClearLogs = () => {
    if (confirm('Clear all logs? This cannot be undone.')) {
      clearLogs();
      refreshLogs();
    }
  };

  const handleExportJSON = () => {
    const json = exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    const text = exportLogsAsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLog = (log: ErrorLog) => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogLevelChange = (level: LogLevel) => {
    setLogLevel(level);
    setLogLevelState(level);
  };

  const errorCounts = getErrorCounts();

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return AlertCircle;
      case 'warn': return AlertTriangle;
      case 'info': return Info;
      case 'debug': return Bug;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'debug': return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Debug Panel"
      maxHeight="90vh"
    >
      <div className="p-4 space-y-4">
        {/* App State Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 mb-2">App State</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">User:</span>{' '}
              <span className="font-medium">{user?.email || 'Not logged in'}</span>
            </div>
            <div>
              <span className="text-gray-600">Network:</span>{' '}
              <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Connection:</span>{' '}
              <span className={`font-medium ${
                healthState.isHealthy ? 'text-green-600' : 'text-red-600'
              }`}>
                {healthState.status}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Retry Attempts:</span>{' '}
              <span className="font-medium">{healthState.retryAttempts}</span>
            </div>
          </div>
        </div>

        {/* Log Level Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Log Level:</span>
          {(['error', 'warn', 'info', 'debug'] as LogLevel[]).map(level => (
            <button
              key={level}
              onClick={() => handleLogLevelChange(level)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                logLevel === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Error Counts */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <AlertCircle size={16} className="text-red-600" />
            <span className="font-medium text-red-600">{errorCounts.error}</span>
            <span className="text-gray-600">errors</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle size={16} className="text-yellow-600" />
            <span className="font-medium text-yellow-600">{errorCounts.warn}</span>
            <span className="text-gray-600">warnings</span>
          </div>
          <div className="text-gray-600">
            {errorCounts.total} total logs
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {(['all', 'error', 'warn', 'info', 'debug'] as const).map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level === 'all' ? 'All' : level}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Export JSON
          </button>
          <button
            onClick={handleExportText}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Export Text
          </button>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Clear Logs
          </button>
        </div>

        {/* Logs List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs found
            </div>
          ) : (
            logs.map(log => {
              const Icon = getLevelIcon(log.level);
              const colorClass = getLevelColor(log.level);
              
              return (
                <div
                  key={log.id}
                  className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${colorClass}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{log.message}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  {log.context?.component && (
                    <div className="text-xs text-gray-600 mt-1">
                      Component: {log.context.component}
                      {log.context.action && ` | Action: ${log.context.action}`}
                    </div>
                  )}
                  
                  {log.error && (
                    <div className="text-xs text-red-700 mt-1 font-mono truncate">
                      {log.error.name}: {log.error.message}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Log Detail - Show in main panel when selected */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-[10001] flex items-end md:items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-t-xl md:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Timestamp:</span>
                <span className="text-sm font-medium">{formatTimestamp(selectedLog.timestamp)}</span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Message:</span>
                <p className="mt-1 text-sm bg-gray-50 p-2 rounded border">{selectedLog.message}</p>
              </div>

              {selectedLog.error && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Error:</span>
                  <div className="mt-1 text-sm bg-red-50 p-2 rounded border border-red-200">
                    <div className="font-medium text-red-900">{selectedLog.error.name}</div>
                    <div className="text-red-700 mt-1">{selectedLog.error.message}</div>
                    {selectedLog.error.stack && (
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap font-mono overflow-x-auto">
                        {selectedLog.error.stack}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Context:</span>
                  <pre className="mt-1 text-xs bg-gray-50 p-2 rounded border font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              )}

              <button
                onClick={() => handleCopyLog(selectedLog)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium min-h-[44px]"
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Log
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

