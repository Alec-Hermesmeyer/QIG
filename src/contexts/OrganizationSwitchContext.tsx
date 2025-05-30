'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Use the same organization type as the auth context
interface Organization {
  id: string;
  name: string;
  created_at?: string;
}

interface OrganizationSwitchContextType {
  // Current active organization (what the user is "acting as")
  activeOrganization: Organization | null;
  
  // User's actual organization
  userOrganization: Organization | null;
  
  // Available organizations (all for QIG, just their own for others)
  availableOrganizations: Organization[];
  
  // Whether the user can switch organizations (QIG employees only)
  canSwitchOrganizations: boolean;
  
  // Function to switch organizations
  switchToOrganization: (organizationId: string) => void;
  
  // Function to reset to user's own organization
  resetToUserOrganization: () => void;
  
  // Loading states
  loading: boolean;
}

const OrganizationSwitchContext = createContext<OrganizationSwitchContextType | undefined>(undefined);

interface OrganizationSwitchProviderProps {
  children: ReactNode;
}

const ACTIVE_ORG_STORAGE_KEY = 'qig-active-organization';

export function OrganizationSwitchProvider({ children }: OrganizationSwitchProviderProps) {
  const { user, organization: authOrganization } = useAuth();
  
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [userOrganization, setUserOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to track loading state and prevent race conditions
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);

  // Check if user can switch organizations (QIG employees only)
  const canSwitchOrganizations = authOrganization?.name === 'QIG';

  // Handle window visibility changes to prevent stuck loading states
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && loadingRef.current) {
        // If we're stuck in loading when window becomes visible, reset it
        console.log('Window became visible, checking loading state...');
        setTimeout(() => {
          if (loadingRef.current && initializedRef.current) {
            console.log('Resetting stuck loading state');
            setLoading(false);
            loadingRef.current = false;
          }
        }, 1000); // Give 1 second for any pending operations
      }
    };

    const handleFocus = () => {
      // Similar handling for window focus
      if (loadingRef.current && initializedRef.current) {
        setTimeout(() => {
          if (loadingRef.current) {
            console.log('Window focused, resetting stuck loading state');
            setLoading(false);
            loadingRef.current = false;
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [authOrganization, user]);

  // Load persisted organization selection on mount
  useEffect(() => {
    if (canSwitchOrganizations && availableOrganizations.length > 0 && !initializedRef.current) {
      try {
        const savedOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
        if (savedOrgId) {
          const savedOrg = availableOrganizations.find(org => org.id === savedOrgId);
          if (savedOrg) {
            setActiveOrganization(savedOrg);
            console.log(`Restored saved organization: ${savedOrg.name}`);
            initializedRef.current = true;
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to load saved organization:', error);
      }
      
      // Fallback to user's organization if no valid saved org
      setActiveOrganization(authOrganization);
      initializedRef.current = true;
    }
  }, [canSwitchOrganizations, availableOrganizations, authOrganization]);

  const loadOrganizations = async () => {
    // Prevent multiple simultaneous loading attempts
    if (loadingRef.current) {
      console.log('Already loading organizations, skipping...');
      return;
    }

    try {
      setLoading(true);
      loadingRef.current = true;

      if (!authOrganization) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Set user's actual organization
      setUserOrganization(authOrganization);

      if (canSwitchOrganizations) {
        // QIG users can see and switch to all organizations
        const { data: orgs, error } = await supabase
          .from('organizations')
          .select('id, name, created_at')
          .order('name');

        if (error) {
          console.error('Error loading organizations:', error);
          setAvailableOrganizations([authOrganization]);
        } else {
          setAvailableOrganizations(orgs || []);
        }

        // Don't set activeOrganization here - let the persistence effect handle it
      } else {
        // Non-QIG users can only see their own organization
        setAvailableOrganizations([authOrganization]);
        setActiveOrganization(authOrganization);
        initializedRef.current = true;
      }
    } catch (error) {
      console.error('Error in loadOrganizations:', error);
      if (authOrganization) {
        setAvailableOrganizations([authOrganization]);
        setActiveOrganization(authOrganization);
        initializedRef.current = true;
      }
    } finally {
      // Use a small timeout to ensure state updates are processed
      setTimeout(() => {
        setLoading(false);
        loadingRef.current = false;
      }, 100);
    }
  };

  const switchToOrganization = (organizationId: string) => {
    if (!canSwitchOrganizations) {
      console.warn('User does not have permission to switch organizations');
      return;
    }

    const targetOrg = availableOrganizations.find(org => org.id === organizationId);
    if (targetOrg) {
      setActiveOrganization(targetOrg);
      
      // Persist the selection
      try {
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);
      } catch (error) {
        console.warn('Failed to save organization selection:', error);
      }
      
      console.log(`Switched to organization: ${targetOrg.name}`);
    } else {
      console.error('Target organization not found');
    }
  };

  const resetToUserOrganization = () => {
    if (userOrganization) {
      setActiveOrganization(userOrganization);
      
      // Clear the saved selection
      try {
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear saved organization:', error);
      }
      
      console.log(`Reset to user organization: ${userOrganization.name}`);
    }
  };

  const value: OrganizationSwitchContextType = {
    activeOrganization,
    userOrganization,
    availableOrganizations,
    canSwitchOrganizations,
    switchToOrganization,
    resetToUserOrganization,
    loading
  };

  return (
    <OrganizationSwitchContext.Provider value={value}>
      {children}
    </OrganizationSwitchContext.Provider>
  );
}

export function useOrganizationSwitch() {
  const context = useContext(OrganizationSwitchContext);
  if (context === undefined) {
    throw new Error('useOrganizationSwitch must be used within an OrganizationSwitchProvider');
  }
  return context;
} 