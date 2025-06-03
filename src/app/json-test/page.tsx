'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  processCompanyData, 
  processJsonData, 
  ProcessedJsonData,
  JsonSchemaType 
} from '@/utils/jsonProcessor';
import EnhancedTestPage from '@/components/TestPage';
import DynamicUIRenderer from '@/components/DynamicUIRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Download,
  Zap,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// Default sample JSON in case the user doesn't upload one
import sampleJSON from '@/data/sampleJson';

// Sample JSON configurations for different schema types
const sampleConfigs = {
  company_data: sampleJSON,
  dashboard_config: {
    title: "Executive Dashboard",
    widgets: [
      { id: "sales", type: "metric", title: "Sales Revenue", value: 125000 },
      { id: "users", type: "chart", title: "Active Users", data: [100, 120, 140, 160] },
      { id: "performance", type: "gauge", title: "Performance Score", value: 85 }
    ],
    layout: {
      columns: 3,
      spacing: "medium",
      theme: "light"
    }
  },
  form_schema: {
    title: "User Registration Form",
    fields: [
      { name: "firstName", type: "text", label: "First Name", required: true, placeholder: "Enter your first name" },
      { name: "email", type: "email", label: "Email Address", required: true, validation: "email" },
      { name: "age", type: "number", label: "Age", required: false, min: 18, max: 100 },
      { name: "country", type: "select", label: "Country", options: ["USA", "Canada", "UK", "Australia"] }
    ],
    validation: {
      method: "onSubmit",
      showErrors: true
    }
  },
  chart_config: {
    title: "Sales Performance Chart",
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        { label: "Sales", data: [12, 19, 3, 5, 2, 3], borderColor: "rgb(75, 192, 192)" },
        { label: "Target", data: [10, 15, 8, 12, 6, 9], borderColor: "rgb(255, 99, 132)" }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  },
  table_config: {
    title: "Employee Data",
    columns: ["name", "position", "department", "salary"],
    rows: [
      { name: "John Doe", position: "Developer", department: "Engineering", salary: 75000 },
      { name: "Jane Smith", position: "Designer", department: "Product", salary: 70000 },
      { name: "Mike Johnson", position: "Manager", department: "Engineering", salary: 95000 }
    ]
  },
  navigation_menu: {
    menu: [
      { label: "Dashboard", href: "/dashboard", icon: "home" },
      { label: "Reports", href: "/reports", icon: "chart", children: [
        { label: "Sales Report", href: "/reports/sales" },
        { label: "User Analytics", href: "/reports/users" }
      ]},
      { label: "Settings", href: "/settings", icon: "settings" }
    ]
  },
  user_profile: {
    user: {
      name: "John Doe",
      email: "john.doe@example.com",
      role: "Administrator",
      avatar: "https://example.com/avatar.jpg",
      joinDate: "2023-01-15"
    },
    preferences: {
      theme: "dark",
      language: "en",
      notifications: true,
      timezone: "UTC-5"
    }
  }
};

const EnhancedJsonLoader = () => {
  const [jsonData, setJsonData] = useState<any>(sampleJSON);
  const [processedData, setProcessedData] = useState<ProcessedJsonData>(
    processJsonData(sampleJSON)
  );
  const [legacyData, setLegacyData] = useState<any>(
    processCompanyData(sampleJSON)
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showJson, setShowJson] = useState<boolean>(false);
  const [showLegacyUI, setShowLegacyUI] = useState<boolean>(false);

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
        
        const processed = processJsonData(json);
        setProcessedData(processed);
        
        // Also process with legacy function for company data
        const legacy = processCompanyData(json);
        setLegacyData(legacy);
        
      } catch (error) {
        console.error('Error parsing JSON:', error);
        setErrorMessage('Invalid JSON file. Please check the file format.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const loadSampleConfig = (schemaType: keyof typeof sampleConfigs) => {
    const sampleData = sampleConfigs[schemaType];
    setJsonData(sampleData);
    setProcessedData(processJsonData(sampleData));
    setLegacyData(processCompanyData(sampleData));
    setErrorMessage('');
  };

  const resetToSample = () => {
    setJsonData(sampleJSON);
    setProcessedData(processJsonData(sampleJSON));
    setLegacyData(processCompanyData(sampleJSON));
    setErrorMessage('');
  };

  const downloadJson = () => {
    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'configuration.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      className="container mx-auto p-4 max-w-7xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-blue-900">
                  Dynamic JSON UI Generator
                </CardTitle>
                <p className="text-blue-700 mt-1">
                  Upload any JSON file to automatically generate a customized user interface
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Configuration Panel */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>JSON Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload JSON Configuration
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
                <div className="mt-2 flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Sample Configurations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Try Sample Configurations
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.keys(sampleConfigs).map((schemaType) => (
                  <Button
                    key={schemaType}
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleConfig(schemaType as keyof typeof sampleConfigs)}
                    className="text-xs"
                  >
                    {schemaType.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex space-x-2">
                <Button
                  onClick={resetToSample}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset to Default</span>
                </Button>
                
                <Button
                  onClick={() => setShowJson(!showJson)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  {showJson ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showJson ? 'Hide' : 'Show'} JSON</span>
                </Button>

                <Button
                  onClick={downloadJson}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </div>
              
              <div className="flex items-center space-x-3">
                {isLoading ? (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-sm">Processing...</span>
                  </div>
                ) : processedData ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">JSON processed successfully</span>
                  </div>
                ) : null}
                
                {processedData && (
                  <Badge variant="secondary" className="capitalize">
                    {processedData.schemaType.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* JSON Structure Display */}
      {showJson && (
        <motion.div variants={itemVariants}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>JSON Structure</span>
                {processedData && (
                  <Badge variant="outline">
                    {processedData.metadata.fields} fields, 
                    {processedData.metadata.hasArrays ? ' arrays,' : ''}
                    {processedData.metadata.hasObjects ? ' objects' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
                <pre className="text-xs">{JSON.stringify(jsonData, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dynamic UI Preview */}
      <motion.div variants={itemVariants}>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Dynamic UI Preview</CardTitle>
              {processedData?.schemaType === 'company_data' && (
                <Button
                  onClick={() => setShowLegacyUI(!showLegacyUI)}
                  variant="outline"
                  size="sm"
                >
                  {showLegacyUI ? 'Show New UI' : 'Show Legacy UI'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {processedData ? (
              showLegacyUI && legacyData ? (
                <EnhancedTestPage customData={legacyData} jsonData={jsonData} />
              ) : (
                <DynamicUIRenderer
                  components={processedData.uiComponents}
                  schemaType={processedData.schemaType}
                  title={processedData.title}
                  description={processedData.description}
                />
              )
            ) : (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Valid JSON Configuration
                </h3>
                <p className="text-gray-600">
                  Upload a JSON file or select a sample configuration to see the dynamic UI preview.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedJsonLoader;