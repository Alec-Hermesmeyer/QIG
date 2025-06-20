import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    organization: {
      id: string;
      name: string;
    };
  };
  error?: string;
}

class AuthService {
  private static instance: AuthService;
  private supabase = createClientComponentClient();

  private constructor() {
    // No need for localStorage initialization since Supabase handles persistence
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Login failed - no user data'
        };
      }

      // Get user's organization
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('organization_id, organizations!inner(name)')
        .eq('id', data.user.id)
        .single();

      const user = {
        id: data.user.id,
        email: data.user.email!,
        organization: {
          id: profile?.organization_id || '',
          name: (profile?.organizations as any)?.name || 'Unknown'
        }
      };

      return {
        success: true,
        token: data.session.access_token,
        user
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }

  public async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  public async getToken(): Promise<string | null> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  public async getUser(): Promise<any> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) return null;

      // Get user's organization
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('organization_id, organizations!inner(name)')
        .eq('id', session.user.id)
        .single();

      return {
        id: session.user.id,
        email: session.user.email,
        organization: {
          id: profile?.organization_id || '',
          name: (profile?.organizations as any)?.name || 'Unknown'
        }
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
}

export const authService = AuthService.getInstance(); 