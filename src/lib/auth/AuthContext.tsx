// lib/auth/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { getOrganizationLogoUrl } from '@/lib/supabase/storage';

// Define organization type
interface Organization {
  id: string;
  name: string;
  logo_url?: string | null;
  theme_color?: string;
}

// Define profile type
interface Profile {
  id: string;
  organization_id: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  organizationLogo: string;
  isLoading: boolean;
  isQIGOrganization: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, organizationName: string) => Promise<{ error: any, user: any }>;
  signOut: () => Promise<void>;
  getUsersInOrganization: () => Promise<{ data: Profile[] | null, error: any }>;
  getAllUsers: () => Promise<{ data: any[] | null, error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationLogo, setOrganizationLogo] = useState<string>('/defaultLogo.png');
  const [isLoading, setIsLoading] = useState(true);
  const [isQIGOrganization, setIsQIGOrganization] = useState(false);
  const router = useRouter();

 // Fetch profile and organization data
 const fetchUserData = async (userId: string) => {
  // Get profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return;
  }

  setProfile(profileData);

  // If profile has an organization, fetch it
  if (profileData.organization_id) {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profileData.organization_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return;
    }

    setOrganization(orgData);
    
    // Use our API route for organization logo
    if (orgData.id) {
      setOrganizationLogo(`/api/org-logo/${orgData.id}`);
    } else {
      setOrganizationLogo('/defaultLogo.png');
    }
    
    // Check if this is the QIG organization
    const isQIG = orgData.name === 'QIG';
    setIsQIGOrganization(isQIG);
  }
};

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
      }
      
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
          setOrganizationLogo('/defaultLogo.png');
          setIsQIGOrganization(false);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    // If successful login, redirect to main page
    if (!error) {
      router.push('/');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, organizationName: string) => {
    // First sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      return { error, user: null };
    }

    // Create or get organization
    let organizationId: string;
    
    // Check if organization exists
    const { data: existingOrg, error: orgFetchError } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', organizationName)
      .single();

    if (orgFetchError || !existingOrg) {
      // Create new organization
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert([{ name: organizationName }])
        .select('id')
        .single();

      if (createOrgError || !newOrg) {
        return { error: createOrgError, user: data.user };
      }

      organizationId = newOrg.id;
    } else {
      organizationId = existingOrg.id;
    }

    // Create profile with organization link
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        organization_id: organizationId,
      }]);

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    return { error, user: data.user };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Get all users in the same organization
  const getUsersInOrganization = async () => {
    if (!organization) {
      return { data: null, error: new Error('No organization found') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organization.id);

    return { data, error };
  };
  
  // Get all users (for QIG organization only)
  const getAllUsers = async () => {
    if (!isQIGOrganization) {
      return { data: null, error: new Error('Not authorized to view all users') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, organizations(name)');

    return { data, error };
  };

  const value = {
    user,
    session,
    profile,
    organization,
    organizationLogo,
    isLoading,
    isQIGOrganization,
    signIn,
    signUp,
    signOut,
    getUsersInOrganization,
    getAllUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}