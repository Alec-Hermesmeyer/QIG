/**
 * Authentication service for connecting to the Python backend
 */

// Track authentication state
let isAuthenticated = false;
let accessToken: string | null = null;
let userInfo: any = null;

/**
 * Initialize the auth service
 */
export async function initializeAuth() {
  // Check for existing token
  if (localStorage.getItem('auth_token')) {
    try {
      // Get the token
      const token = localStorage.getItem('auth_token');
      const isValid = await validateToken(token);
      
      if (isValid) {
        isAuthenticated = true;
        accessToken = token;
        
        // Try to get user info if available
        try {
          const userInfoStr = localStorage.getItem('user_info');
          if (userInfoStr) {
            userInfo = JSON.parse(userInfoStr);
          }
        } catch (e) {
          console.warn('Failed to parse user info from localStorage');
        }
        
        console.log('Auth restored from localStorage');
        return true;
      } else {
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
      }
    } catch (error) {
      console.error('Failed to validate stored token:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
  }
  
  // Check if we have a valid session with the backend
  try {
    const sessionValid = await checkSession();
    if (sessionValid) {
      isAuthenticated = true;
      return true;
    }
  } catch (error) {
    console.error('Failed to check session:', error);
  }
  
  return isAuthenticated;
}

/**
 * Check if we have a valid session with the backend
 */
async function checkSession(): Promise<boolean> {
  try {
    // Check if we have a valid session with the backend
    const response = await fetch('/auth_setup', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // If we have a clientId and no login is required, we can proceed
      if (data.clientId) {
        // If we have an authenticated user token already, we're good
        if (localStorage.getItem('auth_token')) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Session check error:', error);
    return false;
  }
}

/**
 * Validate a token
 */
async function validateToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  
  try {
    // Make a request to test the token by getting the list of files
    const response = await fetch('/list_uploaded', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Login through the backend service - opens a popup for Azure AD authentication
 */
export async function login(): Promise<any | null> {
  try {
    console.log('Attempting to login through backend service');
    
    // Open a popup window for the login page
    const loginWindow = window.open('/api/auth/login', 'Login', 'width=600,height=700');
    
    if (!loginWindow) {
      throw new Error('Popup window blocked. Please allow popups for this site.');
    }
    
    // Poll the window to check when it's closed
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(async () => {
        try {
          // Check if the popup window has been closed
          if (loginWindow.closed) {
            clearInterval(checkClosed);
            
            // After the window is closed, try to verify if we're authenticated
            const response = await fetch('/list_uploaded', {
              method: 'GET',
              credentials: 'include'
            });
            
            if (response.ok) {
              console.log('Login successful');
              isAuthenticated = true;
              
              // Get the data from the list_uploaded call
              const fileList = await response.json();
              console.log('Files:', fileList);
              
              // Save auth state
              localStorage.setItem('auth_token', 'authenticated');
              
              resolve({
                success: true,
                files: fileList
              });
            } else {
              console.log('Login failed after popup closed');
              reject(new Error('Login failed after popup closed'));
            }
          }
        } catch (error) {
          console.error('Error checking login status:', error);
        }
      }, 1000);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        reject(new Error('Login timed out'));
      }, 120000);
    });
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
}

/**
 * Get the list of uploaded files from the backend
 */
export async function listUploadedFiles(): Promise<string[]> {
  try {
    const response = await fetch('/list_uploaded', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get uploaded files: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing uploaded files:', error);
    throw error;
  }
}

/**
 * Logout from the backend
 */
export async function logout() {
  try {
    // Clear local state
    isAuthenticated = false;
    accessToken = null;
    userInfo = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    
    // Call the logout endpoint if available
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('Error logging out from backend:', e);
    }
    
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

/**
 * Check if the user is authenticated
 */
export function checkAuthenticated(): boolean {
  return isAuthenticated;
}

/**
 * Get user information
 */
export function getUserInfo(): any {
  return userInfo;
}

// Export authentication state
export { isAuthenticated };