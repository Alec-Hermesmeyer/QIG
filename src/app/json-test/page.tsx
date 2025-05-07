'use client';

import { useState } from 'react';
import { processCompanyData, CompanyData } from '@/utils/jsonProcessor';
import TestPage from '@/components/TestPage';

// Default sample JSON in case the user doesn't upload one
import sampleJSON from '@/data/sampleJson';

const JsonLoaderTestPage = () => {
  const [jsonData, setJsonData] = useState<any>(sampleJSON);
  const [processedData, setProcessedData] = useState<CompanyData | null>(
    processCompanyData(sampleJSON)
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsLoading(true);
      setErrorMessage('');
      
      const file = e.target.files[0];
      
      if (file.type !== 'application/json') {
        setErrorMessage('Please upload a JSON file');
        setIsLoading(false);
        return;
      }
      
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        setJsonData(json);
        
        const processed = processCompanyData(json);
        if (!processed) {
          setErrorMessage('Error processing JSON. Make sure it has the correct structure.');
          return;
        }
        
        setProcessedData(processed);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        setErrorMessage('Invalid JSON file. Please check the file format.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resetToSample = () => {
    setJsonData(sampleJSON);
    setProcessedData(processCompanyData(sampleJSON));
    setErrorMessage('');
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">JSON Configuration Loader</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload your JSON configuration
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
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={resetToSample}
            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md"
          >
            Reset to Sample JSON
          </button>
          
          {isLoading ? (
            <span className="text-blue-600">Loading...</span>
          ) : processedData ? (
            <span className="text-green-600">JSON loaded successfully</span>
          ) : null}
        </div>
      </div>
      
      {/* JSON Structure Display */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">JSON Structure</h2>
        <div className="border rounded-lg p-4 bg-gray-50 max-h-60 overflow-auto">
          <pre className="text-xs">{JSON.stringify(jsonData, null, 2)}</pre>
        </div>
      </div>
      
      {/* Dynamic UI Preview */}
      <h2 className="text-2xl font-bold mb-4">Dynamic UI Preview</h2>
      {processedData ? (
        <TestPage customData={processedData} />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">
            No valid JSON configuration loaded. Please upload a valid JSON file.
          </p>
        </div>
      )}
    </div>
  );
};

export default JsonLoaderTestPage;