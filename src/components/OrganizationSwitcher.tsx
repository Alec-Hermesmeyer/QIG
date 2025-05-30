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
  const [justSwitched, setJustSwitched] = useState(false);

  // Don't show the switcher if user can't switch organizations
  if (!canSwitchOrganizations) {
    return null;
  }

  const handleOrganizationChange = async (organizationId: string) => {
    setSwitching(true);
    setJustSwitched(false);
    switchToOrganization(organizationId);
    
    // Add a small delay to show the switching state
    setTimeout(() => {
      setSwitching(false);
      setJustSwitched(true);
      // Clear the success message after 2 seconds
      setTimeout(() => setJustSwitched(false), 2000);
    }, 500);
  };

  const handleReset = () => {
    setSwitching(true);
    setJustSwitched(false);
    resetToUserOrganization();
    
    setTimeout(() => {
      setSwitching(false);
      setJustSwitched(true);
      setTimeout(() => setJustSwitched(false), 2000);
    }, 500);
  };

  if (loading) {
    return (
      <Card className="border-slate-300 bg-white/95 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-slate-700 font-medium">Loading organizations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isActingAsOtherOrg = activeOrganization?.id !== userOrganization?.id;

  return (
    <Card className={`border-2 shadow-lg backdrop-blur-sm ${
      isActingAsOtherOrg 
        ? 'border-orange-400 bg-orange-50/95' 
        : 'border-blue-300 bg-white/95'
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Users className="h-4 w-4 text-slate-700" />
          <span className="text-slate-800 font-semibold">Organization Switcher</span>
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
            QIG Admin
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs text-slate-600">
          Switch between organizations for testing purposes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Your Organization:</span>
            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">
              {userOrganization?.name}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Acting As:</span>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono px-2 py-1 rounded ${
                isActingAsOtherOrg 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {activeOrganization?.name}
              </span>
              {isActingAsOtherOrg && (
                <Badge variant="destructive" className="text-xs px-2 py-0.5 bg-red-100 text-red-800 border-red-200">
                  Testing Mode
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Warning for testing mode */}
        {isActingAsOtherOrg && (
          <div className="flex items-start space-x-2 p-3 bg-orange-100 rounded-lg border border-orange-300">
            <AlertTriangle className="h-4 w-4 text-orange-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-800">
              <div className="font-semibold">Testing Mode Active</div>
              <div className="text-orange-700">You're accessing data for {activeOrganization?.name}</div>
            </div>
          </div>
        )}

        {/* Organization Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">
            Switch to Organization:
          </label>
          <Select
            value={activeOrganization?.id || ''}
            onValueChange={handleOrganizationChange}
            disabled={switching}
          >
            <SelectTrigger className="h-9 text-xs bg-white border-slate-300 text-slate-800 hover:border-slate-400 focus:border-blue-500">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              {availableOrganizations.map((org) => (
                <SelectItem 
                  key={org.id} 
                  value={org.id} 
                  className="text-xs hover:bg-slate-50 focus:bg-blue-50 text-slate-800"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-3 w-3 text-slate-600" />
                    <span>{org.name}</span>
                    {org.id === userOrganization?.id && (
                      <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
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
            className="w-full h-9 text-xs bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400"
            disabled={switching}
          >
            {switching ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <Building2 className="h-3 w-3 mr-2" />
                Return to {userOrganization?.name}
              </>
            )}
          </Button>
        )}

        {switching && (
          <div className="text-xs text-center text-slate-600 bg-slate-50 py-2 rounded">
            Switching organizations...
          </div>
        )}

        {justSwitched && !switching && (
          <div className="text-xs text-center text-green-700 bg-green-50 py-2 rounded border border-green-200">
            ✓ Successfully switched to {activeOrganization?.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 