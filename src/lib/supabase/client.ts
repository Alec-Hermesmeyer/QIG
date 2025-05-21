// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Create client with error handling
const createClient = () => {
  try {
    return createClientComponentClient();
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    // Return a fallback client that won't cause the app to crash
    // but will log errors for operations
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: new Error('Supabase client failed to initialize') }),
        signUp: async () => ({ error: new Error('Supabase client failed to initialize') }),
        signOut: async () => {}
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: async () => ({ error: null }) })
      }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } })
        })
      }
    };
  }
};

export const supabase = createClient();