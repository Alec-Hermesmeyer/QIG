'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap, Sparkles, Home, Settings, FileText, User, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { useOrganizationSwitch } from '@/contexts/OrganizationSwitchContext';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { organization } = useAuth();
  const { canSwitchOrganizations } = useOrganizationSwitch();

  // Check localStorage for user preference on sidebar collapse state
  useEffect(() => {
    const storedState = localStorage.getItem('sidebar-collapsed');
    if (storedState !== null) {
      setIsCollapsed(storedState === 'true');
    }
  }, []);

  // Save collapse state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'FastRAG', href: '/fast-rag', icon: Sparkles },
    { name: 'DeepRAG', href: '/deep-rag', icon: Zap },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings }
  ];

  const navigationItems = [
    ...navItems,
    // QIG Internal Tools (only visible to QIG team members)
    ...(canSwitchOrganizations ? [
      {
        name: 'QIG Monitoring',
        href: '/admin/monitoring',
        icon: Monitor,
        description: 'System health and monitoring dashboard',
        badge: 'Internal'
      }
    ] : [])
  ];

  return (
    <motion.div
      className={cn(
        'flex flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 h-screen sticky top-0 z-30 transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
      animate={{ width: isCollapsed ? 64 : 256 }}
      initial={false}
    >
      {/* Logo area */}
      <div className="flex items-center h-14 px-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-bold text-lg truncate"
          >
            {organization?.name || 'Document Intelligence'}
          </motion.div>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleCollapse}
          className={cn(
            'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800', 
            isCollapsed ? 'ml-auto' : 'ml-auto'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </motion.button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 pt-4 pb-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={cn(
                    'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                    isCollapsed ? 'justify-center' : ''
                  )}
                >
                  <Icon size={18} className={isCollapsed ? '' : 'mr-3'} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Could add user info here */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-2 px-4">
        {!isCollapsed && (
          <div className="text-xs text-gray-500">
            {organization?.name ? `${organization.name} Assistant` : 'Intelligent Assistant'}
          </div>
        )}
      </div>
    </motion.div>
  );
}