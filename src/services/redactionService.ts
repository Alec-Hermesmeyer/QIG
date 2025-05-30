'use client';

// Common sensitive information patterns
const SENSITIVE_PATTERNS = {
  // Personal Information
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  phone: /\b(?:\+1[-\s]?)?\(?([0-9]{3})\)?[-\s]?([0-9]{3})[-\s]?([0-9]{4})\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Financial Information
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  bankAccount: /\b\d{8,17}\b/g,
  
  // Addresses
  address: /\b\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Ct|Court|Ln|Lane|Pl|Place)\b/g,
  
  // Dates of Birth
  dateOfBirth: /\b(?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12][0-9]|3[01])[-\/](?:19|20)\d{2}\b/g,
  
  // ID Numbers
  driversLicense: /\b[A-Z]{1,2}\d{6,8}\b/g,
  passport: /\b[A-Z]{2}\d{7}\b/g,
};

export interface RedactionOptions {
  patterns?: (keyof typeof SENSITIVE_PATTERNS)[];
  customPatterns?: RegExp[];
  redactionText?: string;
  preserveLength?: boolean;
  useAI?: boolean;
}

export interface RedactionResult {
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

class RedactionService {
  private defaultOptions: RedactionOptions = {
    patterns: ['ssn', 'phone', 'email', 'creditCard', 'address', 'dateOfBirth'],
    redactionText: '[REDACTED]',
    preserveLength: false,
    useAI: false,
  };

  /**
   * Redact sensitive information from text using pattern matching
   */
  redactText(text: string, options: RedactionOptions = {}): RedactionResult {
    const opts = { ...this.defaultOptions, ...options };
    let redactedText = text;
    const redactedItems: RedactionResult['redactedItems'] = [];
    let redactionCount = 0;

    // Apply pattern-based redaction
    if (opts.patterns) {
      opts.patterns.forEach(patternName => {
        const pattern = SENSITIVE_PATTERNS[patternName];
        if (pattern) {
          const matches = [...text.matchAll(pattern)];
          matches.forEach(match => {
            const original = match[0];
            const redacted = this.generateRedactionText(original, opts);
            redactedText = redactedText.replace(original, redacted);
            redactedItems.push({
              type: patternName,
              original,
              redacted,
              position: match.index || 0,
            });
            redactionCount++;
          });
        }
      });
    }

    // Apply custom patterns
    if (opts.customPatterns) {
      opts.customPatterns.forEach((pattern, index) => {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const original = match[0];
          const redacted = this.generateRedactionText(original, opts);
          redactedText = redactedText.replace(original, redacted);
          redactedItems.push({
            type: `custom_${index}`,
            original,
            redacted,
            position: match.index || 0,
          });
          redactionCount++;
        });
      });
    }

    return {
      redactedText,
      redactionCount,
      redactedItems,
      isRedacted: redactionCount > 0,
    };
  }

  /**
   * AI-powered redaction using the backend service
   * This requires an organizationAwareFetch function to be passed in from the component
   */
  async redactWithAI(
    text: string, 
    organizationAwareFetch: (url: string, options: RequestInit) => Promise<Response>,
    options: RedactionOptions = {}
  ): Promise<RedactionResult> {
    try {
      const response = await organizationAwareFetch('/api/redact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          options: {
            preserveLength: options.preserveLength || false,
            redactionText: options.redactionText || '[REDACTED]',
            sensitivityLevel: 'high', // high, medium, low
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI redaction failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('AI redaction failed, falling back to pattern matching:', error);
      // Fallback to pattern-based redaction
      return this.redactText(text, options);
    }
  }

  /**
   * Redact content for Open Records specifically
   */
  async redactForOpenRecords(
    text: string,
    organizationAwareFetch?: (url: string, options: RequestInit) => Promise<Response>
  ): Promise<RedactionResult> {
    const openRecordsOptions: RedactionOptions = {
      patterns: ['ssn', 'phone', 'email', 'address', 'dateOfBirth', 'driversLicense'],
      redactionText: '[REDACTED - FOIA EXEMPT]',
      preserveLength: false,
      useAI: true,
    };

    // Use AI redaction if available and fetch function provided
    if (openRecordsOptions.useAI && organizationAwareFetch) {
      try {
        return await this.redactWithAI(text, organizationAwareFetch, openRecordsOptions);
      } catch (error) {
        console.warn('AI redaction not available, using pattern matching');
      }
    }

    return this.redactText(text, openRecordsOptions);
  }

  /**
   * Generate redaction text based on options
   */
  private generateRedactionText(original: string, options: RedactionOptions): string {
    if (options.preserveLength) {
      return '█'.repeat(original.length);
    }
    return options.redactionText || '[REDACTED]';
  }

  /**
   * Check if the current organization/service supports redaction
   */
  isRedactionAvailable(organizationName?: string, serviceName?: string): boolean {
    // For now, only available for Westfield and Open Records service
    return organizationName === 'Westfield' || serviceName === 'open-records';
  }

  /**
   * Restore redacted text (for authorized users)
   */
  restoreRedactedText(redactedText: string, redactionResult: RedactionResult): string {
    let restoredText = redactedText;
    
    // Restore in reverse order to maintain position integrity
    redactionResult.redactedItems
      .sort((a, b) => b.position - a.position)
      .forEach(item => {
        restoredText = restoredText.replace(item.redacted, item.original);
      });

    return restoredText;
  }
}

export const redactionService = new RedactionService(); 