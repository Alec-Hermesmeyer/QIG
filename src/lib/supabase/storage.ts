// lib/supabase/storage.ts
import { supabase } from './client';

export const LOGOS_BUCKET = 'organization-logos';

export const uploadOrganizationLogo = async (
  organizationId: string,
  file: File
): Promise<{ data: { path: string } | null; error: any }> => {
  // Create a unique file path using the organization ID
  const filePath = `${organizationId.toString()}/${file.name}`;
  
  const { data, error } = await supabase.storage
    .from(LOGOS_BUCKET)
    .upload(filePath, file, {
      upsert: true,
    });
    
  return { data, error };
};

export const getOrganizationLogoUrl = (path: string | null): string => {
  if (!path) return '/defaultLogo.png'; // Fallback to a default logo
  
  const { data } = supabase.storage
    .from(LOGOS_BUCKET)
    .getPublicUrl(path);
    
  return data.publicUrl;
};