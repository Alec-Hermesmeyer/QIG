'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export function OrganizationSwitchProvider({ children }: OrganizationSwitchProviderProps) {
  const { user, organization: authOrganization } = useAuth();
  
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [userOrganization, setUserOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user can switch organizations (QIG employees only)
  const canSwitchOrganizations = authOrganization?.name === 'QIG';

  useEffect(() => {
    loadOrganizations();
  }, [authOrganization, user]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);

      if (!authOrganization) {
        setLoading(false);
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

        // Default to user's own organization initially
        setActiveOrganization(authOrganization);
      } else {
        // Non-QIG users can only see their own organization
        setAvailableOrganizations([authOrganization]);
        setActiveOrganization(authOrganization);
      }
    } catch (error) {
      console.error('Error in loadOrganizations:', error);
      if (authOrganization) {
        setAvailableOrganizations([authOrganization]);
        setActiveOrganization(authOrganization);
      }
    } finally {
      setLoading(false);
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
      console.log(`Switched to organization: ${targetOrg.name}`);
    } else {
      console.error('Target organization not found');
    }
  };

  const resetToUserOrganization = () => {
    if (userOrganization) {
      setActiveOrganization(userOrganization);
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