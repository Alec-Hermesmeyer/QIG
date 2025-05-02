'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface RawResponseViewerProps {
  responseData: any;
}

export const RawResponseViewer = ({ responseData }: RawResponseViewerProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    thoughts: true,
    documentExcerpts: false,
    enhancedResults: false,
    supportingContent: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format JSON for display
  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  // Get a summary of the response structure
  const getSummary = () => {
    const summary: Record<string, any> = {};

    if (responseData) {
      // General information
      summary.success = responseData.success;
      summary.timestamp = responseData.timestamp;
      summary.query = responseData.query;
      summary.modelUsed = responseData.modelUsed;
      
      // Count of sources and results
      if (responseData.searchResults) {
        summary.sourceCount = responseData.searchResults.count;
      }
      
      if (responseData.enhancedResults) {
        summary.enhancedSourceCount = responseData.enhancedResults.totalResults;
        
        // Check if sources have pageImages
        const hasPageImages = responseData.enhancedResults.sources.some(
          (s: any) => s.pageImages && s.pageImages.length > 0
        );
        summary.hasPageImages = hasPageImages;
      }
      
      // Check for excerpt data
      if (responseData.documentExcerpts) {
        summary.documentExcerptsCount = responseData.documentExcerpts.length;
      }
      
      // Check for thoughts
      if (responseData.thoughts) {
        summary.thoughtsCount = responseData.thoughts.length;
      }
    }
    
    return summary;
  };

  // Extract available key fields
  const getSectionData = (section: string) => {
    if (!responseData) return null;
    
    switch (section) {
      case 'general':
        return {
          success: responseData.success,
          timestamp: responseData.timestamp,
          query: responseData.query,
          response: responseData.response,
          modelUsed: responseData.modelUsed
        };
      case 'thoughts':
        return responseData.thoughts || [];
      case 'documentExcerpts':
        return responseData.documentExcerpts || [];
      case 'enhancedResults':
        return responseData.enhancedResults || {};
      case 'supportingContent':
        return responseData.supportingContent || {};
      default:
        return null;
    }
  };

  // If no data, show placeholder
  if (!responseData) {
    return (
      <div className="p-4 bg-gray-100 rounded-md text-gray-600">
        No response data available.
      </div>
    );
  }

  const summary = getSummary();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gray-800 text-white p-4">
        <h2 className="text-xl font-semibold">RAG API Response Inspector</h2>
        <p className="text-gray-300 text-sm">Analyze the raw response from GroundX</p>
      </div>
      
      {/* Summary Section */}
      <div className="p-4 bg-gray-100 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800">Response Summary</h3>
        <div className="mt-2 flex flex-wrap gap-4">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="bg-white rounded-md px-3 py-2 shadow-sm">
              <span className="text-gray-500 text-sm font-medium">{key}: </span>
              <span className="text-gray-800">
                {typeof value === 'boolean'
                  ? value ? 'Yes' : 'No'
                  : value !== undefined ? String(value) : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content Sections */}
      <div className="divide-y divide-gray-200">
        {/* General Information Section */}
        <Section 
          title="General Information" 
          isExpanded={expandedSections.general}
          onToggle={() => toggleSection('general')}
        >
          <div className="overflow-x-auto">
            <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded">
              {formatJSON(getSectionData('general'))}
            </pre>
          </div>
        </Section>
        
        {/* Thoughts Section */}
        <Section 
          title="AI Thoughts" 
          isExpanded={expandedSections.thoughts}
          onToggle={() => toggleSection('thoughts')}
        >
          {responseData.thoughts && responseData.thoughts.length > 0 ? (
            <div className="space-y-2">
              {responseData.thoughts.map((thought: string, index: number) => (
                <div key={index} className="bg-yellow-50 p-3 rounded border-l-2 border-yellow-300">
                  <span className="font-medium text-yellow-800">{index + 1}:</span> {thought}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No thought process data available.</div>
          )}
        </Section>
        
        {/* Document Excerpts Section */}
        <Section 
          title="Document Excerpts" 
          isExpanded={expandedSections.documentExcerpts}
          onToggle={() => toggleSection('documentExcerpts')}
        >
          {responseData.documentExcerpts && responseData.documentExcerpts.length > 0 ? (
            <div className="space-y-4">
              {responseData.documentExcerpts.map((doc: any, index: number) => (
                <div key={index} className="bg-blue-50 p-3 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">{doc.fileName || `Document ${index + 1}`}</h4>
                  
                  {doc.excerpts && doc.excerpts.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Excerpts:</h5>
                      {doc.excerpts.map((excerpt: string, idx: number) => (
                        <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-sm">
                          {excerpt}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">No excerpts available.</div>
                  )}
                  
                  {doc.narrative && doc.narrative.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-100">
                      <h5 className="text-sm font-medium text-gray-700">Narrative:</h5>
                      <ul className="mt-1 space-y-1 list-disc list-inside text-sm text-gray-600">
                        {doc.narrative.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No document excerpts available.</div>
          )}
        </Section>
        
        {/* Enhanced Results Section */}
        <Section 
          title="Enhanced Results" 
          isExpanded={expandedSections.enhancedResults}
          onToggle={() => toggleSection('enhancedResults')}
        >
          {responseData.enhancedResults?.sources && responseData.enhancedResults.sources.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-2">
                Found {responseData.enhancedResults.totalResults} enhanced sources
              </div>
              
              {responseData.enhancedResults.sources.map((source: any, index: number) => (
                <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                  <h4 className="font-medium text-green-800 mb-1">
                    {source.fileName || `Source ${index + 1}`}
                  </h4>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    ID: {source.id || 'N/A'} | Score: {source.score?.toFixed(2) || 'N/A'}
                  </div>
                  
                  <div className="bg-white p-2 rounded border border-gray-200 text-sm mb-2 max-h-40 overflow-y-auto">
                    {source.text || 'No text content available'}
                  </div>
                  
                  {source.extractedSections && source.extractedSections.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium text-gray-700">Extracted Sections:</h5>
                      <div className="space-y-1 mt-1">
                        {source.extractedSections.map((section: string, idx: number) => (
                          <div key={idx} className="bg-green-100 p-2 rounded text-xs">
                            {section}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {source.pageImages && source.pageImages.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium text-gray-700">
                        Page Images: {source.pageImages.length} available
                      </h5>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No enhanced results available.</div>
          )}
        </Section>
        
        {/* Supporting Content Section */}
        <Section 
          title="Supporting Content" 
          isExpanded={expandedSections.supportingContent}
          onToggle={() => toggleSection('supportingContent')}
        >
          <div className="overflow-x-auto">
            <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded">
              {formatJSON(getSectionData('supportingContent'))}
            </pre>
          </div>
        </Section>
      </div>
      
      {/* View Complete JSON Button */}
      <div className="p-4 bg-gray-100 border-t border-gray-200">
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
            View Complete Raw JSON Response
          </summary>
          <div className="mt-2 overflow-x-auto">
            <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-300 max-h-96 overflow-y-auto">
              {formatJSON(responseData)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
};

// Reusable section component with animation
const Section = ({ 
  title, 
  children, 
  isExpanded, 
  onToggle 
}: { 
  title: string; 
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        className="w-full flex justify-between items-center p-4 focus:outline-none"
        onClick={onToggle}
      >
        <h3 className="text-base font-medium text-gray-800">{title}</h3>
        <span className="text-gray-500">
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </span>
      </button>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className={`p-4 ${isExpanded ? 'block' : 'hidden'}`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};