// components/OrganizationSettings.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const colorOptions = [
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Blue', value: 'bg-blue-600' },
  { name: 'Green', value: 'bg-green-600' },
  { name: 'Purple', value: 'bg-purple-600' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Emerald', value: 'bg-emerald-500' },
  { name: 'Indigo', value: 'bg-indigo-600' },
  { name: 'Rose', value: 'bg-rose-600' },
  { name: 'Slate', value: 'bg-slate-700' },
];

export function OrganizationSettings() {
  const { user, organization, isQIGOrganization } = useAuth();
  const [name, setName] = useState('');
  const [themeColor, setThemeColor] = useState('bg-red-500');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load organization data on component mount
  useEffect(() => {
    if (organization) {
      setName(organization.name || '');
      setThemeColor(organization.theme_color || 'bg-red-500');
      
      // If there's a logo URL, set it as the preview
      if (organization.logo_url) {
        setLogoPreview(organization.logo_url);
      }
      
      setIsLoading(false);
    }
  }, [organization]);

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setLogo(file);

    // Clean up preview URL when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  };

  // Handle theme color selection
  const handleColorChange = async (color: string) => {
    setThemeColor(color);
  };

  // Handle saving all settings
  const handleSaveSettings = async () => {
    if (!organization) return;
    
    setIsSaving(true);
    
    try {
      let logoUrl = organization.logo_url;
      
      // Upload logo if a new one was selected
      if (logo) {
        setIsUploading(true);
        
        // Create a unique filename for the logo
        const fileExt = logo.name.split('.').pop();
        const fileName = `${organization.id}/logo-${Date.now()}.${fileExt}`;
        
        // Upload to Supabase storage
        const { data, error: uploadError } = await supabase.storage
          .from('organization-logos')
          .upload(fileName, logo, {
            upsert: true,
            cacheControl: '3600',
          });
        
        if (uploadError) throw uploadError;
        
        // Get the public URL of the uploaded logo
        const { data: urlData } = supabase.storage
          .from('organization-logos')
          .getPublicUrl(fileName);
        
        logoUrl = urlData.publicUrl;
        setIsUploading(false);
      }
      
      // Update organization record with all changes
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: name,
          theme_color: themeColor,
          logo_url: logoUrl,
        })
        .eq('id', organization.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated successfully.",
      });
      
      // Note: The AuthContext would need a refresh method to update the UI immediately
      // without requiring a page reload. You might need to add this functionality.
      
    } catch (error) {
      console.error('Error saving organization settings:', error);
      toast({
        title: "Error saving settings",
        description: "There was an error saving your organization settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading organization settings...</div>;
  }

  // Only allow QIG or organization admins to access this page
  if (!organization || (!isQIGOrganization && !user)) {
    return <div className="flex justify-center py-8">You don't have permission to access these settings.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Organization Settings</h1>
      
      <div className="space-y-8">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization Name</Label>
          <Input
            id="orgName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        {/* Organization Logo */}
        <div className="space-y-4">
          <Label>Organization Logo</Label>
          <div className="flex items-start gap-6">
            <div className="bg-gray-100 rounded-lg overflow-hidden w-32 h-32 flex items-center justify-center">
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Logo Preview" 
                  className="max-w-full max-h-full object-contain"
                  onError={() => setLogoPreview('/defaultLogo.png')}
                />
              ) : (
                <div className="text-gray-400 text-sm text-center p-4">
                  No logo uploaded
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload New Logo'}
              </Button>
              <p className="text-sm text-gray-500">
                Recommended size: 200x50px. PNG or JPG format.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
        
        {/* Theme Color Selection */}
        <div className="space-y-4">
          <Label>Theme Color</Label>
          <div className="flex flex-wrap gap-3">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                className={`w-10 h-10 rounded-full ${color.value} border-2 
                  ${themeColor === color.value ? 'border-black ring-2 ring-offset-2' : 'border-gray-300'}`}
                onClick={() => handleColorChange(color.value)}
                disabled={isSaving}
                title={color.name}
                aria-label={`Set theme color to ${color.name}`}
              />
            ))}
          </div>
          <div className="mt-2">
            <div 
              className={`h-10 w-full max-w-md rounded ${themeColor} px-4 py-2 text-white font-medium`}
            >
              Preview of your selected color
            </div>
          </div>
        </div>
        
        {/* Advanced Settings (QIG Only) */}
        {isQIGOrganization && (
          <div className="space-y-4 border-t pt-6 mt-6">
            <h2 className="text-xl font-semibold">Advanced Settings (QIG Admin)</h2>
            <p className="text-sm text-gray-600">
              As a QIG administrator, you have access to additional configuration options.
            </p>
            
            {/* Additional QIG-specific settings could go here */}
          </div>
        )}
        
        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving || isUploading}
            className={`${themeColor} text-white hover:opacity-90`}
          >
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OrganizationSettings;