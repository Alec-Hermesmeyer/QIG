'use client';

import { useState, useEffect } from 'react';
import { testBackendConnection, getGroundXBuckets, queryGroundXRag } from '@/services/backendApi';
import { streamBackendChat } from '@/services/backendChatService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { BucketInfo } from '@/types/groundx';
import { Message } from '@/types/models';

export default function BackendConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [query, setQuery] = useState('What are the key points?');
  const [ragResult, setRagResult] = useState<any>(null);
  const [chatResult, setChatResult] = useState<string>('');
  const [streamingChunks, setStreamingChunks] = useState<string>('');
  const [loading, setLoading] = useState<string>('');

  // Test backend connection on component mount
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setLoading('connection');
    try {
      const result = await testBackendConnection();
      setConnectionStatus(result);
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading('');
    }
  };

  const loadBuckets = async () => {
    setLoading('buckets');
    try {
      const result = await getGroundXBuckets();
      setBuckets(result.buckets || []);
      console.log('✅ Buckets loaded:', result);
    } catch (error) {
      console.error('❌ Failed to load buckets:', error);
      setBuckets([]);
    } finally {
      setLoading('');
    }
  };

  const testRag = async () => {
    if (!selectedBucket) {
      console.error('No bucket selected');
      return;
    }

    setLoading('rag');
    try {
      const result = await queryGroundXRag(query, selectedBucket.toString());
      setRagResult(result);
      console.log('✅ RAG query successful:', result);
    } catch (error) {
      console.error('❌ RAG query failed:', error);
      setRagResult(null);
    } finally {
      setLoading('');
    }
  };

  const testChat = async () => {
    if (!selectedBucket) {
      console.error('No bucket selected');
      return;
    }

    setLoading('chat');
    try {
      const messages: Message[] = [{ role: 'user', content: query }];
      const result = await streamBackendChat({
        messages,
        temperature: 0.3,
        streamResponse: false,
        useRAG: true,
        bucketId: selectedBucket.toString(),
        onChunk: (chunk: string) => {
          console.log('Chunk received:', chunk);
          setChatResult(prev => prev + chunk);
        },
        onComplete: (fullContent: string) => {
          console.log('Chat complete:', fullContent);
          setChatResult(fullContent);
        },
        onError: (error: Error) => {
          console.error('Chat error:', error);
          setChatResult('Error: ' + error.message);
        }
      });
      console.log('✅ Chat successful:', result);
    } catch (error) {
      console.error('❌ Chat failed:', error);
      setChatResult('');
    } finally {
      setLoading('');
    }
  };

  const testStreaming = async () => {
    if (!selectedBucket) {
      console.error('No bucket selected');
      return;
    }

    setLoading('streaming');
    setStreamingChunks('');
    try {
      const messages: Message[] = [{ role: 'user', content: query }];
      const result = await streamBackendChat({
        messages,
        temperature: 0.3,
        streamResponse: true,
        useRAG: true,
        bucketId: selectedBucket.toString(),
        onChunk: (chunk: string) => {
          console.log('Stream chunk:', chunk);
          setStreamingChunks(prev => prev + chunk);
        },
        onComplete: (fullContent: string) => {
          console.log('Stream complete:', fullContent);
        },
        onError: (error: Error) => {
          console.error('Stream error:', error);
          setStreamingChunks('Error: ' + error.message);
        }
      });
      console.log('✅ Streaming successful:', result);
    } catch (error) {
      console.error('❌ Streaming failed:', error);
      setStreamingChunks('');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔌 Backend Connection Test</CardTitle>
          <CardDescription>Test connection to the backend server</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testConnection} 
            disabled={loading === 'connection'}
            variant="outline"
          >
            {loading === 'connection' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Test Connection
          </Button>

          {connectionStatus && (
            <div className={`mt-4 p-4 rounded-lg ${
              connectionStatus.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                {connectionStatus.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={connectionStatus.success ? 'text-green-700' : 'text-red-700'}>
                  {connectionStatus.message}
                </span>
              </div>
              {connectionStatus.data && (
                <pre className="mt-2 text-sm bg-white p-2 rounded">
                  {JSON.stringify(connectionStatus.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🗂️ Ground-X Buckets Test</CardTitle>
          <CardDescription>Test Ground-X bucket loading with authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={loadBuckets} 
            disabled={loading === 'buckets'}
            variant="outline"
          >
            {loading === 'buckets' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Load Buckets
          </Button>

          {buckets.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium">Available Buckets:</p>
              <div className="space-y-2">
                {buckets.map((bucket) => (
                  <div 
                    key={bucket.id} 
                    className={`p-2 border rounded cursor-pointer ${
                      selectedBucket === bucket.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedBucket(bucket.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{bucket.name}</span>
                      <Badge variant="secondary">{bucket.documentCount} docs</Badge>
                    </div>
                    <div className="text-xs text-gray-500">ID: {bucket.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🤖 Ground-X RAG Test</CardTitle>
          <CardDescription>Test RAG query functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Query:</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter your question..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Selected Bucket:</label>
            <p className="text-sm text-gray-600">
              {selectedBucket ? `Bucket ID: ${selectedBucket}` : 'No bucket selected'}
            </p>
          </div>

          <Button 
            onClick={testRag} 
            disabled={loading === 'rag' || !selectedBucket}
            variant="default"
          >
            {loading === 'rag' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Test RAG Query
          </Button>

          {ragResult && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Response:</h4>
                <p className="text-sm whitespace-pre-wrap">{ragResult.response}</p>
              </div>

              {ragResult.searchResults && (
                <div>
                  <h4 className="font-medium mb-2">Search Results:</h4>
                  <div className="space-y-2">
                    {ragResult.searchResults.sources.map((source: any, index: number) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{source.fileName}</span>
                          <Badge variant="outline">{Math.round(source.score * 100)}% match</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{source.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>💬 Chat Test</CardTitle>
          <CardDescription>Test chat functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testChat} 
            disabled={loading === 'chat' || !selectedBucket}
            variant="default"
          >
            {loading === 'chat' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Test Chat
          </Button>

          {chatResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Response:</h4>
              <p className="text-sm whitespace-pre-wrap">{chatResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🌊 Streaming Test</CardTitle>
          <CardDescription>Test streaming functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testStreaming} 
            disabled={loading === 'streaming' || !selectedBucket}
            variant="default"
          >
            {loading === 'streaming' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Test Streaming
          </Button>

          {streamingChunks && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Streaming Response:</h4>
              <p className="text-sm whitespace-pre-wrap">{streamingChunks}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 