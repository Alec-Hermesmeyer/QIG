// src/utils/formatters.ts

/**
 * Get color based on risk score
 */
export const getRiskScoreColor = (score: string): string => {
    switch (score.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f97316';     // Orange
      case 'medium': return '#eab308';   // Yellow
      case 'low': return '#22c55e';      // Green
      default: return '#6b7280';         // Gray
    }
  };
  
  /**
   * Format file size for display
   */
  export const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return '';
    if (bytes === 0) return '0 Bytes';
  
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Format analysis as markdown for copying/exporting
   */
  export const formatAnalysisAsMarkdown = (risks: any[], mitigationPoints: string[]): string => {
    let formattedOutput = "# Contract Risk Analysis\n\n";
  
    // Add the risks
    risks.forEach((risk, index) => {
      formattedOutput += `## Risk ${index + 1}: ${risk.category} (${risk.score})\n\n`;
      formattedOutput += `**Contract Location:** ${risk.location}\n\n`;
      formattedOutput += `**Problematic Text:**\n> "${risk.text}"\n\n`;
      formattedOutput += `**Risk Assessment:**\n${risk.reason}\n\n`;
      formattedOutput += `---\n\n`;
    });
  
    // Add mitigation summary
    formattedOutput += "# Mitigation Summary\n\n";
    mitigationPoints.forEach((point) => {
      formattedOutput += `- ${point}\n`;
    });
  
    return formattedOutput;
  };