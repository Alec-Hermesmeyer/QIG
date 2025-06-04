'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Package, 
  Shield, 
  ChevronDown, 
  ChevronUp,
  Monitor,
  Wrench,
  Activity,
  Settings,
  ArrowRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { getToolbarRoutes, type AdminRoute } from '@/lib/adminRoutes';

// Icon mapping for different routes
const getIconForRoute = (path: string) => {
  if (path.includes('services')) return <Package className="w-5 h-5" />;
  if (path.includes('monitoring')) return <Monitor className="w-5 h-5" />;
  return <Settings className="w-5 h-5" />;
};

export default function QIGAdminToolbar() {
  const { isQIGOrganization, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if not QIG organization or still loading
  if (isLoading || !isQIGOrganization) {
    return null;
  }

  // Get only the routes that should show in toolbar
  const availableRoutes = getToolbarRoutes();
  const currentTool = availableRoutes.find(route => pathname.startsWith(route.path));

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* Collapsed Toolbar Button */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={() => setIsExpanded(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 h-auto"
            >
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4" />
                <span className="font-medium">QIG Admin</span>
                {currentTool && (
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30 text-xs">
                    {currentTool.name.includes('Service') ? 'Services' : 'Monitor'}
                  </Badge>
                )}
                <ChevronDown className="w-4 h-4" />
              </div>
            </Button>
          </motion.div>
        )}

        {/* Expanded Toolbar Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 right-0"
            >
              <Card className="w-[700px] max-w-[90vw] shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">QIG Admin</h3>
                        <p className="text-sm text-blue-100">
                          Internal tools & monitoring
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(false)}
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Tools */}
                <CardContent className="p-5">
                  <div className="space-y-3">
                    {availableRoutes.map((route) => {
                      const isActive = pathname.startsWith(route.path);
                      
                      return (
                        <motion.div
                          key={route.path}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="ghost"
                            onClick={() => handleNavigation(route.path)}
                            className={`w-full justify-between h-auto p-4 text-left transition-all duration-200 group rounded-lg ${
                              isActive 
                                ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm' 
                                : 'hover:bg-gray-50 hover:shadow-sm border border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                                isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                              }`}>
                                {getIconForRoute(route.path)}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-semibold text-base truncate">{route.name}</span>
                                  {route.version && (
                                    <Badge variant="outline" className="text-xs h-5 px-2 flex-shrink-0">
                                      v{route.version}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 leading-snug">
                                  {route.description}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className={`w-5 h-5 transition-transform flex-shrink-0 ml-2 ${
                              isActive ? 'text-blue-500 transform translate-x-0.5' : 'text-gray-400 group-hover:text-gray-600 group-hover:transform group-hover:translate-x-0.5'
                            }`} />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>

                {/* Footer */}
                <div className="border-t bg-gray-50 px-5 py-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="font-medium">QIG Internal Tools</span>
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-semibold">Online</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 