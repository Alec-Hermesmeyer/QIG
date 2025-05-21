// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Create client with the default configuration - should use cookies by default
export const supabase = createClientComponentClient();

// Export a method to help check if we have a session on the client side
export const checkSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error checking session:', error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('Failed to check session:', err);
    return null;
  }
};

// Helper function to clear all auth data (for troubleshooting)
export const clearAuthData = () => {
  if (typeof window === 'undefined') return;
  
  // Clear Supabase auth data
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('supabase.auth.expires_at');
  localStorage.removeItem('supabase.auth.refresh_token');
  
  // Reload the page to ensure everything is reset
  window.location.reload();
};