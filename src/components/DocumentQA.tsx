'use client';

import { useState } from 'react';
import { Loader2, MessageCircle, ArrowRight } from 'lucide-react';

interface DocumentQAProps {
  documentId: string;
  documentName: string;
}

interface QAResult {
  question: string;
  answer: string;
  sources?: {
    text: string;
    score: number;
  }[];
}

export default function DocumentQA({ documentId, documentName }: DocumentQAProps) {
  const [question, setQuestion] = useState<string>('');
  const [results, setResults] = useState<QAResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/documents/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, question }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to answer question');
      }
      
      const data = await res.json();
      // Add the new QA pair to the results array
      setResults(prevResults => [
        ...prevResults,
        {
          question: question,
          answer: data.answer,
          sources: data.sources
        }
      ]);
      
      // Clear the input field
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center mb-6">
        <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">Ask Questions About {documentName}</h2>
      </div>
      
      {/* Question Input Form */}
      <form onSubmit={handleQuestionSubmit} className="mb-6">
        <div className="flex items-center">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </form>
      
      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((result, idx) => (
            <div key={idx} className="border-t border-gray-100 pt-4">
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-800 font-medium px-2 py-1 rounded-full text-xs mr-2 mt-1">
                  Q
                </div>
                <p className="text-gray-800 font-medium">{result.question}</p>
              </div>
              
              <div className="flex items-start mt-3">
                <div className="bg-green-100 text-green-800 font-medium px-2 py-1 rounded-full text-xs mr-2 mt-1">
                  A
                </div>
                <div>
                  <p className="text-gray-700 whitespace-pre-line">{result.answer}</p>
                  
                  {/* Sources/Citations */}
                  {result.sources && result.sources.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 font-medium">Sources:</p>
                      {result.sources.map((source, sourceIdx) => (
                        <div key={sourceIdx} className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-100 text-sm text-gray-600">
                          {source.text}
                          <div className="text-xs text-gray-400 mt-1">
                            Relevance: {Math.round(source.score * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p>Ask questions about this document to get AI-powered answers</p>
        </div>
      )}
    </div>
  );
}