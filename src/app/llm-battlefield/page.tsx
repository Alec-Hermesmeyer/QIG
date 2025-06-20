"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { 
  Activity, 
  Zap, 
  Users, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Code,
  Server,
  Settings,
  Clock,
  ExternalLink,
  Terminal,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Globe,
  Shield,
  Cpu,
  BarChart3,
  Brain,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Star,
  TrendingUp,
  Package,
  FlaskConical,
  FileDown,
  FileUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ProtectedRoute from "@/components/ProtectedRoute";

const PROXY_URL = "/api/llm-battlefield/proxy";
const BACKEND_URL = "https://python-langgraph-production.up.railway.app";

interface Agent {
  id: string;
  name: string;
  description?: string;
  status?: string;
  capabilities?: string[];
  version?: string;
}

interface Model {
  provider: string;
  model_id: string;
  name?: string;
  description?: string;
  status?: string;
  capabilities?: string[];
  version?: string;
  performance_score?: number;
  last_tested?: string;
  cost_per_token?: number;
  max_tokens?: number;
  created_at?: string;
  updated_at?: string;
}

interface ModelStats {
  total_models: number;
  active_models: number;
  deprecated_models: number;
  total_requests: number;
  avg_response_time: number;
  success_rate: number;
  provider_distribution: Record<string, number>;
  capability_distribution: Record<string, number>;
}

interface HealthStatus {
  status: string;
  timestamp?: string;
  version?: string;
  uptime?: string;
  memory_usage?: number;
  cpu_usage?: number;
  active_connections?: number;
}

interface GraphRequest {
  graph_id?: string;
  input_data?: any;
  agent_id?: string;
  parameters?: any;
}

interface GraphResponse {
  result?: any;
  status?: string;
  execution_time?: number;
  graph_id?: string;
  error?: string;
  metadata?: any;
}

interface DiagnosticResult {
  endpoint: string;
  success: boolean;
  status: string;
  responseTime: number;
  error?: string;
  headers: Record<string, string>;
  timestamp: string;
}

export default function LLMBattlefieldPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [rootInfo, setRootInfo] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [bestModels, setBestModels] = useState<Model[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [graphRequest, setGraphRequest] = useState<GraphRequest>({
    graph_id: "",
    input_data: { message: "Hello from the battlefield!" },
    agent_id: "",
    parameters: { temperature: 0.7, max_tokens: 150 }
  });
  const [graphResponse, setGraphResponse] = useState<GraphResponse | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [executionHistory, setExecutionHistory] = useState<GraphResponse[]>([]);
  const [isCollapsedDiagnostics, setIsCollapsedDiagnostics] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [rawTestResult, setRawTestResult] = useState<any>(null);
  const [newModel, setNewModel] = useState({
    provider: '',
    model_id: '',
    name: '',
    description: '',
    capabilities: [] as string[],
    max_tokens: '',
    cost_per_token: ''
  });
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [testModelPayload, setTestModelPayload] = useState('');

  // Auto-refresh health status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && connectionStatus === 'connected') {
      interval = setInterval(() => {
        checkHealth();
        setLastRefresh(new Date());
      }, 30000); // Every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, connectionStatus]);

  // Model Management Functions
  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/models/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          setModels(Array.isArray(proxyData.data) ? proxyData.data : []);
        }
      }
    } catch (error) {
      console.error('Fetch models error:', error);
    }
  }, []);

  const fetchModelStats = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/models/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          setModelStats(proxyData.data);
        }
      }
    } catch (error) {
      console.error('Fetch model stats error:', error);
    }
  }, []);

  const fetchBestModels = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/models/best`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          setBestModels(Array.isArray(proxyData.data) ? proxyData.data : []);
        }
      }
    } catch (error) {
      console.error('Fetch best models error:', error);
    }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/models/capabilities`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          setCapabilities(Array.isArray(proxyData.data) ? proxyData.data : []);
        }
      }
    } catch (error) {
      console.error('Fetch capabilities error:', error);
    }
  }, []);

  const addModel = useCallback(async () => {
    if (!newModel.provider || !newModel.model_id) return;
    
    setLoading(true);
    try {
      const payload = {
        provider: newModel.provider,
        model_id: newModel.model_id,
        name: newModel.name || undefined,
        description: newModel.description || undefined,
        capabilities: newModel.capabilities.length > 0 ? newModel.capabilities : undefined,
        max_tokens: newModel.max_tokens ? parseInt(newModel.max_tokens) : undefined,
        cost_per_token: newModel.cost_per_token ? parseFloat(newModel.cost_per_token) : undefined
      };

      const response = await fetch(`${PROXY_URL}?endpoint=/models/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          await fetchModels(); // Refresh the models list
          setNewModel({
            provider: '',
            model_id: '',
            name: '',
            description: '',
            capabilities: [],
            max_tokens: '',
            cost_per_token: ''
          });
        }
      }
    } catch (error) {
      console.error('Add model error:', error);
    } finally {
      setLoading(false);
    }
  }, [newModel, fetchModels]);

  const testNewModel = useCallback(async () => {
    if (!testModelPayload) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/models/test-new-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: testModelPayload,
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        setRawTestResult(proxyData);
      }
    } catch (error) {
      console.error('Test model error:', error);
    } finally {
      setLoading(false);
    }
  }, [testModelPayload]);

  const deleteModel = useCallback(async (provider: string, modelId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/models/${provider}/${modelId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        await fetchModels(); // Refresh the models list
      }
    } catch (error) {
      console.error('Delete model error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchModels]);

  const exportConfig = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/models/export/config`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          // Download the config file
          const blob = new Blob([JSON.stringify(proxyData.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `model-config-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Export config error:', error);
    }
  }, []);

  // Test connectivity
  const testConnection = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        setDebugInfo(proxyData);
        
        if (proxyData.success) {
          setRootInfo(proxyData.data);
          setConnectionStatus('connected');
          // Auto-load health, agents, and models on successful connection
          if (!healthStatus) await checkHealth();
          if (agents.length === 0) await getAvailableAgents();
          if (models.length === 0) await fetchModels();
          if (!modelStats) await fetchModelStats();
          if (bestModels.length === 0) await fetchBestModels();
          if (capabilities.length === 0) await fetchCapabilities();
        } else {
          setConnectionStatus('error');
          console.error('Connection failed:', proxyData.status, proxyData.error);
        }
      } else {
        setConnectionStatus('error');
        console.error('Proxy failed:', response.status);
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('Connection error:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [healthStatus, agents.length]);

  // Check health endpoint
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          setHealthStatus(proxyData.data);
        }
      }
    } catch (error) {
      console.error('Health check error:', error);
    }
  }, []);

  // Get available agents
  const getAvailableAgents = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/available_agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          const data = proxyData.data;
          setAgents(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Get agents error:', error);
    }
  }, []);

  // Run comprehensive diagnostics
  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    const results: DiagnosticResult[] = [];
    // Test common LangGraph/LangChain and Model Management endpoints
    const endpoints = [
      '/', 
      '/health', 
      '/available_agents',
      '/api-info',
      '/docs',
      '/openapi.json',
      '/chat',
      '/run_graph',
      '/models/',
      '/models/stats',
      '/models/best',
      '/models/capabilities',
      '/models/export/config',
      '/invoke',
      '/stream',
      '/batch',
      '/astream',
      '/ainvoke',
      '/abatch',
      '/agents',
      '/graphs',
      '/tasks',
      '/execute',
      '/process',
      '/api/chat',
      '/api/run',
      '/api/invoke'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${PROXY_URL}?endpoint=${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const endTime = Date.now();
        const data = await response.json();
        
        results.push({
          endpoint,
          success: data.success,
          status: data.status.toString(),
          responseTime: endTime - startTime,
          error: data.error || undefined,
          headers: data.headers || {},
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          endpoint,
          success: false,
          status: 'NETWORK_ERROR',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          headers: {},
          timestamp: new Date().toISOString()
        });
      }
    }
    
    setDiagnosticResults(results);
    setLoading(false);
  }, []);

  // Execute graph
  const runGraph = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${PROXY_URL}?endpoint=/run_graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphRequest),
      });
      
      let result: GraphResponse;
      if (response.ok) {
        const proxyData = await response.json();
        if (proxyData.success) {
          result = {
            ...proxyData.data,
            execution_time: proxyData.execution_time,
            status: 'success'
          };
        } else {
          result = { 
            error: `HTTP ${proxyData.status}: ${proxyData.error}`,
            status: 'error'
          };
        }
      } else {
        const errorData = await response.text();
        result = { 
          error: `Proxy error ${response.status}: ${errorData}`,
          status: 'error'
        };
      }
      
      setGraphResponse(result);
      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      const errorResult = { 
        error: `Network error: ${error}`,
        status: 'error' as const
      };
      setGraphResponse(errorResult);
      setExecutionHistory(prev => [errorResult, ...prev.slice(0, 9)]);
    } finally {
      setLoading(false);
    }
  }, [graphRequest]);

  // Send chat message
  const sendChatMessage = useCallback(async () => {
    if (!chatMessage.trim() || loading) return;
    
    const userMessage = {
      role: 'user' as const,
      content: chatMessage,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    const originalMessage = chatMessage;
    setChatMessage("");
    setLoading(true);
    
    try {
      console.log('🚀 Starting chat request with message:', originalMessage);
      
            // Try different chat request formats based on the API documentation
      const chatPayloads = [
        // Primary chat endpoint from docs
        {
          name: '/chat/complete with message',
          endpoint: '/chat/complete',
          payload: {
            message: originalMessage,
            include_evaluation: true,
            stream: false
          }
        },
        {
          name: '/chat/complete with session',
          endpoint: '/chat/complete',
          payload: {
            message: originalMessage,
            session_id: `session_${Date.now()}`,
            include_evaluation: false,
            stream: false
          }
        },
        // Correct /run_graph format from docs
        {
          name: '/run_graph (correct API format)',
          endpoint: '/run_graph',
          payload: {
            task: { 
              id: `chat_task_${Date.now()}`, 
              description: originalMessage 
            },
            agents: ["openai"],
            config: { max_rounds: 1 }
          }
        },
        {
          name: '/run_graph (minimal format)',
          endpoint: '/run_graph',
          payload: {
            task: { 
              id: "chat_task", 
              description: originalMessage 
            },
            agents: ["openai"]
          }
        },
        {
          name: '/run_graph (no config)',
          endpoint: '/run_graph',
          payload: {
            task: { 
              id: "user_query", 
              description: originalMessage 
            },
            agents: ["default", "openai"]
          }
        }
      ];
      
      let proxyData;
      let response;
      let successfulFormat = null;
      
      // Try each format until one works
      for (const format of chatPayloads) {
        console.log(`🔍 Trying ${format.name}...`);
        console.log('📤 Payload:', format.payload);
        
        try {
          response = await fetch(`${PROXY_URL}?endpoint=${format.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(format.payload),
          });
          
          console.log(`📥 ${format.name} response status:`, response.status);
          proxyData = await response.json();
          console.log(`📥 ${format.name} response data:`, proxyData);
          
                     // If this format worked, break out of the loop
           if (response.ok && proxyData.success) {
             successfulFormat = format.name;
             console.log(`✅ ${format.name} worked!`);
             break;
           } else {
             console.log(`❌ ${format.name} failed:`, proxyData.error || proxyData.status);
             // Log validation errors for 422 responses to understand the expected format
             if (proxyData.status === 422 && proxyData.data?.detail) {
               console.log(`🔍 ${format.name} validation details:`, JSON.stringify(proxyData.data.detail, null, 2));
               // Also log each validation error separately for clarity
               if (Array.isArray(proxyData.data.detail)) {
                 proxyData.data.detail.forEach((error: any, idx: number) => {
                   console.log(`   Error ${idx + 1}:`, JSON.stringify(error, null, 2));
                 });
               }
             }
           }
        } catch (error) {
          console.log(`💥 ${format.name} error:`, error);
          continue;
        }
      }
      
             if (response && proxyData && response.ok && proxyData.success) {
         console.log('✅ Success! Processing response data:', proxyData.data);
         console.log('🎯 Successful format was:', successfulFormat);
         
         // Parse response based on the API documentation
         let responseText = '';
         
         if (successfulFormat?.includes('/chat/complete')) {
           // Handle /chat/complete response format
           responseText = proxyData.data?.message?.content || 
                         proxyData.data?.message || 
                         proxyData.data?.response ||
                         'No message content found in response';
         } else if (successfulFormat?.includes('/run_graph')) {
           // Handle /run_graph response format  
           responseText = proxyData.data?.result || 
                         proxyData.data?.output ||
                         proxyData.data?.response ||
                         'No result found in run_graph response';
         } else {
           // Generic fallback
           responseText = proxyData.data?.result || 
                         proxyData.data?.response || 
                         proxyData.data?.message?.content ||
                         proxyData.data?.message || 
                         proxyData.data?.output ||
                         proxyData.data?.content ||
                         proxyData.data?.answer ||
                         (typeof proxyData.data === 'string' ? proxyData.data : 'Response received but content format unknown');
         }
         
                   console.log('💬 Raw response data:', proxyData.data);
          console.log('💬 Extracted response text:', responseText);
         
         setChatHistory(prev => [...prev, {
           role: 'assistant',
           content: `${responseText}\n\n✅ Used format: ${successfulFormat}`,
           timestamp: new Date()
         }]);
       } else {
         console.log('❌ All formats failed');
         
         const errorMessage = response && proxyData ? 
           `Error (${response.status}): ${proxyData.error || proxyData.status || 'Unknown error'}\n\nLast response: ${JSON.stringify(proxyData, null, 2)}\n\n💡 Try running diagnostics to see available endpoints.` :
           'All chat formats failed. The backend may not support chat functionality or may be down.\n\n💡 Click "Run Diagnostics" below to discover available endpoints.';
         
         setChatHistory(prev => [...prev, {
           role: 'assistant',
           content: errorMessage,
           timestamp: new Date()
         }]);
         
         // Auto-run diagnostics if we haven't run them yet
         if (diagnosticResults.length === 0) {
           console.log('🔍 Auto-running diagnostics to discover endpoints...');
           setTimeout(() => runDiagnostics(), 1000);
         }
       }
    } catch (error) {
      console.error('💥 Network/Parse Error:', error);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Network Error: ${error}\n\nThis usually means the backend is not responding or returned invalid JSON.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }, [chatMessage, loading]);

  // Test raw /run_graph endpoint with multiple task object formats
  const testRawEndpoint = useCallback(async () => {
    setLoading(true);
    const testMessage = "Hello, test message";
    
    console.log('🧪 Testing /run_graph with object formats...');
    
         // Try task formats based on the API documentation
     const taskFormats = [
       { 
         name: "Correct API format (id + description)", 
         task: { id: "chat_task_" + Date.now(), description: testMessage } 
       },
       { 
         name: "API format with config", 
         task: { id: "chat_task", description: testMessage },
         config: { max_rounds: 1 }
       },
       { 
         name: "Simple task object", 
         task: { description: testMessage } 
       }
     ];
    
    const results = [];
    
    for (const format of taskFormats) {
      try {
        console.log(`🧪 Testing ${format.name}:`, format.task);
        
        const response = await fetch(`${PROXY_URL}?endpoint=/run_graph`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: format.task,
            agents: ["default"]
          }),
        });
        
        const data = await response.json();
        
        results.push({
          format: format.name,
          payload: { task: format.task, agents: ["default"] },
          response: data,
          success: data.success || false,
          status: data.status
        });
        
        console.log(`🧪 ${format.name} result:`, data.success ? '✅ SUCCESS' : `❌ ${data.status}`);
        
        // If this one worked, we can stop testing
        if (data.success) {
          console.log('🎉 Found working format!', format.name);
          break;
        }
        
      } catch (error) {
        console.error(`🧪 ${format.name} error:`, error);
        results.push({
          format: format.name,
          error: error,
          success: false
        });
      }
    }
    
    setRawTestResult({
      endpoint: '/run_graph',
      testType: 'Multiple task object formats',
      results: results,
      timestamp: new Date().toISOString()
    });
    
    setLoading(false);
  }, []);

  // Copy to clipboard utility
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show toast notification
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'connected':
      case 'healthy':
      case 'success':
      case 'ok':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-600" />;
      case 'error':
        return <WifiOff className="h-5 w-5 text-red-600" />;
      default:
        return <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center">
                  <Cpu className="mr-3 text-blue-600" />
                  LLM Battlefield
                </h1>
                <p className="text-slate-600 text-lg">
                  LangGraph Backend Testing & Agent Management Console
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getConnectionIcon()}
                  <Badge className={`${getStatusColor(connectionStatus)} border`}>
                    {connectionStatus.toUpperCase()}
                  </Badge>
                </div>
                
                <Button
                  onClick={() => testConnection()}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Globe className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Backend</p>
                      <p className="text-lg font-bold text-slate-800">
                        {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Brain className="h-8 w-8 text-indigo-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Models</p>
                      <p className="text-lg font-bold text-slate-800">{models.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Agents</p>
                      <p className="text-lg font-bold text-slate-800">{agents.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Executions</p>
                      <p className="text-lg font-bold text-slate-800">{executionHistory.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Last Check</p>
                      <p className="text-lg font-bold text-slate-800">
                        {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Main Tabs Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="overview" className="flex items-center">
                <Activity className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center">
                <Brain className="mr-2 h-4 w-4" />
                Models
              </TabsTrigger>
              <TabsTrigger value="agents" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="playground" className="flex items-center">
                <Zap className="mr-2 h-4 w-4" />
                Playground
              </TabsTrigger>
              <TabsTrigger value="diagnostics" className="flex items-center">
                <Terminal className="mr-2 h-4 w-4" />
                Diagnostics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Connection Status */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Server className="mr-2 text-blue-600" size={20} />
                          Connection Status
                        </div>
                        <Button
                          onClick={() => setAutoRefresh(!autoRefresh)}
                          variant="outline"
                          size="sm"
                          className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
                        >
                          <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                          Auto Refresh
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Backend connectivity and basic health status
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            connectionStatus === 'connected' ? 'bg-green-500' : 
                            connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <span className="font-medium">
                            {BACKEND_URL.replace('https://', '')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(connectionStatus)}>
                            {connectionStatus}
                          </Badge>
                          <Button
                            onClick={() => window.open(BACKEND_URL, '_blank')}
                            variant="ghost"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                                             {connectionStatus === 'error' && (
                         <Alert>
                           <AlertCircle className="h-4 w-4" />
                           <AlertDescription>
                             <strong>Connection Failed:</strong> The backend service may be starting up or experiencing issues. 
                             Railway apps can take 30-60 seconds to wake up from sleep mode.
                           </AlertDescription>
                         </Alert>
                       )}

                      {rootInfo && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <Label className="text-sm font-medium text-green-700">Backend Response:</Label>
                          <pre className="text-xs text-green-600 mt-1 overflow-x-auto">
                            {JSON.stringify(rootInfo, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Health Status */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="mr-2 text-green-600" size={20} />
                        Health Metrics
                      </CardTitle>
                      <CardDescription>
                        Real-time backend performance metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {healthStatus ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-3">
                              <Label className="text-xs text-slate-600">Status</Label>
                              <p className="text-lg font-semibold text-slate-800">{healthStatus.status}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                              <Label className="text-xs text-slate-600">Uptime</Label>
                              <p className="text-lg font-semibold text-slate-800">{healthStatus.uptime || 'N/A'}</p>
                            </div>
                            {healthStatus.memory_usage && (
                              <div className="bg-slate-50 rounded-lg p-3">
                                <Label className="text-xs text-slate-600">Memory</Label>
                                <p className="text-lg font-semibold text-slate-800">{healthStatus.memory_usage}%</p>
                              </div>
                            )}
                            {healthStatus.cpu_usage && (
                              <div className="bg-slate-50 rounded-lg p-3">
                                <Label className="text-xs text-slate-600">CPU</Label>
                                <p className="text-lg font-semibold text-slate-800">{healthStatus.cpu_usage}%</p>
                              </div>
                            )}
                          </div>
                          
                          <Button onClick={checkHealth} disabled={loading} variant="outline" className="w-full">
                            <Activity className="mr-2 h-4 w-4" />
                            Refresh Health
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                          <p className="text-slate-500">No health data available</p>
                          <Button onClick={checkHealth} disabled={loading} className="mt-3">
                            <Activity className="mr-2 h-4 w-4" />
                            Check Health
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            {/* Models Tab */}
            <TabsContent value="models" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                {/* Model Statistics */}
                {modelStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <TrendingUp className="mr-2 text-green-600" size={20} />
                          Model Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-600">Success Rate</span>
                            <span className="font-semibold">{modelStats.success_rate?.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-600">Avg Response Time</span>
                            <span className="font-semibold">{modelStats.avg_response_time?.toFixed(0)}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-600">Total Requests</span>
                            <span className="font-semibold">{modelStats.total_requests?.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Package className="mr-2 text-blue-600" size={20} />
                          Model Inventory
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-600">Total Models</span>
                            <span className="font-semibold">{modelStats.total_models}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-600">Active Models</span>
                            <span className="font-semibold text-green-600">{modelStats.active_models}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-600">Deprecated</span>
                            <span className="font-semibold text-red-600">{modelStats.deprecated_models}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Star className="mr-2 text-yellow-600" size={20} />
                            Top Models
                          </div>
                          <Button
                            onClick={fetchBestModels}
                            variant="ghost"
                            size="sm"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {bestModels.slice(0, 3).map((model, index) => (
                            <div key={`${model.provider}-${model.model_id}`} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center justify-center mr-2">
                                  {index + 1}
                                </div>
                                <span className="text-sm font-medium">{model.name || model.model_id}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Model Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Add New Model */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Plus className="mr-2 text-green-600" size={20} />
                        Add New Model
                      </CardTitle>
                      <CardDescription>
                        Register a new AI model in the system
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="provider">Provider</Label>
                          <Input
                            id="provider"
                            value={newModel.provider}
                            onChange={(e) => setNewModel({...newModel, provider: e.target.value})}
                            placeholder="openai, anthropic, etc."
                          />
                        </div>
                        <div>
                          <Label htmlFor="model_id">Model ID</Label>
                          <Input
                            id="model_id"
                            value={newModel.model_id}
                            onChange={(e) => setNewModel({...newModel, model_id: e.target.value})}
                            placeholder="gpt-4, claude-3, etc."
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="name">Display Name (optional)</Label>
                        <Input
                          id="name"
                          value={newModel.name}
                          onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                          placeholder="GPT-4 Turbo"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          value={newModel.description}
                          onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                          placeholder="Model description and capabilities"
                          rows={2}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="max_tokens">Max Tokens</Label>
                          <Input
                            id="max_tokens"
                            type="number"
                            value={newModel.max_tokens}
                            onChange={(e) => setNewModel({...newModel, max_tokens: e.target.value})}
                            placeholder="4096"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cost_per_token">Cost per Token</Label>
                          <Input
                            id="cost_per_token"
                            type="number"
                            step="0.000001"
                            value={newModel.cost_per_token}
                            onChange={(e) => setNewModel({...newModel, cost_per_token: e.target.value})}
                            placeholder="0.00001"
                          />
                        </div>
                      </div>
                      
                      <Button 
                        onClick={addModel} 
                        disabled={loading || !newModel.provider || !newModel.model_id}
                        className="w-full"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add Model
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Test New Model */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FlaskConical className="mr-2 text-purple-600" size={20} />
                        Test Model
                      </CardTitle>
                      <CardDescription>
                        Test a model configuration before adding it
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="test-payload">Test Payload (JSON)</Label>
                        <Textarea
                          id="test-payload"
                          value={testModelPayload}
                          onChange={(e) => setTestModelPayload(e.target.value)}
                          placeholder={JSON.stringify({
                            provider: "openai",
                            model_id: "gpt-4",
                            test_message: "Hello, world!"
                          }, null, 2)}
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <Button 
                        onClick={testNewModel} 
                        disabled={loading || !testModelPayload}
                        className="w-full"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                        Test Model
                      </Button>
                      
                      {rawTestResult && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium">Test Result:</Label>
                          <div className={`rounded-lg p-4 mt-2 ${
                            rawTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                          }`}>
                            <pre className={`text-xs overflow-x-auto whitespace-pre-wrap ${
                              rawTestResult.success ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {JSON.stringify(rawTestResult, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Model List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Brain className="mr-2 text-blue-600" size={20} />
                        Registered Models
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={exportConfig}
                          variant="outline"
                          size="sm"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Config
                        </Button>
                        <Button
                          onClick={fetchModels}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Manage and monitor all registered AI models
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {models.length > 0 ? (
                      <div className="space-y-4">
                        {models.map((model) => (
                          <Card key={`${model.provider}-${model.model_id}`} className="border-slate-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <h4 className="font-semibold text-slate-800">
                                      {model.name || model.model_id}
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                      {model.provider} • {model.model_id}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(model.status || 'unknown')}>
                                    {model.status || 'Unknown'}
                                  </Badge>
                                  <Button
                                    onClick={() => deleteModel(model.provider, model.model_id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {model.description && (
                                <p className="text-sm text-slate-600 mb-3">{model.description}</p>
                              )}
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                {model.max_tokens && (
                                  <div>
                                    <span className="text-slate-500">Max Tokens:</span>
                                    <span className="ml-1 font-medium">{model.max_tokens.toLocaleString()}</span>
                                  </div>
                                )}
                                {model.cost_per_token && (
                                  <div>
                                    <span className="text-slate-500">Cost/Token:</span>
                                    <span className="ml-1 font-medium">${model.cost_per_token}</span>
                                  </div>
                                )}
                                {model.performance_score && (
                                  <div>
                                    <span className="text-slate-500">Performance:</span>
                                    <span className="ml-1 font-medium">{model.performance_score}/10</span>
                                  </div>
                                )}
                                {model.last_tested && (
                                  <div>
                                    <span className="text-slate-500">Last Tested:</span>
                                    <span className="ml-1 font-medium">{new Date(model.last_tested).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              
                              {model.capabilities && model.capabilities.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {model.capabilities.map((capability, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {capability}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Brain className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                        <p className="text-slate-500 mb-3">No models registered</p>
                        <Button onClick={fetchModels} disabled={loading}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Load Models
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Agents Tab */}
            <TabsContent value="agents" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="mr-2 text-purple-600" size={20} />
                        Available Agents
                      </div>
                      <Button 
                        onClick={getAvailableAgents} 
                        disabled={loading}
                        variant="outline"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh Agents
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Discover and manage AI agents in the battlefield
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {agents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {agents.map((agent, index) => (
                          <Card key={agent.id || index} className="border-purple-200 bg-purple-50/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-purple-800">
                                  {agent.name || agent.id}
                                </h3>
                                {agent.status && (
                                  <Badge variant="outline" className={getStatusColor(agent.status)}>
                                    {agent.status}
                                  </Badge>
                                )}
                              </div>
                              
                              {agent.description && (
                                <p className="text-sm text-purple-600 mb-3">{agent.description}</p>
                              )}
                              
                              {agent.capabilities && (
                                <div className="mb-3">
                                  <Label className="text-xs text-slate-600">Capabilities:</Label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {agent.capabilities.map((capability, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {capability}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>ID: {agent.id}</span>
                                {agent.version && <span>v{agent.version}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                        <p className="text-slate-500 mb-3">No agents discovered yet</p>
                        <Button onClick={getAvailableAgents} disabled={loading}>
                          <Users className="mr-2 h-4 w-4" />
                          Discover Agents
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

                         {/* Playground Tab */}
             <TabsContent value="playground" className="space-y-6">
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6 }}
               >
                 {/* Raw Endpoint Test */}
                 <Card className="mb-6">
                   <CardHeader>
                     <CardTitle className="flex items-center">
                       <Terminal className="mr-2 text-orange-600" size={20} />
                       Raw Endpoint Test
                     </CardTitle>
                     <CardDescription>
                       Test the /run_graph endpoint directly to see the exact error format
                     </CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="flex items-center space-x-4 mb-4">
                       <Button 
                         onClick={testRawEndpoint} 
                         disabled={loading || connectionStatus !== 'connected'}
                       >
                         {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Terminal className="h-4 w-4 mr-2" />}
                         Test /run_graph
                       </Button>
                       <Button 
                         onClick={() => window.open(`${BACKEND_URL}/docs`, '_blank')}
                         variant="outline"
                       >
                         <ExternalLink className="h-4 w-4 mr-2" />
                         Open API Docs
                       </Button>
                     </div>
                     
                     {rawTestResult && (
                       <div className="bg-slate-50 border rounded-lg p-4">
                         <div className="flex items-center justify-between mb-3">
                           <Label className="text-sm font-medium">Raw Response</Label>
                           <Button
                             onClick={() => copyToClipboard(JSON.stringify(rawTestResult, null, 2))}
                             variant="ghost"
                             size="sm"
                           >
                             <Copy className="h-4 w-4" />
                           </Button>
                         </div>
                         <pre className="text-xs bg-white border rounded p-3 overflow-x-auto whitespace-pre-wrap">
                           {JSON.stringify(rawTestResult, null, 2)}
                         </pre>
                       </div>
                     )}
                   </CardContent>
                 </Card>

                 {/* Quick Chat Test */}
                 <Card className="mb-6">
                   <CardHeader>
                     <CardTitle className="flex items-center">
                       <Zap className="mr-2 text-blue-600" size={20} />
                       Quick Chat Test
                     </CardTitle>
                     <CardDescription>
                       Test the backend service with a simple chat interface
                     </CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Chat Input */}
                       <div className="space-y-4">
                         <div className="flex space-x-2">
                           <Input
                             placeholder="Type your message here..."
                             value={chatMessage}
                             onChange={(e) => setChatMessage(e.target.value)}
                             onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                             disabled={loading || connectionStatus !== 'connected'}
                           />
                           <Button 
                             onClick={sendChatMessage} 
                             disabled={loading || !chatMessage.trim() || connectionStatus !== 'connected'}
                           >
                             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                           </Button>
                         </div>
                         
                         {connectionStatus !== 'connected' && (
                           <Alert>
                             <AlertCircle className="h-4 w-4" />
                             <AlertDescription>
                               Connect to backend first to test chat functionality
                             </AlertDescription>
                           </Alert>
                         )}
                         
                         <div className="flex space-x-2">
                           <Button 
                             onClick={() => setChatMessage("Hello! Can you help me?")}
                             variant="outline" 
                             size="sm"
                             disabled={loading}
                           >
                             Test Message 1
                           </Button>
                           <Button 
                             onClick={() => setChatMessage("What can you do?")}
                             variant="outline" 
                             size="sm"
                             disabled={loading}
                           >
                             Test Message 2
                           </Button>
                           <Button 
                             onClick={() => setChatHistory([])}
                             variant="outline" 
                             size="sm"
                             disabled={loading}
                           >
                             Clear Chat
                           </Button>
                           <Button 
                             onClick={() => setActiveTab("diagnostics")}
                             variant="outline" 
                             size="sm"
                           >
                             Check Endpoints
                           </Button>
                           <Button 
                             onClick={() => window.open(`${BACKEND_URL}/docs`, '_blank')}
                             variant="outline" 
                             size="sm"
                           >
                             API Docs
                           </Button>
                         </div>
                       </div>
                       
                       {/* Chat History */}
                       <div className="space-y-4">
                         <Label className="text-sm font-medium">Chat History</Label>
                         <div className="bg-slate-50 border rounded-lg p-4 h-64 overflow-y-auto">
                           {chatHistory.length === 0 ? (
                             <div className="text-center text-slate-500 py-8">
                               <p>No messages yet</p>
                               <p className="text-xs mt-1">Send a message to test the service</p>
                             </div>
                           ) : (
                             <div className="space-y-3">
                               {chatHistory.map((msg, index) => (
                                 <div key={index} className={`p-3 rounded-lg ${
                                   msg.role === 'user' 
                                     ? 'bg-blue-100 border-blue-200 ml-8' 
                                     : 'bg-white border-slate-200 mr-8'
                                 } border`}>
                                   <div className="flex items-center justify-between mb-1">
                                     <span className={`text-xs font-medium ${
                                       msg.role === 'user' ? 'text-blue-700' : 'text-slate-700'
                                     }`}>
                                       {msg.role === 'user' ? 'You' : 'Assistant'}
                                     </span>
                                     <span className="text-xs text-slate-500">
                                       {msg.timestamp.toLocaleTimeString()}
                                     </span>
                                   </div>
                                   <div className={`text-sm ${
                                     msg.role === 'user' ? 'text-blue-800' : 'text-slate-800'
                                   }`}>
                                     {msg.role === 'assistant' ? (
                                       <div className="prose prose-sm max-w-none">
                                         <ReactMarkdown 
                                           components={{
                                             p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                             code: ({children}) => <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                             pre: ({children}) => <pre className="bg-slate-100 p-2 rounded text-xs overflow-x-auto">{children}</pre>,
                                             ul: ({children}) => <ul className="ml-4 mb-2 list-disc">{children}</ul>,
                                             ol: ({children}) => <ol className="ml-4 mb-2 list-decimal">{children}</ol>,
                                             li: ({children}) => <li className="mb-1">{children}</li>,
                                             h1: ({children}) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                                             h2: ({children}) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                                             h3: ({children}) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                                             blockquote: ({children}) => <blockquote className="border-l-2 border-slate-300 pl-2 italic mb-2">{children}</blockquote>,
                                             strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                             em: ({children}) => <em className="italic">{children}</em>
                                           }}
                                         >
                                           {msg.content}
                                         </ReactMarkdown>
                                       </div>
                                     ) : (
                                       <p>{msg.content}</p>
                                     )}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Input Panel */}
                  <div className="xl:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Settings className="mr-2 text-orange-600" size={20} />
                          Graph Configuration
                        </CardTitle>
                        <CardDescription>
                          Configure your graph execution parameters
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="graph-id">Graph ID</Label>
                          <Input
                            id="graph-id"
                            placeholder="Enter graph identifier"
                            value={graphRequest.graph_id || ''}
                            onChange={(e) => setGraphRequest(prev => ({ ...prev, graph_id: e.target.value }))}
                          />
                        </div>

                        <div>
                          <Label htmlFor="agent-id">Agent ID</Label>
                          <Input
                            id="agent-id"
                            placeholder="Select or enter agent ID"
                            value={graphRequest.agent_id || ''}
                            onChange={(e) => setGraphRequest(prev => ({ ...prev, agent_id: e.target.value }))}
                          />
                          {agents.length > 0 && (
                            <div className="mt-2 text-sm text-slate-600">
                              Available: {agents.map(a => a.id).join(', ')}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="input-data">Input Data (JSON)</Label>
                          <Textarea
                            id="input-data"
                            placeholder='{"message": "Your input here"}'
                            className="font-mono text-sm"
                            rows={4}
                            value={JSON.stringify(graphRequest.input_data, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setGraphRequest(prev => ({ ...prev, input_data: parsed }));
                              } catch (err) {
                                // Invalid JSON - keep for editing
                              }
                            }}
                          />
                        </div>

                        <div>
                          <Label htmlFor="parameters">Parameters (JSON)</Label>
                          <Textarea
                            id="parameters"
                            placeholder='{"temperature": 0.7}'
                            className="font-mono text-sm"
                            rows={3}
                            value={JSON.stringify(graphRequest.parameters, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setGraphRequest(prev => ({ ...prev, parameters: parsed }));
                              } catch (err) {
                                // Invalid JSON - keep for editing
                              }
                            }}
                          />
                        </div>

                        <Button 
                          onClick={runGraph} 
                          disabled={loading || connectionStatus !== 'connected'}
                          className="w-full"
                          size="lg"
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                          Execute Graph
                        </Button>

                        {connectionStatus !== 'connected' && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Connect to backend first to execute graphs
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Results Panel */}
                  <div className="xl:col-span-2">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Code className="mr-2 text-blue-600" size={20} />
                            Execution Results
                          </div>
                          {graphResponse && (
                            <Button
                              onClick={() => copyToClipboard(JSON.stringify(graphResponse, null, 2))}
                              variant="outline"
                              size="sm"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </Button>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Real-time graph execution output and metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {graphResponse ? (
                          <div className="space-y-4">
                            {/* Status Bar */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center">
                                {graphResponse.error ? 
                                  <AlertCircle className="mr-2 h-5 w-5 text-red-500" /> :
                                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                                }
                                <span className="font-medium">
                                  {graphResponse.error ? 'Execution Failed' : 'Execution Successful'}
                                </span>
                              </div>
                              {graphResponse.execution_time && (
                                <Badge variant="outline">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {graphResponse.execution_time}ms
                                </Badge>
                              )}
                            </div>

                            {/* Response Content */}
                            <div className={`rounded-lg p-4 ${
                              graphResponse.error ? 
                                'bg-red-50 border border-red-200' : 
                                'bg-green-50 border border-green-200'
                            }`}>
                              <pre className={`text-sm overflow-x-auto whitespace-pre-wrap ${
                                graphResponse.error ? 'text-red-700' : 'text-green-700'
                              }`}>
                                {JSON.stringify(graphResponse, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <Terminal className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-600 mb-2">Ready to Execute</h3>
                            <p className="text-slate-500">Configure your graph parameters and click execute to see results</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Execution History */}
                {executionHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Database className="mr-2 text-purple-600" size={20} />
                        Execution History
                      </CardTitle>
                      <CardDescription>
                        Recent graph executions and their results
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {executionHistory.map((execution, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            execution.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {execution.error ? 
                                  <AlertCircle className="mr-2 h-4 w-4 text-red-500" /> :
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                }
                                <span className="text-sm font-medium">
                                  Execution #{executionHistory.length - index}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {execution.execution_time && (
                                  <Badge variant="outline" className="text-xs">
                                    {execution.execution_time}ms
                                  </Badge>
                                )}
                                <span className="text-xs text-slate-500">
                                  {new Date().toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            {execution.error && (
                              <p className="text-sm text-red-600 mt-1 truncate">{execution.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Diagnostics Tab */}
            <TabsContent value="diagnostics" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Terminal className="mr-2 text-slate-600" size={20} />
                        System Diagnostics
                      </div>
                      <Button 
                        onClick={runDiagnostics} 
                        disabled={loading}
                        variant="outline"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Run Full Diagnostics
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Comprehensive backend connectivity and endpoint testing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {diagnosticResults.length > 0 ? (
                      <div className="space-y-4">
                        {diagnosticResults.map((result, index) => (
                          <Card key={index} className="border-slate-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                                    {result.endpoint}
                                  </code>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(result.success ? 'success' : 'error')}>
                                    {result.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {result.responseTime}ms
                                  </Badge>
                                </div>
                              </div>
                              
                              {result.error && (
                                <Alert className="mb-3">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>{result.error}</AlertDescription>
                                </Alert>
                              )}
                              
                                                             <details className="mt-3">
                                 <summary className="flex items-center text-sm text-slate-600 hover:text-slate-800 cursor-pointer">
                                   <ChevronRight className="mr-1 h-4 w-4" />
                                   View Details
                                 </summary>
                                 <div className="mt-3">
                                   <div className="bg-slate-50 rounded-lg p-3">
                                     <Label className="text-xs font-medium text-slate-700">Headers & Metadata:</Label>
                                     <pre className="text-xs text-slate-600 mt-1 overflow-x-auto">
                                       {JSON.stringify({
                                         timestamp: result.timestamp,
                                         headers: result.headers
                                       }, null, 2)}
                                     </pre>
                                   </div>
                                 </div>
                               </details>
                            </CardContent>
                          </Card>
                        ))}
                        
                        <div className="text-center text-sm text-slate-500 mt-4">
                          Last diagnostic run: {new Date(diagnosticResults[0]?.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Terminal className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                        <p className="text-slate-500 mb-3">No diagnostic data available</p>
                        <Button onClick={runDiagnostics} disabled={loading}>
                          <Terminal className="mr-2 h-4 w-4" />
                          Run Diagnostics
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                                 {/* Debug Information */}
                 {debugInfo && (
                   <Card>
                     <CardHeader className="pb-3">
                       <CardTitle className="flex items-center justify-between">
                         <div className="flex items-center">
                           <Shield className="mr-2 text-blue-600" size={20} />
                           Debug Information
                         </div>
                         <Button
                           onClick={() => setIsCollapsedDiagnostics(!isCollapsedDiagnostics)}
                           variant="ghost"
                           size="sm"
                         >
                           {isCollapsedDiagnostics ? 
                             <ChevronRight className="h-4 w-4" /> : 
                             <ChevronDown className="h-4 w-4" />
                           }
                         </Button>
                       </CardTitle>
                     </CardHeader>
                     {!isCollapsedDiagnostics && (
                       <CardContent>
                         <div className={`rounded-lg p-4 ${
                           debugInfo.success ? 
                             'bg-blue-50 border border-blue-200' : 
                             'bg-red-50 border border-red-200'
                         }`}>
                           <div className="flex items-center justify-between mb-3">
                             <Label className={`text-sm font-medium ${
                               debugInfo.success ? 'text-blue-700' : 'text-red-700'
                             }`}>
                               Raw Backend Response
                             </Label>
                             <Button
                               onClick={() => copyToClipboard(JSON.stringify(debugInfo, null, 2))}
                               variant="ghost"
                               size="sm"
                             >
                               <Copy className="h-4 w-4" />
                             </Button>
                           </div>
                           <pre className={`text-xs overflow-x-auto whitespace-pre-wrap ${
                             debugInfo.success ? 'text-blue-600' : 'text-red-600'
                           }`}>
                             {JSON.stringify(debugInfo, null, 2)}
                           </pre>
                         </div>
                       </CardContent>
                     )}
                   </Card>
                 )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
} 