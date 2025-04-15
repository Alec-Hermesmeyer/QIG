'use client';

import { useState, useEffect } from 'react';

// Define the Risk interface
export interface Risk {
  category: string;
  score: string;
  text: string;
  reason: string;
  location: string;
}

/**
 * Custom hook to parse contract analysis results from raw text
 */
export function useContractAnalysis(rawAnalysis: string) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [mitigationPoints, setMitigationPoints] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawAnalysis) {
      setRisks([]);
      setMitigationPoints([]);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Parse risks from the analysis
      const parsedRisks = parseRisksFromAnalysis(rawAnalysis);
      setRisks(parsedRisks);

      // Parse mitigation points from the analysis
      const parsedMitigation = parseMitigationFromAnalysis(rawAnalysis);
      setMitigationPoints(parsedMitigation);
    } catch (e) {
      console.error('Error parsing contract analysis:', e);
      setError('Failed to parse analysis results');
    } finally {
      setIsProcessing(false);
    }
  }, [rawAnalysis]);

  return {
    risks,
    mitigationPoints,
    isProcessing,
    error,
  };
}

/**
 * Parse risks from raw analysis text
 */
function parseRisksFromAnalysis(rawAnalysis: string): Risk[] {
  const risks: Risk[] = [];
  
  // Clean the text for consistent format
  const cleanText = rawAnalysis
    .replace(/Part \d+ of \d+/g, '') // Remove "Part X of Y" headers
    .trim();

  // Try different regex patterns for more robust parsing
  
  // Pattern 1: Standard structured format
  const primaryRegex = /Risk Category:\s*(.*?)\s*Risk Score:\s*(.*?)\s*Risky Contract Text:\s*"(.*?)"\s*Why This Is a Risk:\s*(.*?)\s*Contract Location:\s*(.*?)(?=\s*Risk Category:|$|\s*Mitigation Summary:)/gs;
  
  // Pattern 2: Alternative format that might occur
  const secondaryRegex = /Risk Category:\s*(.*?)\s*Risk Score:\s*(.*?)\s*Risky Contract Text:\s*(.*?)\s*Why This Is a Risk:\s*(.*?)\s*Contract Location:\s*(.*?)(?=\s*Risk Category:|$|\s*Mitigation Summary:)/gs;
  
  // Try the primary regex first
  let matches = Array.from(cleanText.matchAll(primaryRegex));
  
  // If no matches, try the secondary regex
  if (matches.length === 0) {
    matches = Array.from(cleanText.matchAll(secondaryRegex));
  }
  
  // Process matches
  for (const match of matches) {
    if (match.length >= 6) {
      const text = match[3].replace(/^["']|["']$/g, '').trim(); // Remove quotes if they exist
      
      risks.push({
        category: match[1].trim(),
        score: match[2].trim(),
        text: text,
        reason: match[4].trim(),
        location: match[5].trim(),
      });
    }
  }
  
  // If still no structured risks found, try a more lenient approach
  if (risks.length === 0) {
    // Look for lines that might be risk categories
    const lines = cleanText.split('\n');
    let currentRisk: Partial<Risk> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('Risk Category:')) {
        // Save the previous risk if it exists
        if (currentRisk.category && currentRisk.score) {
          risks.push({
            category: currentRisk.category || 'Unknown',
            score: currentRisk.score || 'Unknown',
            text: currentRisk.text || 'Not specified',
            reason: currentRisk.reason || 'Not specified',
            location: currentRisk.location || 'Not specified',
          });
        }
        
        // Start a new risk
        currentRisk = { category: trimmedLine.replace('Risk Category:', '').trim() };
      } else if (trimmedLine.startsWith('Risk Score:') && currentRisk.category) {
        currentRisk.score = trimmedLine.replace('Risk Score:', '').trim();
      } else if (trimmedLine.startsWith('Risky Contract Text:') && currentRisk.category) {
        currentRisk.text = trimmedLine.replace('Risky Contract Text:', '').trim();
        // Remove surrounding quotes if present
        if (currentRisk.text?.startsWith('"') && currentRisk.text?.endsWith('"')) {
          currentRisk.text = currentRisk.text.slice(1, -1);
        }
      } else if (trimmedLine.startsWith('Why This Is a Risk:') && currentRisk.category) {
        currentRisk.reason = trimmedLine.replace('Why This Is a Risk:', '').trim();
      } else if (trimmedLine.startsWith('Contract Location:') && currentRisk.category) {
        currentRisk.location = trimmedLine.replace('Contract Location:', '').trim();
      }
    }
    
    // Add the last risk if it exists
    if (currentRisk.category && currentRisk.score) {
      risks.push({
        category: currentRisk.category || 'Unknown',
        score: currentRisk.score || 'Unknown',
        text: currentRisk.text || 'Not specified',
        reason: currentRisk.reason || 'Not specified',
        location: currentRisk.location || 'Not specified',
      });
    }
  }
  
  return risks;
}

/**
 * Parse mitigation points from raw analysis text
 */
function parseMitigationFromAnalysis(rawAnalysis: string): string[] {
  // Look for the Mitigation Summary section
  const mitigationMatch = rawAnalysis.match(/Mitigation Summary:?\s*([\s\S]*?)(?=$)/i);
  
  if (!mitigationMatch || !mitigationMatch[1]) {
    // Try alternative format - sometimes there's no "Mitigation Summary:" header
    // but just bullet points at the end
    const bulletPointsRegex = /•\s+(.*?)(?=•\s+|$)/gs;
    const bulletMatches = Array.from(rawAnalysis.matchAll(bulletPointsRegex));
    
    if (bulletMatches.length > 0) {
      return bulletMatches
        .map(match => match[1].trim())
        .filter(line => line.length > 0 && !line.includes('Risk Category:'));
    }
    
    return [];
  }
  
  // Process the mitigation points
  return mitigationMatch[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Filter out empty lines and lines that might be part of the risk items
      return line.length > 0 && 
             !line.includes('Risk Category:') &&
             !line.includes('Risk Score:');
    })
    .map(line => {
      // Clean up bullet points for consistency
      return line.replace(/^[-•*]\s*/, '').trim();
    });
}