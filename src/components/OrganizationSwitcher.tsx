'use client';

import { useState } from 'react';
import { useOrganizationSwitch } from '@/contexts/OrganizationSwitchContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  Users, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export function OrganizationSwitcher() {
  const {
    activeOrganization,
    userOrganization,
    availableOrganizations,
    canSwitchOrganizations,
    switchToOrganization,
    resetToUserOrganization,
    loading
  } = useOrganizationSwitch();

  const [switching, setSwitching] = useState(false);

  // Don't show the switcher if user can't switch organizations
  if (!canSwitchOrganizations) {
    return null;
  }

  const handleOrganizationChange = async (organizationId: string) => {
    setSwitching(true);
    switchToOrganization(organizationId);
    
    // Add a small delay to show the switching state
    setTimeout(() => {
      setSwitching(false);
    }, 500);
  };

  const handleReset = () => {
    setSwitching(true);
    resetToUserOrganization();
    
    setTimeout(() => {
      setSwitching(false);
    }, 500);
  };

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-orange-600" />
            <span className="text-sm text-orange-700">Loading organizations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isActingAsOtherOrg = activeOrganization?.id !== userOrganization?.id;

  return (
    <Card className={`border-2 ${isActingAsOtherOrg ? 'border-orange-400 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Users className="h-4 w-4" />
          <span>Organization Switcher</span>
          <Badge variant="outline" className="text-xs">
            QIG Admin
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Switch between organizations for testing purposes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Your Organization:</span>
            <span className="text-xs font-mono">{userOrganization?.name}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Acting As:</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono">{activeOrganization?.name}</span>
              {isActingAsOtherOrg && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  Testing Mode
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Warning for testing mode */}
        {isActingAsOtherOrg && (
          <div className="flex items-start space-x-2 p-2 bg-orange-100 rounded-md border border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-700">
              <div className="font-medium">Testing Mode Active</div>
              <div>You're accessing data for {activeOrganization?.name}</div>
            </div>
          </div>
        )}

        {/* Organization Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">
            Switch to Organization:
          </label>
          <Select
            value={activeOrganization?.id || ''}
            onValueChange={handleOrganizationChange}
            disabled={switching}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {availableOrganizations.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-3 w-3" />
                    <span>{org.name}</span>
                    {org.id === userOrganization?.id && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        Your Org
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        {isActingAsOtherOrg && (
          <Button 
            onClick={handleReset}
            variant="outline" 
            size="sm" 
            className="w-full h-8 text-xs"
            disabled={switching}
          >
            {switching ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <Building2 className="h-3 w-3 mr-1" />
                Return to {userOrganization?.name}
              </>
            )}
          </Button>
        )}

        {switching && (
          <div className="text-xs text-center text-gray-500">
            Switching organizations...
          </div>
        )}
      </CardContent>
    </Card>
  );
} 