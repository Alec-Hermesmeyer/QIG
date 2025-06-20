import { NextRequest, NextResponse } from 'next/server';

interface VoiceControlRequest {
  command: string;
  parameters?: Record<string, any>;
  confidence?: number;
  timestamp?: string;
}

interface VoiceControlResponse {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Add CORS headers to allow requests from voice service
    const headers = {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    const body: VoiceControlRequest = await request.json();
    const { command, parameters = {}, confidence } = body;

    console.log('Voice control command received:', { command, parameters, confidence });

    // Route commands based on their type
    let response: VoiceControlResponse;

    switch (command.toLowerCase()) {
      case 'open':
        response = await handleOpenCommand(parameters);
        break;
      
      case 'close':
        response = await handleCloseCommand(parameters);
        break;
      
      case 'navigate':
        response = await handleNavigateCommand(parameters);
        break;
      
      case 'click':
        response = await handleClickCommand(parameters);
        break;
      
      case 'minimize':
        response = await handleMinimizeCommand(parameters);
        break;
      
      case 'maximize':
        response = await handleMaximizeCommand(parameters);
        break;
      
      case 'search':
        response = await handleSearchCommand(parameters);
        break;
      
      case 'scroll':
        response = await handleScrollCommand(parameters);
        break;
      
      case 'refresh':
        response = await handleRefreshCommand(parameters);
        break;
      
      default:
        response = {
          success: false,
          message: `Unknown command: ${command}`,
          error: 'UNKNOWN_COMMAND'
        };
    }

    return new NextResponse(JSON.stringify(response), {
      status: response.success ? 200 : 400,
      headers
    });

  } catch (error) {
    console.error('Error processing voice control command:', error);
    
    const errorResponse: VoiceControlResponse = {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return new NextResponse(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Content-Type': 'application/json',
      }
    });
  }
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Command handlers
async function handleOpenCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  const { application, section, service } = parameters;
  
  if (service) {
    // Open specific service (contract-analyst, open-records, insurance-broker)
    return {
      success: true,
      message: `Opening ${service} service`,
      action: 'NAVIGATE',
      data: { 
        url: `/${service}`,
        service: service
      }
    };
  }
  
  if (application) {
    // Handle opening specific applications or sections
    const appRoutes: Record<string, string> = {
      'contract analyst': '/contract-analyst',
      'open records': '/open-records', 
      'insurance broker': '/insurance-broker',
      'dashboard': '/dashboard',
      'settings': '/settings',
      'profile': '/profile'
    };
    
    const route = appRoutes[application.toLowerCase()];
    if (route) {
      return {
        success: true,
        message: `Opening ${application}`,
        action: 'NAVIGATE',
        data: { url: route }
      };
    }
  }
  
  return {
    success: false,
    message: `Cannot open "${application || 'unknown'}". Available options: Contract Analyst, Open Records, Insurance Broker, Dashboard, Settings, Profile`,
    error: 'INVALID_APPLICATION'
  };
}

async function handleCloseCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  const { modal, panel, section } = parameters;
  
  return {
    success: true,
    message: `Closing ${modal || panel || section || 'current view'}`,
    action: 'CLOSE',
    data: { 
      target: modal || panel || section || 'current'
    }
  };
}

async function handleNavigateCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  const { to, page, section } = parameters;
  const target = to || page || section;
  
  if (!target) {
    return {
      success: false,
      message: 'Navigation target not specified',
      error: 'MISSING_TARGET'
    };
  }
  
  // Map common navigation terms to routes
  const navigationRoutes: Record<string, string> = {
    'home': '/',
    'dashboard': '/dashboard',
    'contract analyst': '/contract-analyst',
    'open records': '/open-records',
    'insurance broker': '/insurance-broker',
    'settings': '/settings',
    'profile': '/profile',
    'help': '/help',
    'docs': '/docs',
    'documentation': '/docs'
  };
  
  const route = navigationRoutes[target.toLowerCase()];
  if (route) {
    return {
      success: true,
      message: `Navigating to ${target}`,
      action: 'NAVIGATE',
      data: { url: route }
    };
  }
  
  return {
    success: false,
    message: `Cannot navigate to "${target}". Available pages: ${Object.keys(navigationRoutes).join(', ')}`,
    error: 'INVALID_NAVIGATION_TARGET'
  };
}

async function handleClickCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  const { element, button, link } = parameters;
  const target = element || button || link;
  
  if (!target) {
    return {
      success: false,
      message: 'Click target not specified',
      error: 'MISSING_TARGET'
    };
  }
  
  return {
    success: true,
    message: `Clicking ${target}`,
    action: 'CLICK',
    data: { 
      target: target,
      selector: `[data-voice-command="${target.toLowerCase()}"], button:contains("${target}"), a:contains("${target}")`
    }
  };
}

async function handleMinimizeCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  return {
    success: true,
    message: 'Minimizing window',
    action: 'MINIMIZE',
    data: {}
  };
}

async function handleMaximizeCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  return {
    success: true,
    message: 'Maximizing window',
    action: 'MAXIMIZE', 
    data: {}
  };
}

async function handleSearchCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  const { query, term, for: searchFor } = parameters;
  const searchTerm = query || term || searchFor;
  
  if (!searchTerm) {
    return {
      success: false,
      message: 'Search term not specified',
      error: 'MISSING_SEARCH_TERM'
    };
  }
  
  return {
    success: true,
    message: `Searching for "${searchTerm}"`,
    action: 'SEARCH',
    data: { 
      query: searchTerm,
      focusSearchInput: true
    }
  };
}

async function handleScrollCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  const { direction, to } = parameters;
  
  const validDirections = ['up', 'down', 'top', 'bottom'];
  const scrollDirection = direction || to;
  
  if (!scrollDirection || !validDirections.includes(scrollDirection.toLowerCase())) {
    return {
      success: false,
      message: `Invalid scroll direction. Use: ${validDirections.join(', ')}`,
      error: 'INVALID_SCROLL_DIRECTION'
    };
  }
  
  return {
    success: true,
    message: `Scrolling ${scrollDirection}`,
    action: 'SCROLL',
    data: { direction: scrollDirection.toLowerCase() }
  };
}

async function handleRefreshCommand(parameters: Record<string, any>): Promise<VoiceControlResponse> {
  return {
    success: true,
    message: 'Refreshing page',
    action: 'REFRESH',
    data: {}
  };
} 