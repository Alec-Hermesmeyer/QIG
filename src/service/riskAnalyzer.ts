// src/services/riskAnalyzer.ts

import { Risk } from '@/types';

/**
 * Parses risks from the analysis text
 */
export const parseRisksFromAnalysis = (rawAnalysis: string): Risk[] => {
  const risks: Risk[] = [];
  
  // Enhanced pattern that handles location extraction better
  const riskPattern = /Risk Category:\s*([^\n]*)\s*\nRisk Score:\s*([^\n]*)\s*\nRisky Contract Text:\s*(?:"([^"]*)"|([\s\S]*?)(?=\nWhy This Is a Risk:))\s*\nWhy This Is a Risk:\s*([\s\S]*?)(?=\nContract Location:|\n\nRisk Category:|\n\nMitigation Summary:|\n\n\*\*|\n\n$|\n\nPart \d+|$)\s*(?:\nContract Location:\s*([^\n]*))?/gi;
  
  let match;
  let riskCount = 0;
  while ((match = riskPattern.exec(rawAnalysis)) !== null) {
    const category = match[1]?.trim() || 'Unknown Category';
    const score = match[2]?.trim() || 'Unknown Score';
    const text = (match[3] || match[4] || '').trim();
    const reason = match[5]?.trim() || 'Unknown Reason';
    let location = match[6]?.trim() || '';
    
    // Improved location handling
    if (!location || location.toLowerCase().includes('unknown')) {
      location = inferLocation(text, category);
    }
    
    // Skip placeholder risks
    if (isPlaceholderRisk(category, score, text, reason)) {
      continue;
    }
    
    riskCount++;
    risks.push({
      category,
      score,
      text,
      reason,
      location
    });
  }
  
  // If the main regex pattern didn't match any risks, try a more flexible approach
  if (risks.length === 0) {
    const backupRisks = parseRisksWithFallbackMethod(rawAnalysis);
    risks.push(...backupRisks);
  }
  
  // For debugging - log the number of risks found and whether any have Unknown Location
  console.log(`Found ${risks.length} risks, ${risks.filter(r => r.location.includes('Unknown')).length} with Unknown Location`);
  
  return risks;
};

/**
 * Infers the location in the contract based on the risk text and category
 */
function inferLocation(text: string, category: string): string {
  // Try to infer location from context
  const textLower = text.toLowerCase();
  
  // Look for section patterns in the risk text itself
  if (textLower.includes('section') || textLower.includes('article')) {
    const sectionMatch = text.match(/(?:Section|Article)\s+(\d+(?:\.\d+)*)/i);
    if (sectionMatch) {
      return sectionMatch[0];
    }
  }
  
  // If still no location, use a more meaningful default
  return `${category} clause (exact section not specified)`;
}

/**
 * Checks if a risk is just placeholder text
 */
function isPlaceholderRisk(category: string, score: string, text: string, reason: string): boolean {
  return (
    category.includes('[Category]') || 
    score.includes('[Score]') || 
    text.includes('[Exact text]') || 
    reason.includes('[Explanation]')
  );
}

/**
 * Alternative parsing method as a fallback
 */
function parseRisksWithFallbackMethod(rawAnalysis: string): Risk[] {
  const risks: Risk[] = [];
  
  // Try to find risks with the expected structure
  const riskSections = rawAnalysis.split(/\n\s*(?:Risk \d+:|Risk Category:)/i);
  
  for (let i = 1; i < riskSections.length; i++) { // Start from 1 to skip the intro part
    const section = "Risk Category:" + riskSections[i].trim();
    
    try {
      // Extract category
      const categoryMatch = section.match(/Risk Category:\s*([^$\n]*?)(?=\s*Risk Score:|$)/i);
      const category = categoryMatch ? categoryMatch[1].trim() : 'Unknown Category';
      
      // Extract score
      const scoreMatch = section.match(/Risk Score:\s*([^$\n]*?)(?=\s*Risky Contract Text:|Contract Text:|$)/i);
      const score = scoreMatch ? scoreMatch[1].trim() : 'Unknown Score';
      
      // Extract text - look for both "Risky Contract Text:" and just "Contract Text:"
      const textMatch = section.match(/(?:Risky Contract Text:|Contract Text:)\s*(?:"([^"]*?)"|([^"\n]*?)(?=\s*Why This Is a Risk:|$))/i);
      const text = textMatch ? (textMatch[1] || textMatch[2] || '').trim() : 'Unknown Text';
      
      // Extract reason
      const reasonMatch = section.match(/Why This Is a Risk:\s*([^$\n]*?)(?=\s*Contract Location:|Location:|$)/i);
      const reason = reasonMatch ? reasonMatch[1].trim() : 'Unknown Reason';
      
      // Extract location with improved handling
      const locationMatch = section.match(/(?:Contract Location:|Location:)\s*([^$\n]*?)(?=\s*(?:Risk Category:|Risk \d+:|Mitigation Summary:|$))/i);
      let location = locationMatch ? locationMatch[1].trim() : '';
      
      // Improved location handling
      if (!location || location.toLowerCase().includes('unknown')) {
        location = inferLocation(text, category);
      }
      
      // Skip template/placeholder risks
      if (isPlaceholderRisk(category, score, text, reason)) {
        continue;
      }
      
      // Only add if we have real category and score (not just placeholders)
      if (category !== 'Unknown Category' && score !== 'Unknown Score') {
        risks.push({
          category,
          score,
          text,
          reason,
          location
        });
      }
    } catch (e) {
      console.error('Error parsing risk section:', e);
    }
  }
  
  return risks;
}

/**
 * Parse mitigation points from raw analysis text
 */
export const parseMitigationFromAnalysis = (rawAnalysis: string): string[] => {
  // Patterns to match mitigation sections
  const mitigationPatterns = [
    /Mitigation Summary:([\s\S]*?)(?=\n\nRisk Category:|\n\n\*\*|\n\nPart \d+|$)/i,
    /Mitigation Recommendations:([\s\S]*?)(?=\n\nRisk Category:|\n\n\*\*|\n\nPart \d+|$)/i,
    /Recommended Mitigations:([\s\S]*?)(?=\n\nRisk Category:|\n\n\*\*|\n\nPart \d+|$)/i,
    /Mitigation Strategies:([\s\S]*?)(?=\n\nRisk Category:|\n\n\*\*|\n\nPart \d+|$)/i,
  ];
  
  for (let i = 0; i < mitigationPatterns.length; i++) {
    const mitigationMatch = rawAnalysis.match(mitigationPatterns[i]);
    if (mitigationMatch && mitigationMatch[1]) {
      // Extract bullet points and number lists
      const points = mitigationMatch[1]
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => 
          (line.startsWith('-') || 
           line.startsWith('•') || 
           line.startsWith('*') || 
           /^\d+\./.test(line)) && 
          line.length > 10
        )
        .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''));
      
      // Remove duplicates and limit to 10 points max
      const uniquePoints = [...new Set(points)]
        .filter(point => !point.includes('[') && !point.includes('**'))
        .slice(0, 10);
      
      return uniquePoints.length > 0 ? uniquePoints : [];
    }
  }
  
  // If no structured mitigation section was found, try to extract any bullet points
  // from the end of the document
  return extractBulletPointsFromEnd(rawAnalysis);
}

/**
 * Extract bullet points from the end of document as a fallback
 */
function extractBulletPointsFromEnd(rawAnalysis: string): string[] {
  const endOfDoc = rawAnalysis.split(/Mitigation/i).pop() || '';
  const bulletPoints = endOfDoc
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => 
      (line.startsWith('-') || 
       line.startsWith('•') || 
       line.startsWith('*') || 
       /^\d+\./.test(line)) && 
      line.length > 10
    )
    .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''));
  
  // Remove duplicates and limit to 10 points max
  const uniquePoints = [...new Set(bulletPoints)]
    .filter(point => !point.includes('[') && !point.includes('**'))
    .slice(0, 10);
  
  return uniquePoints;
}

/**
 * Clean up the analysis response by removing system notes and redundant parts
 */
export const preprocessAnalysisResponse = (response: string): string => {
  // Remove any system notes or redundant parts
  let cleaned = response
    .replace(/Part \d+ of \d+/g, '')
    .replace(/^(As a|I am a|Acting as a).*?analyst.*?\n/im, '')
    .replace(/\*\*CONSTRUCTION CONTRACT RISK ANALYSIS\*\*/g, '')
    .replace(/\*\*ROLE AND OBJECTIVE\*\*[\s\S]*?\*\*ANALYSIS FRAMEWORK\*\*/g, '')
    .replace(/\*\*ANALYTICAL APPROACH\*\*[\s\S]*?\*\*IMPORTANT NOTES\*\*/g, '')
    .replace(/\*\*OUTPUT FORMAT\*\*[\s\S]*?ensure proper parsing/g, '')
    .replace(/\*\*PRIORITY RISK AREAS\*\*[\s\S]*?\*\*MITIGATION SUMMARY\*\*/g, '');
  
  return cleaned;
};