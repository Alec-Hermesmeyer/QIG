'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, AlertCircle, CheckCircle, X, BarChart3, Clock, Zap } from 'lucide-react';
import { MigrationResult } from '@/services/chatHistoryMigration';

interface MigrationPromptProps {
  isVisible: boolean;
  onMigrate: () => Promise<MigrationResult>;
  onDismiss: () => void;
  isInProgress: boolean;
}

export const MigrationPrompt: React.FC<MigrationPromptProps> = ({
  isVisible,
  onMigrate,
  onDismiss,
  isInProgress
}) => {
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleMigrate = async () => {
    const result = await onMigrate();
    setMigrationResult(result);
  };

  const benefits = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Better Performance",
      description: "Asynchronous operations won't block your chat interface"
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "More Storage",
      description: "Store hundreds of chat sessions without running out of space"
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Advanced Features",
      description: "Search, statistics, and automatic cleanup capabilities"
    }
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Upgrade Your Chat Storage
              </h2>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Migration Result */}
          {migrationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              {migrationResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Migration Successful!</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Migrated {migrationResult.migratedSessions} chat sessions and{' '}
                    {migrationResult.migratedMessages} messages to the new storage system.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Migration Issues</span>
                  </div>
                  <div className="text-red-700 text-sm space-y-1">
                    {migrationResult.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Benefits */}
          {!migrationResult && (
            <>
              <p className="text-gray-600 mb-6">
                We've improved chat history storage to provide better performance and reliability. 
                Your existing chat history can be automatically migrated.
              </p>

              <div className="space-y-3 mb-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-blue-600 mt-0.5">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{benefit.title}</h3>
                      <p className="text-sm text-gray-600">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-800 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium text-sm">Important</span>
                </div>
                <p className="text-blue-700 text-sm">
                  Your original chat history will be safely backed up during migration.
                  This process typically takes just a few seconds.
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!migrationResult ? (
              <>
                <button
                  onClick={handleMigrate}
                  disabled={isInProgress}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                           text-white font-medium py-2 px-4 rounded-lg transition-colors
                           flex items-center justify-center gap-2"
                >
                  {isInProgress ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Migrate Now
                    </>
                  )}
                </button>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Maybe Later
                </button>
              </>
            ) : (
              <button
                onClick={onDismiss}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            )}
          </div>

          {/* Technical Details Toggle */}
          {!migrationResult && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showDetails ? 'Hide' : 'Show'} technical details
              </button>
            </div>
          )}

          {/* Technical Details */}
          <AnimatePresence>
            {showDetails && !migrationResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="text-xs text-gray-600 space-y-2">
                  <p>
                    <strong>Current:</strong> localStorage (limited to ~5-10MB, synchronous operations)
                  </p>
                  <p>
                    <strong>New:</strong> IndexedDB (hundreds of MB, asynchronous, better performance)
                  </p>
                  <p>
                    <strong>Migration:</strong> Copies data to IndexedDB, creates backup in localStorage
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 