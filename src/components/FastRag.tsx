'use client';

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { FileText, Brain, Database, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

// Simple type definitions
interface Source {
  id?: string;
  fileName?: string;
  text?: string;
  content?: string;
  excerpts?: string[];
  score?: number;
}

interface ChatSource {
  title: string;
  content: string;
  score?: number;
}

interface FastRAGProps {
  answer: any;
  theme?: 'light' | 'dark';
}

export default function FastRAG({ answer, theme = 'light' }: FastRAGProps) {
  // State
  const [content, setContent] = useState<string>("");
  const [supportingContent, setSupportingContent] = useState<ChatSource[]>([]);
  const [thoughtProcess, setThoughtProcess] = useState<string>("");
  const [hasSupporting, setHasSupporting] = useState(false);
  const [hasThoughts, setHasThoughts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("answer");
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  
  // Track whether we're dealing with a streaming message
  const isStreaming = useRef<boolean>(false);
  const previousAnswerRef = useRef<any>(null);

  // Debug
  const debugMode = true;
  const debugLog = (message: string, data?: any) => {
    if (debugMode) {
      if (data) {
        console.log(`[FastRAG] ${message}:`, data);
      } else {
        console.log(`[FastRAG] ${message}`);
      }
    }
  };
  
  // Parse the answer when it changes
  useEffect(() => {
    if (!answer) return;
    
    debugLog("Received answer", {
      type: typeof answer,
      keys: typeof answer === 'object' ? Object.keys(answer) : 'n/a',
      hasRaw: typeof answer === 'object' && 'raw' in answer,
      hasContent: typeof answer === 'object' && 'content' in answer,
      hasStreaming: typeof answer === 'object' && answer.metadata?.isStreaming
    });
    
    try {
      // Detect if this is a streaming message
      isStreaming.current = answer.metadata?.isStreaming === true ||
                           (typeof answer === 'object' && answer.delta !== undefined);
      
      // Don't overwrite the supporting content or thought process if we're still streaming
      // unless it's the first chunk
      if (isStreaming.current && previousAnswerRef.current) {
        debugLog("Processing streaming update");
        // Just update the content for streaming updates
        if (typeof answer === 'string') {
          setContent(answer);
        } else if (answer.content !== undefined) {
          setContent(answer.content);
        } else if (answer.delta !== undefined) {
          setContent(answer.delta);
        }
        
        // Check if this streaming chunk contains any raw data
        if (answer.raw) {
          debugLog("Processing raw data in streaming chunk");
          processRawData(answer.raw);
        }
        
        // Don't process further for streaming updates to avoid losing state
        previousAnswerRef.current = answer;
        return;
      }
      
      // When streaming ends, try to process any raw response data
      if (!isStreaming.current && answer.raw) {
        debugLog("Processing raw data in final response");
        processRawData(answer.raw);
      }
      
      // Extract the main content
      if (typeof answer === 'string') {
        // It's a raw string, which might contain JSON
        debugLog("Processing string answer");
        parseStringAnswer(answer);
      } else if (typeof answer === 'object') {
        // It's already an object
        debugLog("Processing object answer", Object.keys(answer));
        parseObjectAnswer(answer);
      }
      
      // Store the current answer for comparison in future updates
      previousAnswerRef.current = answer;
    } catch (error) {
      console.error("Error processing answer:", error);
    }
  }, [answer]);

  // Function to process raw API response data
  const processRawData = (raw: string) => {
    if (!raw) return;
    
    debugLog("Raw data length", raw.length);
    
    // First split by newlines to process individual JSON objects
    const lines = raw.split('\n').filter(line => line.trim() !== '');
    
    debugLog("JSON objects in raw data", lines.length);
    
    // Process each line as a separate JSON object
    lines.forEach(line => {
      try {
        const obj = JSON.parse(line);
        
        // Check object type and process accordingly
        if (obj.type === 'citation' && obj.citation) {
          debugLog("Found citation", obj.citation);
          processCitation(obj.citation);
        }
        else if (obj.type === 'supporting_content' && obj.source) {
          debugLog("Found supporting content", obj.source);
          processSupportingContent(obj.source);
        }
        else if (obj.type === 'thought_process' && obj.content) {
          debugLog("Found thought process", { length: obj.content.length });
          processThoughtProcess(obj.content);
        }
        else if (obj.type === 'done' && obj.answer) {
          debugLog("Found done message with answer", Object.keys(obj.answer));
          processDoneMessage(obj.answer);
        }
        else if (obj.context?.thoughts) {
          debugLog("Found context with thoughts", { type: typeof obj.context.thoughts });
          if (Array.isArray(obj.context.thoughts)) {
            const formatted = formatThoughts(obj.context.thoughts);
            setThoughtProcess(formatted);
            setHasThoughts(true);
          } else if (typeof obj.context.thoughts === 'string') {
            setThoughtProcess(obj.context.thoughts);
            setHasThoughts(true);
          }
        }
        else if (obj.context?.data_points?.text) {
          debugLog("Found context with data points", { count: obj.context.data_points.text.length });
          processDataPoints(obj.context.data_points.text);
        }
      } catch (e) {
        // Ignore parsing errors for individual lines
        // Sometimes raw includes non-JSON data or partial JSON objects
      }
    });
  };
  
  // Process citation object
  const processCitation = (citation: any) => {
    if (!citation) return;
    
    const title = citation.fileName || citation.id || 'Citation';
    const content = citation.text || '';
    
    setSupportingContent(prev => {
      // Check for duplicates
      const exists = prev.some(source => source.title === title && source.content === content);
      if (exists) return prev;
      
      return [...prev, { title, content, score: citation.score }];
    });
    
    setHasSupporting(true);
  };
  
  // Process supporting content object
  const processSupportingContent = (source: any) => {
    if (!source) return;
    
    const title = source.fileName || source.id || 'Source';
    let content = '';
    
    if (source.excerpts && Array.isArray(source.excerpts)) {
      content = source.excerpts.join('\n\n');
    } else if (source.text) {
      content = source.text;
    } else if (source.content) {
      content = source.content;
    }
    
    // Only process if we have content
    if (content) {
      setSupportingContent(prev => {
        // Check for duplicates
        const exists = prev.some(existingSource => 
          existingSource.title === title && existingSource.content === content);
        if (exists) return prev;
        
        return [...prev, { title, content, score: source.score }];
      });
      
      setHasSupporting(true);
    }
  };
  
  // Process thought process content
  const processThoughtProcess = (thoughts: string) => {
    if (!thoughts) return;
    
    setThoughtProcess(thoughts);
    setHasThoughts(true);
  };
  
  // Process done message
  const processDoneMessage = (answer: any) => {
    // Extract the main content if available
    if (answer.content) {
      setContent(answer.content);
    }
    
    // Extract thought process
    if (answer.thoughts) {
      if (typeof answer.thoughts === 'string') {
        setThoughtProcess(answer.thoughts);
        setHasThoughts(true);
      } else if (Array.isArray(answer.thoughts)) {
        setThoughtProcess(formatThoughts(answer.thoughts));
        setHasThoughts(true);
      } else if (answer.context?.thoughts) {
        if (typeof answer.context.thoughts === 'string') {
          setThoughtProcess(answer.context.thoughts);
          setHasThoughts(true);
        } else if (Array.isArray(answer.context.thoughts)) {
          setThoughtProcess(formatThoughts(answer.context.thoughts));
          setHasThoughts(true);
        }
      }
    }
    
    // Extract supporting content
    if (answer.sources && Array.isArray(answer.sources)) {
      processSources(answer.sources);
    } else if (answer.documentExcerpts && Array.isArray(answer.documentExcerpts)) {
      processSources(answer.documentExcerpts);
    } else if (answer.citations && Array.isArray(answer.citations)) {
      answer.citations.forEach((citation: any) => processCitation(citation));
    }
  };
  
  // Process data points from context
  const processDataPoints = (dataPoints: string[]) => {
    if (!dataPoints || !Array.isArray(dataPoints)) return;
    
    const sources = dataPoints.map((text, index) => {
      // Try to parse filename and content from format like "filename.pdf: content"
      const parts = text.match(/^([^:]+):\s(.+)$/s);
      
      if (parts) {
        return {
          title: parts[1].trim(),
          content: parts[2].trim()
        };
      } else {
        return {
          title: `Source ${index + 1}`,
          content: text
        };
      }
    });
    
    if (sources.length > 0) {
      setSupportingContent(prev => {
        // Filter out duplicates
        const allSources = [...prev, ...sources];
        const uniqueTitles = new Set();
        return allSources.filter(source => {
          const key = `${source.title}:${source.content.substring(0, 50)}`;
          if (uniqueTitles.has(key)) return false;
          uniqueTitles.add(key);
          return true;
        });
      });
      
      setHasSupporting(true);
    }
  };
  
  // Process array of sources
  const processSources = (sources: any[]) => {
    if (!sources || !Array.isArray(sources)) return;
    
    const processedSources = sources.map((source, index) => {
      const title = source.fileName || source.title || `Source ${index + 1}`;
      let content = '';
      
      if (source.excerpts && Array.isArray(source.excerpts)) {
        content = source.excerpts.join('\n\n');
      } else if (source.text) {
        content = source.text;
      } else if (source.content) {
        content = source.content;
      }
      
      return { title, content, score: source.score };
    }).filter(source => source.content);
    
    if (processedSources.length > 0) {
      setSupportingContent(prev => {
        // Filter out duplicates
        const allSources = [...prev, ...processedSources];
        const uniqueTitles = new Set();
        return allSources.filter(source => {
          const key = `${source.title}:${source.content.substring(0, 50)}`;
          if (uniqueTitles.has(key)) return false;
          uniqueTitles.add(key);
          return true;
        });
      });
      
      setHasSupporting(true);
    }
  };
  
  // Function to parse string answers (Safari format)
  const parseStringAnswer = (rawAnswer: string) => {
    // First, extract the human-readable part (before any JSON)
    let humanContent = rawAnswer;
    const jsonStartIndex = rawAnswer.indexOf('{');
    
    if (jsonStartIndex > 0) {
      humanContent = rawAnswer.substring(0, jsonStartIndex).trim();
      debugLog("Extracted human content from string", { length: humanContent.length });
      
      // Try to find and parse JSON parts
      try {
        // Look for the main context object with various patterns
        let contextJson: any = null;
        
        // Pattern 1: Look for {"delta":..., "context":...}
        const deltaContextMatch = rawAnswer.match(/\{"delta"[\s\S]*?"context"[\s\S]*?\}/);
        if (deltaContextMatch) {
          debugLog("Found delta+context pattern");
          try {
            contextJson = JSON.parse(deltaContextMatch[0]);
            debugLog("Successfully parsed delta+context JSON", Object.keys(contextJson.context || {}));
          } catch (e) {
            debugLog("Failed to parse delta+context match");
          }
        }
        
        // Pattern 2: Look for {"type":"done","answer":...}
        if (!contextJson) {
          const doneMatch = rawAnswer.match(/\{"type":"done","answer"[\s\S]*?\}/);
          if (doneMatch) {
            debugLog("Found done+answer pattern");
            try {
              const doneJson = JSON.parse(doneMatch[0]);
              if (doneJson.answer && doneJson.answer.context) {
                debugLog("Extracting context from done+answer");
                contextJson = { context: doneJson.answer.context };
              }
            } catch (e) {
              debugLog("Failed to parse done+answer match");
            }
          }
        }
        
        // Extract data points (supporting content)
        if (contextJson?.context?.data_points?.text && 
            Array.isArray(contextJson.context.data_points.text)) {
          
          debugLog("Found data_points.text", contextJson.context.data_points.text.length);
          
          processDataPoints(contextJson.context.data_points.text);
        }
        
        // Extract thoughts
        if (contextJson?.context?.thoughts) {
          if (Array.isArray(contextJson.context.thoughts)) {
            debugLog("Found thoughts array", contextJson.context.thoughts.length);
            const formattedThoughts = formatThoughts(contextJson.context.thoughts);
            setThoughtProcess(formattedThoughts);
            setHasThoughts(true);
          } else if (typeof contextJson.context.thoughts === 'string') {
            debugLog("Found thoughts string");
            setThoughtProcess(contextJson.context.thoughts);
            setHasThoughts(true);
          } else if (typeof contextJson.context.thoughts === 'object') {
            debugLog("Found thoughts object");
            setThoughtProcess(JSON.stringify(contextJson.context.thoughts, null, 2));
            setHasThoughts(true);
          }
        }
        
        // Look for individual supporting_content objects
        // First try to find all supporting_content objects
        const supportingMatches = Array.from(rawAnswer.matchAll(/\{"type":"supporting_content","source":([\s\S]*?)\}/g));
        debugLog("Found supporting_content matches", supportingMatches.length);
        
        for (const match of supportingMatches) {
          try {
            debugLog("Processing supporting_content match");
            const sourceObj = JSON.parse(`{"source":${match[1]}}`).source;
            processSupportingContent(sourceObj);
          } catch (e) {
            console.error("Error parsing supporting_content:", e);
          }
        }
        
        // Look for citation objects too (they often have content)
        const citationMatches = Array.from(rawAnswer.matchAll(/\{"type":"citation","citation":([\s\S]*?)\}/g));
        debugLog("Found citation matches", citationMatches.length);
        
        for (const match of citationMatches) {
          try {
            debugLog("Processing citation match");
            const citationObj = JSON.parse(`{"citation":${match[1]}}`).citation;
            processCitation(citationObj);
          } catch (e) {
            console.error("Error parsing citation:", e);
          }
        }
        
        // Look for thought process entries
        const thoughtMatches = Array.from(rawAnswer.matchAll(/\{"type":"thought_process","content":([\s\S]*?)\}/g));
        debugLog("Found thought_process matches", thoughtMatches.length);
        
        for (const match of thoughtMatches) {
          try {
            debugLog("Processing thought_process match");
            const content = JSON.parse(`{"content":${match[1]}}`).content;
            processThoughtProcess(content);
          } catch (e) {
            console.error("Error parsing thought_process:", e);
          }
        }
        
        // Look for done messages
        const doneMatches = Array.from(rawAnswer.matchAll(/\{"type":"done","answer":([\s\S]*?)\}/g));
        debugLog("Found done matches", doneMatches.length);
        
        for (const match of doneMatches) {
          try {
            debugLog("Processing done match");
            const answer = JSON.parse(`{"answer":${match[1]}}`).answer;
            processDoneMessage(answer);
          } catch (e) {
            console.error("Error parsing done message:", e);
          }
        }
        
      } catch (e) {
        console.error("Error parsing JSON:", e);
      }
    }
    
    // Store content even if we failed to parse citations
    if (humanContent) {
      setContent(humanContent);
    } else {
      setContent(rawAnswer);
    }
  };
  
  // Function to parse object answers (Chrome format)
  const parseObjectAnswer = (objAnswer: any) => {
    debugLog("Processing object answer with keys", Object.keys(objAnswer));
    
    // Handle streaming updates - just update the content
    if (objAnswer.metadata?.isStreaming === true) {
      debugLog("Processing streaming update");
      setContent(objAnswer.content || objAnswer.delta || "");
      return;
    }
    
    // Extract main content first - this is always needed
    if (objAnswer.content !== undefined) {
      setContent(typeof objAnswer.content === 'string' ? objAnswer.content : JSON.stringify(objAnswer.content));
    } else if (objAnswer.delta !== undefined) {
      setContent(typeof objAnswer.delta === 'string' ? objAnswer.delta : JSON.stringify(objAnswer.delta));
    }
    
    // If the object has a delta and context structure (matching the example)
    if (objAnswer.context) {
      debugLog("Found context structure in object");
      
      // Extract supporting content from data_points.text
      if (objAnswer.context.data_points?.text && 
          Array.isArray(objAnswer.context.data_points.text)) {
        
        debugLog("Found data_points.text in object", objAnswer.context.data_points.text.length);
        processDataPoints(objAnswer.context.data_points.text);
      }
      
      // Extract thoughts
      if (objAnswer.context.thoughts) {
        debugLog("Found thoughts in object context");
        if (Array.isArray(objAnswer.context.thoughts)) {
          const formattedThoughts = formatThoughts(objAnswer.context.thoughts);
          setThoughtProcess(formattedThoughts);
          setHasThoughts(true);
        } else if (typeof objAnswer.context.thoughts === 'string') {
          setThoughtProcess(objAnswer.context.thoughts);
          setHasThoughts(true);
        } else if (typeof objAnswer.context.thoughts === 'object') {
          setThoughtProcess(JSON.stringify(objAnswer.context.thoughts, null, 2));
          setHasThoughts(true);
        }
      }
      
      // Return early as we've processed the context
      return;
    }
    
    // Content might be a JSON string - try to parse if it looks like it
    if (typeof objAnswer.content === 'string' && 
        (objAnswer.content.includes('{"delta":') || 
         objAnswer.content.includes('{"type":') || 
         objAnswer.content.includes('{"context":'))) {
      debugLog("Object answer content contains JSON, parsing as string");
      parseStringAnswer(objAnswer.content);
      return;
    }
    
    // Extract supporting content
    const sources: ChatSource[] = [];
    
    // Try direct supporting_content property or from metadata
    const supportingFromMetadata = objAnswer.metadata?.supportingContent;
    
    if (supportingFromMetadata && Array.isArray(supportingFromMetadata)) {
      debugLog("Found supportingContent in metadata", supportingFromMetadata.length);
      supportingFromMetadata.forEach((item: any, index: number) => {
        sources.push({
          title: item.fileName || item.title || `Source ${index + 1}`,
          content: item.content || item.text || '',
          score: item.score
        });
      });
    }
    
    // Try direct supporting_content property
    if (objAnswer.supporting_content) {
      debugLog("Found supporting_content property", 
               Array.isArray(objAnswer.supporting_content) ? 
               objAnswer.supporting_content.length : 
               typeof objAnswer.supporting_content);
      
      if (Array.isArray(objAnswer.supporting_content)) {
        objAnswer.supporting_content.forEach((item: any, index: number) => {
          debugLog(`Supporting item ${index}`, Object.keys(item));
          sources.push({
            title: item.title || item.source || `Source ${index + 1}`,
            content: item.content || item.text || '',
            score: item.score
          });
        });
      }
    }
    
    // Try supportingContent property (alternate casing)
    if (objAnswer.supportingContent) {
      debugLog("Found supportingContent property", 
               Array.isArray(objAnswer.supportingContent) ? 
               objAnswer.supportingContent.length : 
               typeof objAnswer.supportingContent);
      
      if (Array.isArray(objAnswer.supportingContent)) {
        objAnswer.supportingContent.forEach((item: any, index: number) => {
          debugLog(`SupportingContent item ${index}`, Object.keys(item));
          sources.push({
            title: item.title || item.source || `Source ${index + 1}`,
            content: item.content || item.text || '',
            score: item.score
          });
        });
      }
    }
    
    // Try searchResults property
    if (objAnswer.searchResults?.sources) {
      debugLog("Found searchResults sources", 
               Array.isArray(objAnswer.searchResults.sources) ? 
               objAnswer.searchResults.sources.length : 
               typeof objAnswer.searchResults.sources);
      
      if (Array.isArray(objAnswer.searchResults.sources)) {
        objAnswer.searchResults.sources.forEach((source: any, index: number) => {
          debugLog(`SearchResult source ${index}`, Object.keys(source));
          sources.push({
            title: source.fileName || `Source ${index + 1}`,
            content: source.text || source.excerpts?.join('\n\n') || '',
            score: source.score
          });
        });
      }
    }
    
    // Try documentExcerpts property
    if (objAnswer.documentExcerpts) {
      debugLog("Found documentExcerpts", 
               Array.isArray(objAnswer.documentExcerpts) ? 
               objAnswer.documentExcerpts.length : 
               typeof objAnswer.documentExcerpts);
      
      if (Array.isArray(objAnswer.documentExcerpts)) {
        objAnswer.documentExcerpts.forEach((excerpt: any, index: number) => {
          if (excerpt) {
            debugLog(`DocumentExcerpt ${index}`, Object.keys(excerpt));
            sources.push({
              title: excerpt.fileName || `Document ${index + 1}`,
              content: excerpt.text || excerpt.excerpts?.join('\n\n') || '',
              score: excerpt.score
            });
          }
        });
      }
    }
    
    // Look for any type:supporting_content objects
    if (typeof objAnswer === 'object' && 'type' in objAnswer && objAnswer.type === 'supporting_content' && objAnswer.source) {
      debugLog("Found direct supporting_content object");
      sources.push({
        title: objAnswer.source.fileName || objAnswer.source.id || "Source",
        content: objAnswer.source.text || (objAnswer.source.excerpts ? objAnswer.source.excerpts.join('\n\n') : ''),
        score: objAnswer.source.score
      });
    }
    
    // Look for any type:citation objects
    if (typeof objAnswer === 'object' && 'type' in objAnswer && objAnswer.type === 'citation' && objAnswer.citation) {
      debugLog("Found direct citation object");
      sources.push({
        title: objAnswer.citation.fileName || objAnswer.citation.id || "Citation",
        content: objAnswer.citation.text || '',
        score: objAnswer.citation.score
      });
    }
    
    if (sources.length > 0) {
      debugLog("Total supporting content sources added", sources.length);
      setSupportingContent(prev => {
        // De-duplicate sources
        const allSources = [...prev, ...sources];
        const uniqueSources = new Map();
        
        allSources.forEach(source => {
          const key = `${source.title}:${source.content.substring(0, 50)}`;
          uniqueSources.set(key, source);
        });
        
        return Array.from(uniqueSources.values());
      });
      
      setHasSupporting(true);
    }
    
    // Extract thought process
    let foundThoughts = false;
    
    // Try the thoughtProcess from metadata
    if (objAnswer.metadata?.thoughtProcess) {
      debugLog("Found thoughtProcess in metadata");
      setThoughtProcess(objAnswer.metadata.thoughtProcess);
      setHasThoughts(true);
      foundThoughts = true;
    }
    
    // Try the thoughts property
    if (!foundThoughts && objAnswer.thoughts) {
      debugLog("Found thoughts property", typeof objAnswer.thoughts);
      setHasThoughts(true);
      foundThoughts = true;
      
      if (Array.isArray(objAnswer.thoughts)) {
        setThoughtProcess(formatThoughts(objAnswer.thoughts));
      } else if (typeof objAnswer.thoughts === 'string') {
        setThoughtProcess(objAnswer.thoughts);
      } else {
        setThoughtProcess(JSON.stringify(objAnswer.thoughts, null, 2));
      }
    }
    
    // Try thought_process property
    if (!foundThoughts && objAnswer.thought_process) {
      debugLog("Found thought_process property", typeof objAnswer.thought_process);
      setHasThoughts(true);
      
      if (typeof objAnswer.thought_process === 'string') {
        setThoughtProcess(objAnswer.thought_process);
      } else {
        setThoughtProcess(JSON.stringify(objAnswer.thought_process, null, 2));
      }
    }
    
    // Try session_state property - sometimes contains thought process
    if (!foundThoughts && objAnswer.session_state) {
      debugLog("Found session_state, might contain thoughts");
      setThoughtProcess("Session state: " + JSON.stringify(objAnswer.session_state, null, 2));
      setHasThoughts(true);
    }
  };
  
  // Format thoughts into markdown - handle more formats
  const formatThoughts = (thoughts: any[]): string => {
    if (!thoughts || thoughts.length === 0) return "";
    
    return thoughts.map((thought: any, index: number) => {
      // If it's just a string, return it
      if (typeof thought === 'string') {
        return thought;
      }
      
      let thoughtText = '';
      
      // Add title if available
      if (thought.title) {
        thoughtText += `## ${thought.title}\n\n`;
      } else {
        thoughtText += `## Thought ${index + 1}\n\n`;
      }
      
      // Add description/content
      if (thought.description) {
        if (Array.isArray(thought.description)) {
          thoughtText += thought.description.map((item: any) => {
            if (typeof item === 'string') {
              return item;
            }
            if (item.role && item.content) {
              return `**${item.role}**: ${item.content}\n\n`;
            }
            return JSON.stringify(item, null, 2);
          }).join('\n');
        } else if (typeof thought.description === 'string') {
          thoughtText += thought.description;
        } else {
          thoughtText += JSON.stringify(thought.description, null, 2);
        }
      } else if (thought.content) {
        thoughtText += typeof thought.content === 'string' ? 
          thought.content : JSON.stringify(thought.content, null, 2);
      }
      
      // Add props if available
      if (thought.props && Object.keys(thought.props).length > 0) {
        thoughtText += `\n\n*Using: ${Object.keys(thought.props).join(', ')}*`;
      }
      
      return thoughtText;
    }).join('\n\n---\n\n');
  };
  
  // Copy to clipboard handler
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Toggle source expansion
  const toggleSource = (index: number) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  // Theme colors
  const colors = {
    background: theme === 'dark' ? '#1e1e2e' : '#ffffff',
    text: theme === 'dark' ? '#e4e6eb' : '#18181b',
    border: theme === 'dark' ? '#3f3f5a' : '#e2e8f0',
    accent: theme === 'dark' ? '#ff3f3f' : '#e53e3e',
    highlight: theme === 'dark' ? '#322f3d' : '#f7f7f7',
    tab: {
      active: theme === 'dark' ? '#3f3f5a' : '#f8fafc',
      inactive: theme === 'dark' ? '#1e1e2e' : '#ffffff'
    }
  };
  
  return (
    <div 
      className="rounded-lg shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: colors.background,
        color: colors.text,
        border: `1px solid ${colors.border}`
      }}
    >
      {/* Header with copy button */}
      <div className="flex justify-between items-center p-3 border-b" style={{ borderColor: colors.border }}>
        <h3 className="text-lg font-medium">Answer</h3>
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Copy to clipboard"
        >
          {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
        </button>
      </div>
      
      {/* Tabs for different sections */}
      <div className="border-b" style={{ borderColor: colors.border }}>
        <div className="flex space-x-2 overflow-x-auto">
          <button
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === 'answer' ? 'border-b-2' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('answer')}
            style={{
              borderColor: activeTab === 'answer' ? colors.accent : 'transparent',
              color: activeTab === 'answer' ? colors.accent : colors.text
            }}
          >
            Answer
          </button>
          
          {hasSupporting && (
            <button
              className={`px-3 py-2 text-sm font-medium flex items-center ${
                activeTab === 'supporting' ? 'border-b-2' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setActiveTab('supporting')}
              style={{
                borderColor: activeTab === 'supporting' ? '#0EA5E9' : 'transparent',
                color: activeTab === 'supporting' ? '#0EA5E9' : colors.text
              }}
            >
              <FileText size={14} className="mr-1" />
              Supporting Content ({supportingContent.length})
            </button>
          )}
          
          {hasThoughts && (
            <button
              className={`px-3 py-2 text-sm font-medium flex items-center ${
                activeTab === 'thoughts' ? 'border-b-2' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setActiveTab('thoughts')}
              style={{
                borderColor: activeTab === 'thoughts' ? '#F59E0B' : 'transparent',
                color: activeTab === 'thoughts' ? '#F59E0B' : colors.text
              }}
            >
              <Brain size={14} className="mr-1" />
              Thought Process
            </button>
          )}
        </div>
      </div>
      
      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="p-4"
      >
        {/* Answer content */}
        {activeTab === 'answer' && (
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Supporting content */}
        {activeTab === 'supporting' && (
          <div className="space-y-3">
            {supportingContent.map((source, index) => (
              <div 
                key={index} 
                className="border rounded-md overflow-hidden"
                style={{ borderColor: colors.border }}
              >
                <div 
                  className="p-3 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleSource(index)}
                  style={{ 
                    backgroundColor: expandedSources.has(index) ? colors.highlight : 'transparent' 
                  }}
                >
                  <div className="flex items-center">
                    <FileText size={16} className="text-blue-500 mr-2" />
                    <span className="font-medium">{source.title || `Source ${index + 1}`}</span>
                    {source.score !== undefined && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({Math.round(source.score * 100)}% match)
                      </span>
                    )}
                  </div>
                  {expandedSources.has(index) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                
                {expandedSources.has(index) && (
                  <div 
                    className="p-3 text-sm border-t overflow-auto max-h-96"
                    style={{ 
                      borderColor: colors.border,
                      backgroundColor: colors.highlight
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {source.content || "No content available"}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Thought process */}
        {activeTab === 'thoughts' && (
          <div 
            className="rounded-md p-4 text-sm overflow-auto max-h-96"
            style={{ 
              backgroundColor: colors.highlight,
              borderLeft: `4px solid #F59E0B`
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thoughtProcess}
            </ReactMarkdown>
          </div>
        )}
      </motion.div>
    </div>
  );
}