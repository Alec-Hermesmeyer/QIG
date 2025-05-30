import { useOrganizationSwitch } from '@/contexts/OrganizationSwitchContext';
import { useAuth } from '@/lib/auth/AuthContext';

export function useOrganizationAwareAPI() {
  const { activeOrganization, userOrganization, canSwitchOrganizations } = useOrganizationSwitch();
  const { organization: authOrganization } = useAuth();

  // Get the headers needed for organization-aware API calls
  const getAPIHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only add organization override if:
    // 1. User can switch organizations (QIG employee)
    // 2. They're acting as a different organization than their own
    if (canSwitchOrganizations && 
        activeOrganization && 
        activeOrganization.id !== userOrganization?.id) {
      headers['x-organization-override'] = activeOrganization.id;
      console.log(`Adding organization override header: ${activeOrganization.name} (${activeOrganization.id})`);
    }

    return headers;
  };

  // Enhanced fetch that automatically includes organization headers
  const organizationAwareFetch = async (url: string, options: RequestInit = {}) => {
    const apiHeaders = getAPIHeaders();
    
    const enhancedOptions: RequestInit = {
      ...options,
      headers: {
        ...apiHeaders,
        ...options.headers,
      },
    };

    console.log('Making organization-aware API call:', {
      url,
      userOrg: userOrganization?.name,
      activeOrg: activeOrganization?.name,
      isOverride: activeOrganization?.id !== userOrganization?.id
    });

    return fetch(url, enhancedOptions);
  };

  return {
    // Current organization context
    activeOrganization,
    userOrganization,
    canSwitchOrganizations,
    isActingAsOtherOrg: activeOrganization?.id !== userOrganization?.id,
    
    // API utilities
    getAPIHeaders,
    organizationAwareFetch,
    
    // Status info for debugging
    getContextInfo: () => ({
      userOrgId: userOrganization?.id,
      userOrgName: userOrganization?.name,
      activeOrgId: activeOrganization?.id,
      activeOrgName: activeOrganization?.name,
      canSwitch: canSwitchOrganizations,
      isOverride: activeOrganization?.id !== userOrganization?.id
    })
  };
} 