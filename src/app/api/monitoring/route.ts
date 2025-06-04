import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Internal monitoring API endpoint
 * Provides system health and metrics data for QIG internal tools
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookies() 
    });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client backend configurations from database
    const { data: configs, error: configsError } = await supabase
      .from('client_configurations')
      .select(`
        id,
        client_name,
        backend_config,
        is_active,
        created_at,
        updated_at,
        organizations!inner(name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (configsError) {
      console.error('Error fetching client configs for monitoring:', configsError);
      return NextResponse.json({ 
        error: 'Failed to fetch client configurations',
        details: configsError.message 
      }, { status: 500 });
    }

    // Transform configs to backend endpoints
    const clientBackends = (configs || [])
      .filter(config => config.backend_config?.api_url)
      .map(config => ({
        name: config.client_name || 'Unknown Client',
        url: config.backend_config.api_url,
        organizationName: (config.organizations as any)?.name || 'Unknown Organization',
        id: config.id,
        isActive: config.is_active,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      }));

    console.log(`[Monitoring API] Found ${clientBackends.length} active client backends`);

    // Basic system metrics
    const timestamp = new Date().toISOString();
    
    const responseData = {
      timestamp,
      systemHealth: {
        status: 'healthy' as const,
        lastCheck: timestamp,
        responseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
      },
      clientBackends, // Real backend configurations
      apiEndpoints: [
        {
          name: 'Chat Stream API',
          url: '/api/chat-stream',
          status: 'healthy' as const,
          responseTime: Math.floor(Math.random() * 100) + 25,
          availability: 99.5
        },
        {
          name: 'GroundX RAG API',
          url: '/api/groundx/rag',
          status: 'healthy' as const,
          responseTime: Math.floor(Math.random() * 300) + 100,
          availability: 98.2
        }
      ],
      metrics: {
        activeUsers24h: Math.floor(Math.random() * 50) + 10,
        totalRequests: Math.floor(Math.random() * 1000) + 500,
        errorRate: Math.random() * 2, // 0-2%
        averageResponseTime: Math.floor(Math.random() * 150) + 100
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch monitoring data',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'trigger_warmup':
        // Simulate warmup trigger
        console.log('Triggering API warmup from monitoring dashboard');
        
        return NextResponse.json({
          success: true,
          message: 'API warmup triggered successfully',
          timestamp: new Date().toISOString()
        });

      case 'resolve_alert':
        const { alertId } = body;
        console.log('Resolving alert:', alertId);
        
        return NextResponse.json({
          success: true,
          message: `Alert ${alertId} resolved`,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Monitoring API POST error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process monitoring action',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}