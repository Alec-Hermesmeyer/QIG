// SupportingContentHelper.tsx
import React from 'react';

// This helper component can be used to debug the supporting content format
export const SupportingContentDebug: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
      <h3 className="text-sm font-semibold mb-2">Debug Supporting Content</h3>
      <div className="text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
};

// Sample data generator for testing
export const generateSampleSupportingContent = () => {
  return [
    "contract.pdf: Section 5.3 outlines the payment terms including net-30 payment schedule and late payment penalties of 1.5% per month.",
    "agreement.docx: The non-compete clause (Article 7) restricts the contractor from working with direct competitors within a 50-mile radius for 12 months after termination.",
    "invoice.pdf: Invoice #INV-2023-456 shows outstanding balance of $12,450 for services rendered between Jan 15-Feb 28, 2023."
  ];
};

// Helper function to extract supporting content from response
export const extractSupportingContent = (response: any): any => {
  console.log("Extracting supporting content from:", response);
  
  if (!response) return null;
  
  // Try various formats of response
  if (response.context?.data_points) {
    return response.context.data_points;
  }
  
  if (response.data_points) {
    return response.data_points;
  }
  
  if (response.supporting_content) {
    return response.supporting_content;
  }
  
  if (response.supporting_documents) {
    return response.supporting_documents;
  }
  
  if (response.message?.content && typeof response.message.content === 'string') {
    // Try to extract citations from the content
    const content = response.message.content;
    const citationRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
    const matches = [...content.matchAll(citationRegex)];
    
    if (matches.length > 0) {
      return matches.map(match => `${match[1]}: Referenced in the response.`);
    }
  }
  
  if (response.message?.content && typeof response.message.content === 'object') {
    // Try parsing as JSON
    try {
      const parsed = response.message.content;
      if (parsed.context?.data_points) {
        return parsed.context.data_points;
      }
      if (parsed.data_points) {
        return parsed.data_points;
      }
      if (parsed.supporting_content) {
        return parsed.supporting_content;
      }
    } catch (e) {
      console.error("Error parsing response.message.content as JSON:", e);
    }
  }
  
  // Check if response itself is an array
  if (Array.isArray(response)) {
    // If it's an array of strings or objects, return it directly
    return response;
  }
  
  console.warn("Could not extract supporting content from response", response);
  return null;
};