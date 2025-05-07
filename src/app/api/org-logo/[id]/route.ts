// app/api/org-logo/[id]/route.ts (Next.js 13+ App Router)
// OR pages/api/org-logo/[id].ts (Next.js Pages Router)
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get organization data
    const { data: org, error } = await supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', params.id)
      .single();
      
    if (error || !org?.logo_url) {
      // Redirect to default logo if org not found or no logo
      return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
    }
    
    // If logo_url is already a full path, return it directly
    if (org.logo_url.startsWith('http')) {
      return NextResponse.redirect(org.logo_url);
    }
    
    // Get the actual image data from storage
    const { data, error: storageError } = await supabase.storage
      .from('organization-logos')
      .download(org.logo_url);
      
    if (storageError || !data) {
      // Redirect to default logo if storage error
      return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
    }
    
    // Return the image with proper content type
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching logo:', error);
    return NextResponse.redirect(new URL('/defaultLogo.png', req.url));
  }
}