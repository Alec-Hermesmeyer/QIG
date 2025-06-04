// app/api/org-logo/[id]/route.ts (Next.js 13+ App Router)
// OR pages/api/org-logo/[id].ts (Next.js Pages Router)
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Debug flag - Set to true to enable detailed logging
const DEBUG = true;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (DEBUG) console.log(`[org-logo] Received request for organization ID: ${params.id}`);
  
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    
    if (DEBUG) console.log(`[org-logo] Supabase client created, fetching organization data`);
    
    // Get organization data
    const { data: org, error } = await supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', params.id)
      .single();
      
    if (error) {
      console.error('[org-logo] Error fetching organization:', error);
      return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
    }
    
    if (!org?.logo_url) {
      if (DEBUG) console.log(`[org-logo] No logo URL found for organization ID: ${params.id}`);
      return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
    }
    
    if (DEBUG) console.log(`[org-logo] Found logo URL: ${org.logo_url}`);
    
    // If logo_url is already a full path, return it directly
    if (org.logo_url.startsWith('http')) {
      if (DEBUG) console.log(`[org-logo] Logo is an external URL, redirecting`);
      return NextResponse.redirect(org.logo_url);
    }
    
    if (DEBUG) console.log(`[org-logo] Fetching logo from storage bucket: 'organization-logos'`);
    
    // Get the actual image data from storage
    const { data, error: storageError } = await supabase.storage
      .from('organization-logos')
      .download(org.logo_url);
      
    if (storageError) {
      console.error('[org-logo] Storage error:', storageError);
      return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
    }
    
    if (!data) {
      if (DEBUG) console.log(`[org-logo] No data returned from storage`);
      return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
    }
    
    if (DEBUG) console.log(`[org-logo] Successfully fetched logo, content type: ${data.type || 'image/png'}`);
    
    // Return the image with proper content type
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[org-logo] Unexpected error:', error);
    return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
  }
}