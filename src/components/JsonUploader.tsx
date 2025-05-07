'use client'; // Add this for Next.js App Router

import { useState } from 'react';
import { parseJSONFile, importJSONData } from '../utils/importData';

const JsonUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile && selectedFile.type === 'application/json') {
        setFile(selectedFile);
        setErrorMessage('');
      } else {
        setFile(null);
        setErrorMessage('Please select a valid JSON file');
      }
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a file first');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadStatus('Parsing JSON file...');
      
      // Parse the JSON file
      const jsonData = await parseJSONFile(file);
      
      setUploadStatus('Importing data to Supabase...');
      
      // Import the data to Supabase
      const result = await importJSONData(jsonData);
      
      if (result.success) {
        setUploadStatus('Success! Data has been imported.');
        // Reset the file input
        setFile(null);
        // You could redirect to the main dashboard here
      } else {
        setUploadStatus('Error importing data');
        setErrorMessage(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      setUploadStatus('Error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Import JSON Configuration</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select JSON File
        </label>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
        />
        {errorMessage && (
          <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`py-2 px-4 rounded-md text-white font-medium ${
            !file || isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload and Import'}
        </button>
        
        {uploadStatus && (
          <span className={`text-sm ${
            uploadStatus.includes('Success')
              ? 'text-green-600'
              : uploadStatus.includes('Error')
                ? 'text-red-600'
                : 'text-blue-600'
          }`}>
            {uploadStatus}
          </span>
        )}
      </div>
    </div>
  );
};

export default JsonUploader;