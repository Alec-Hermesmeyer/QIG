'use client';

import { useState } from 'react';
import { RefreshCw, PaintBucket } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';

// Common theme colors for organizations
const themeColors = [
  { name: 'Blue', value: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'Red', value: 'bg-red-500', hex: '#ef4444' },
  { name: 'Green', value: 'bg-green-500', hex: '#22c55e' },
  { name: 'Purple', value: 'bg-purple-500', hex: '#a855f7' },
  { name: 'Orange', value: 'bg-orange-500', hex: '#f97316' },
  { name: 'Teal', value: 'bg-teal-500', hex: '#14b8a6' },
  { name: 'Indigo', value: 'bg-indigo-500', hex: '#6366f1' },
  { name: 'Pink', value: 'bg-pink-500', hex: '#ec4899' },
];

interface CreateOrganizationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}

export default function CreateOrganizationDialog({ 
  isOpen, 
  onOpenChange, 
  onSuccess 
}: CreateOrganizationDialogProps) {
  // Form state
  const [name, setName] = useState('');
  const [themeColor, setThemeColor] = useState('bg-red-500');
  const [isCreating, setIsCreating] = useState(false);
  
  // Default logo URL - adjust to match your storage setup
  const defaultLogoUrl = "https://toyvsnymdhiwnywkbufd.supabase.co/storage/v1/object/public/organization-logos/default-logo.png";
  
  // Reset form on close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
      setThemeColor('bg-red-500');
    }
    onOpenChange(open);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter a name for the organization.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    try {
      // Log what we're trying to create
      console.log("Creating organization with data:", {
        name: name.trim(),
        logo_url: defaultLogoUrl,
        theme_color: themeColor
      });
      
      // First check if organization name already exists
      const { data: existingOrg, error: checkError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', name.trim())
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking for existing organization:", checkError);
        throw checkError;
      }
      
      if (existingOrg) {
        throw new Error("An organization with this name already exists");
      }
      
      // Create organization with required fields - excluding is_qig which doesn't exist
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          logo_url: defaultLogoUrl,
          theme_color: themeColor
        })
        .select();
        
      console.log("Supabase response:", { data, error });
      
      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No data returned from insert operation");
      }
      
      // Refresh data
      await onSuccess();
      
      toast({
        title: "Organization created",
        description: `"${name}" has been created successfully.`,
        variant: "success"
      });
      
      // Close dialog
      handleOpenChange(false);
    } catch (error) {
      console.error('Detailed error creating organization:', error);
      
      // Generate a helpful error message
      let errorMessage = "There was a problem creating the organization.";
      
      if (error instanceof Error) {
        if (error.message.includes("duplicate key") || 
            error.message.includes("already exists")) {
          errorMessage = "An organization with this name already exists.";
        } else if (error.message.includes("violates not-null constraint")) {
          errorMessage = "Missing required fields. Please contact an administrator.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Creation failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Add a new organization to the system
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="orgName">
              Organization Name*
            </Label>
            <Input
              id="orgName"
              placeholder="Enter organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          {/* Theme Color Selection */}
          <div className="space-y-3">
            <Label className="block">
              Organization Theme Color
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {themeColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`h-10 rounded-md border-2 transition-all ${
                    themeColor === color.value
                      ? 'border-black scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => setThemeColor(color.value)}
                  title={color.name}
                >
                  {themeColor === color.value && (
                    <PaintBucket className="h-4 w-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              This color will be used for the organization's branding
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <span className="mr-2">Creating...</span>
                <RefreshCw className="h-4 w-4 animate-spin" />
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}