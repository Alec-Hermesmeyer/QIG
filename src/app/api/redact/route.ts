import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface RedactionRequest {
  text: string;
  options: {
    preserveLength?: boolean;
    redactionText?: string;
    sensitivityLevel?: 'low' | 'medium' | 'high';
  };
}

interface RedactionResponse {
  redactedText: string;
  redactionCount: number;
  redactedItems: {
    type: string;
    original: string;
    redacted: string;
    position: number;
  }[];
  isRedacted: boolean;
}

// Simple pattern-based redaction patterns for fallback
const REDACTION_PATTERNS = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  phone: /\b(?:\+1[-\s]?)?\(?([0-9]{3})\)?[-\s]?([0-9]{3})[-\s]?([0-9]{4})\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  address: /\b\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Ct|Court|Ln|Lane|Pl|Place)\b/g,
  dateOfBirth: /\b(?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12][0-9]|3[01])[-\/](?:19|20)\d{2}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  driversLicense: /\b[A-Z]{1,2}\d{6,8}\b/g,
};

function performPatternBasedRedaction(text: string, options: RedactionRequest['options']): RedactionResponse {
  let redactedText = text;
  const redactedItems: RedactionResponse['redactedItems'] = [];
  let redactionCount = 0;
  const redactionText = options.redactionText || '[REDACTED - FOIA EXEMPT]';

  // Apply all patterns
  Object.entries(REDACTION_PATTERNS).forEach(([type, pattern]) => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const original = match[0];
      const redacted = options.preserveLength ? '█'.repeat(original.length) : redactionText;
      redactedText = redactedText.replace(original, redacted);
      redactedItems.push({
        type,
        original,
        redacted,
        position: match.index || 0,
      });
      redactionCount++;
    });
  });

  return {
    redactedText,
    redactionCount,
    redactedItems,
    isRedacted: redactionCount > 0,
  };
}

async function performAIRedaction(
  text: string,
  options: RedactionRequest['options'],
  organizationId?: string
): Promise<RedactionResponse> {
  // For now, we'll use a simple AI-like approach with enhanced patterns
  // In a real implementation, this would call an AI service
  
  try {
    // Simulate AI processing with more sophisticated pattern matching
    const aiPrompt = `
    You are a FOIA redaction specialist. Identify and redact sensitive information in the following text:
    - Personal identifiers (SSN, phone, email, addresses)
    - Financial information (credit cards, bank accounts)
    - Personal details (dates of birth, driver's licenses)
    - Any other information that should be protected under FOIA exemptions
    
    Text to redact: ${text}
    `;

    // For this implementation, we'll use enhanced pattern matching
    // In production, you would send this to an AI service like OpenAI, Azure OpenAI, etc.
    
    const enhancedPatterns = {
      ...REDACTION_PATTERNS,
      // Add more sophisticated patterns
      names: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Simple name pattern
      zipCodes: /\b\d{5}(?:-\d{4})?\b/g,
      medicalRecords: /\b(?:MRN|Medical Record Number)[\s:]+[\w\d-]+/gi,
      caseNumbers: /\b(?:Case|Docket|File)[\s#:]+[\w\d-]+/gi,
    };

    let redactedText = text;
    const redactedItems: RedactionResponse['redactedItems'] = [];
    let redactionCount = 0;
    const redactionText = options.redactionText || '[REDACTED - FOIA EXEMPT]';

    // Apply enhanced patterns
    Object.entries(enhancedPatterns).forEach(([type, pattern]) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const original = match[0];
        
        // Skip if it's a common word or too short for certain types
        if (type === 'names' && (original.length < 6 || /\b(The|And|For|Inc|LLC|Corp)\b/i.test(original))) {
          return;
        }
        
        const redacted = options.preserveLength ? '█'.repeat(original.length) : redactionText;
        redactedText = redactedText.replace(original, redacted);
        redactedItems.push({
          type,
          original,
          redacted,
          position: match.index || 0,
        });
        redactionCount++;
      });
    });

    return {
      redactedText,
      redactionCount,
      redactedItems,
      isRedacted: redactionCount > 0,
    };
  } catch (error) {
    console.error('AI redaction failed, falling back to pattern matching:', error);
    return performPatternBasedRedaction(text, options);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user's organization
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for organization override header (from organization switcher)
    const organizationOverride = request.headers.get('x-organization-override');
    let organizationName: string | undefined;
    let organizationId: string | undefined;

    if (organizationOverride) {
      // QIG admin is acting as another organization
      console.log('Using organization override:', organizationOverride);
      const { data: overrideOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', organizationOverride)
        .single();
      
      if (overrideOrg) {
        organizationName = overrideOrg.name;
        organizationId = overrideOrg.id;
      }
    }

    // If no override, get user's actual organization
    if (!organizationName) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, organizations!inner(name)')
        .eq('id', session.user.id)
        .single();

      organizationName = (profile?.organizations as any)?.name;
      organizationId = profile?.organization_id;
    }

    console.log('Redaction API - Organization check:', {
      organizationName,
      organizationId,
      hasOverride: !!organizationOverride
    });

    // Check if redaction is available for this organization
    if (organizationName !== 'Westfield' && !organizationName?.toLowerCase().includes('records')) {
      return NextResponse.json({ 
        error: 'Redaction service not available for your organization' 
      }, { status: 403 });
    }

    const body: RedactionRequest = await request.json();
    
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Perform AI-enhanced redaction
    const result = await performAIRedaction(body.text, body.options || {}, organizationId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in redaction API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user's organization to check if redaction is available
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for organization override header (from organization switcher)
    const organizationOverride = request.headers.get('x-organization-override');
    let organizationName: string | undefined;

    if (organizationOverride) {
      // QIG admin is acting as another organization
      const { data: overrideOrg } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationOverride)
        .single();
      
      if (overrideOrg) {
        organizationName = overrideOrg.name;
      }
    }

    // If no override, get user's actual organization
    if (!organizationName) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, organizations!inner(name)')
        .eq('id', session.user.id)
        .single();

      organizationName = (profile?.organizations as any)?.name;
    }

    const isAvailable = organizationName === 'Westfield' || organizationName?.toLowerCase().includes('records');

    return NextResponse.json({
      available: isAvailable,
      organization: organizationName,
      debug: {
        hasOverride: !!organizationOverride,
        overrideId: organizationOverride,
        checkResult: {
          isWestfield: organizationName === 'Westfield',
          includesRecords: organizationName?.toLowerCase().includes('records'),
          finalAvailable: isAvailable
        }
      },
      features: {
        patternMatching: true,
        aiRedaction: isAvailable,
        supportedTypes: [
          'ssn',
          'phone',
          'email', 
          'address',
          'dateOfBirth',
          'creditCard',
          'driversLicense',
          'names',
          'zipCodes',
          'medicalRecords',
          'caseNumbers'
        ]
      }
    });
  } catch (error) {
    console.error('Error checking redaction availability:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 