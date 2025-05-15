// ScoreUtils.ts
/**
 * Consistently formats score values from API responses
 * Handles decimal point issues, extreme values, and various score formats
 */
export const formatScoreDisplay = (score: number | string | undefined | null): string => {
    if (score === undefined || score === null) return "N/A";
    
    // IMPORTANT: Check for extreme values that indicate decimal point issues
    const numericScore = typeof score === 'string' ? parseFloat(score) : score;
    
    // Handle NaN case
    if (isNaN(numericScore)) return "N/A";
    
    // If score is suspiciously high (>1000), it might be a decimal point error
    if (numericScore > 1000) {
      // Try to detect if this is a decimal point error
      const asString = numericScore.toString();
      if (asString.length >= 5) {
        // Attempt to fix by inserting decimal point at a reasonable position
        // For a score like 11084, convert to 110.84
        const correctedScore = parseFloat(asString.slice(0, 3) + '.' + asString.slice(3));
        
        // Use the corrected score if it seems reasonable
        if (correctedScore > 0 && correctedScore < 200) {
          if (correctedScore > 100) {
            return "High"; // Just show "High" for high percentages
          }
          return correctedScore.toFixed(1) + '%';
        }
      }
      return "Very High"; 
    }
    
    // For scores in the 100-1000 range
    if (numericScore > 100 && numericScore <= 1000) {
      return "High";
    }
    
    // For scores in the 0-100 range that likely represent percentages
    if (numericScore >= 1 && numericScore <= 100) {
      const formattedScore = numericScore.toFixed(1);
      // If it's very close to a whole number, remove the decimal
      if (formattedScore.endsWith('.0')) {
        return formattedScore.split('.')[0] + '%';
      }
      return formattedScore + '%';
    }
    
    // If score is 0, return simple 0%
    if (numericScore === 0) {
      return "0%";
    }
    
    // For very small scores (near 0 but not 0)
    if (numericScore < 0.001) {
      return "<0.1%";
    }
    
    // If score is a decimal (0-1 range)
    return (numericScore * 100).toFixed(1) + '%';
  };
  
  /**
   * Fixes decimal point issues in score values
   * Returns corrected numeric value (not formatted as string)
   */
  export const fixDecimalPointIssue = (score: number | string | undefined | null): number => {
    if (score === undefined || score === null) {
      return 0; // Return a safe default
    }
    
    if (typeof score !== 'number' && typeof score !== 'string') {
      return 0; // Only process numeric or string scores
    }
    
    const numericScore = typeof score === 'string' ? parseFloat(score) : score;
    
    // Handle NaN case
    if (isNaN(numericScore)) return 0;
    
    // If score is not suspiciously high, return as is
    if (numericScore <= 1000) {
      return numericScore;
    }
    
    // Try to detect if this is a decimal point error
    const asString = numericScore.toString();
    if (asString.length >= 5) {
      // Attempt to fix by inserting decimal point at a reasonable position
      // For a score like 11084, convert to 110.84
      const correctedScore = parseFloat(asString.slice(0, 3) + '.' + asString.slice(3));
      
      // Only return the corrected score if it looks reasonable
      if (correctedScore > 0 && correctedScore < 1000) {
        return correctedScore;
      }
    }
    
    // If couldn't correct, return original value
    return numericScore;
  };
  
  /**
   * Returns a friendly text label for a score
   */
  export const getScoreLabel = (score: number | string | undefined | null): string => {
    const fixedScore = fixDecimalPointIssue(score);
    
    if (fixedScore > 100) return "Very High";
    if (fixedScore > 80) return "High";
    if (fixedScore > 60) return "Good";
    if (fixedScore > 40) return "Medium";
    if (fixedScore > 20) return "Low";
    return "Very Low";
  };