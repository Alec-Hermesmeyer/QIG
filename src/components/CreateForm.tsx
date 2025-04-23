'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, Info } from 'lucide-react';

interface CreateFormProps {
  onSubmit: (input: string) => Promise<void>;
  onFileUpload: (file: File) => Promise<void>;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

const FILE_TYPE_NAMES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC'
};

export default function CreateForm({ onSubmit, onFileUpload }: CreateFormProps) {
  const [input, setInput] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(input);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      alert(`File type not supported. Please upload a PDF or Word document.`);
      return;
    }
    
    onFileUpload(file);
    
    // Reset the input to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragError(null);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
    setDragError(null);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragError(null);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setDragError(`File type not supported. Please upload a PDF or Word document.`);
      return;
    }
    
    onFileUpload(file);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          className={`flex-1 px-4 py-3 text-center font-medium ${input ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => fileInputRef.current?.value && (fileInputRef.current.value = '')}
        >
          Manual Input
        </button>
        <div className="w-px bg-gray-200"></div>
        <button 
          className="flex-1 px-4 py-3 text-center font-medium text-gray-500"
          onClick={() => fileInputRef.current?.click()}
        >
          File Upload
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5">
        {/* Text Input Area */}
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg h-36 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
          placeholder="Enter your text here to analyze..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        ></textarea>
        
        {/* Button Area */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            Analyze Text
          </button>
          
          <div
            className={`flex-1 min-w-[240px] border-2 border-dashed rounded-md flex items-center justify-center p-3 cursor-pointer transition-colors ${
              isDragging 
                ? 'bg-blue-50 border-blue-300' 
                : dragError 
                  ? 'bg-red-50 border-red-300' 
                  : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            
            {dragError ? (
              <div className="text-center text-red-600 flex items-center">
                <X className="h-4 w-4 mr-1" />
                {dragError}
              </div>
            ) : (
              <div className="text-center text-gray-500 flex items-center">
                <Upload className="h-4 w-4 mr-1" />
                Drag & drop or click to upload a document
              </div>
            )}
          </div>
        </div>
        
        {/* File Type Help Text */}
        <div className="mt-3 flex items-start text-xs text-gray-500">
          <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
          <span>
            Supported file types: {Object.values(FILE_TYPE_NAMES).join(', ')}. 
            Max file size: 50MB.
          </span>
        </div>
      </form>
    </div>
  );
}