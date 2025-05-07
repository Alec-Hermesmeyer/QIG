'use client';

import { useState } from 'react';
import { UIFeature, CompanyData } from '@/utils/jsonProcessor';

// Values badge component
const ValuesBadge = ({ 
  value 
}: { 
  value: string; 
}) => {
  return (
    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
      {value}
    </span>
  );
};

// Dynamic button component
const DynamicButton = ({ 
  type, 
  text, 
  onClick 
}: { 
  type: string; 
  text: string; 
  onClick: () => void; 
}) => {
  // Map button types to tailwind classes
  const buttonStyles: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded",
    default: "bg-white hover:bg-gray-100 text-gray-800 font-bold py-2 px-4 border border-gray-400 rounded"
  };
  
  return (
    <button 
      className={buttonStyles[type] || buttonStyles.default} 
      onClick={onClick}
    >
      {text}
    </button>
  );
};

// Dynamic popup component
const DynamicPopup = ({ 
  title, 
  content, 
  isOpen, 
  onClose 
}: { 
  title: string; 
  content: React.ReactNode; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="prose max-w-none">
          {content}
        </div>
      </div>
    </div>
  );
};

// Feature section component
const FeatureSection = ({ 
  title, 
  location, 
  features, 
  onFeatureClick 
}: { 
  title: string; 
  location: string; 
  features: UIFeature[]; 
  onFeatureClick: (feature: UIFeature) => void; 
}) => {
  // Filter features by display location
  const filteredFeatures = features.filter(feature => 
    feature.displayLocation === location
  );
  
  if (filteredFeatures.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {filteredFeatures.map(feature => (
            <DynamicButton
              key={feature.id}
              type={feature.buttonType}
              text={feature.name}
              onClick={() => onFeatureClick(feature)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Report card component
const ReportCard = ({ 
  report, 
  onClick 
}: { 
  report: any; 
  onClick: (report: any) => void; 
}) => {
  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
      onClick={() => onClick(report)}
    >
      <h3 className="font-bold text-lg">{report.name}</h3>
      <p className="text-gray-600 text-sm">{report.description}</p>
      <div className="mt-2">
        <span className="text-xs font-semibold">Formats: </span>
        <span className="text-xs">{report.deliveryFormat.join(', ')}</span>
      </div>
    </div>
  );
};

// Main test page component
interface TestPageProps {
  customData?: CompanyData;
}

const TestPage: React.FC<TestPageProps> = ({ customData }) => {
  const [selectedFeature, setSelectedFeature] = useState<UIFeature | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  // Use the provided data or fall back to default
  const processedData = customData;
  
  if (!processedData) {
    return <div>No data available</div>;
  }
  
  const handleFeatureClick = (feature: UIFeature) => {
    setSelectedFeature(feature);
    setIsPopupOpen(true);
  };
  
  const handleReportClick = (report: any) => {
    setSelectedFeature({
      id: report.id,
      name: report.name,
      buttonType: 'default',
      displayLocation: '',
      functionality: report.description,
      priority: 'Medium'
    });
    setIsPopupOpen(true);
  };
  
  const closePopup = () => {
    setIsPopupOpen(false);
  };
  
  // Apply the theme from JSON
  const theme = processedData.uiCustomization.branding;
  const primaryColor = theme.colors?.primary || '#0056b3';
  const accentColor = theme.colors?.accent || '#ff7700';
  
  // Define dynamic styles
  const dynamicStyles = `
    :root {
      --primary-color: ${primaryColor};
      --secondary-color: ${theme.colors?.secondary || '#003366'};
      --accent-color: ${accentColor};
      --text-color: ${theme.colors?.text || '#333333'};
      --background-color: ${theme.colors?.background || '#ffffff'};
      --font-primary: ${theme.typography?.primary_font || 'Roboto, sans-serif'};
      --font-secondary: ${theme.typography?.secondary_font || 'Open Sans, sans-serif'};
    }
    body {
      font-family: var(--font-primary);
      color: var(--text-color);
      background-color: var(--background-color);
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-primary);
    }
    .primary-button {
      background-color: var(--primary-color);
      color: white;
    }
    .accent-color {
      color: var(--accent-color);
    }
  `;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Inject dynamic styles */}
      <style jsx global>{dynamicStyles}</style>
      
      {/* Header with company info */}
      <header className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {processedData.companyProfile.name}
            </h1>
            <p className="text-gray-600">
              {processedData.companyProfile.industry} | {processedData.companyProfile.employeeCount} Employees | Revenue: {processedData.companyProfile.revenue}
            </p>
          </div>
          <div>
            {theme.companyValues?.enabled && (
              <div className="flex flex-wrap gap-1">
                {theme.companyValues.values.map((value, index) => (
                  <ValuesBadge key={index} value={value} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Operating Companies Section */}
      {processedData.companyProfile.operatingCompanies && 
        processedData.companyProfile.operatingCompanies.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Operating Companies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedData.companyProfile.operatingCompanies.map((company: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg">{company.name}</h3>
                <p className="text-sm text-gray-600">Average Contract: {company.average_contract_value}</p>
                <p className="text-sm text-gray-600">Volume: {company.contract_volume}</p>
                <div className="mt-2">
                  <span className="text-xs font-bold">Contract Types:</span>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {company.primary_contract_types && company.primary_contract_types.slice(0, 3).map((type: string, idx: number) => (
                      <li key={idx}>{type}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Feature Sections */}
      <FeatureSection 
        title="Document Viewer" 
        location="document_viewer" 
        features={processedData.uiFeatures} 
        onFeatureClick={handleFeatureClick} 
      />
      
      <FeatureSection 
        title="Contract Summary" 
        location="contract_summary" 
        features={processedData.uiFeatures} 
        onFeatureClick={handleFeatureClick} 
      />
      
      <FeatureSection 
        title="Compliance Tab" 
        location="compliance_tab" 
        features={processedData.uiFeatures} 
        onFeatureClick={handleFeatureClick} 
      />
      
      <FeatureSection 
        title="Financial Tab" 
        location="financial_tab" 
        features={processedData.uiFeatures} 
        onFeatureClick={handleFeatureClick} 
      />
      
      {/* Reports Section */}
      {processedData.reports && processedData.reports.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedData.reports.map((report) => (
              <ReportCard 
                key={report.id} 
                report={report} 
                onClick={handleReportClick} 
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Dashboard Preview */}
      {processedData.uiCustomization.dashboards && 
       Object.keys(processedData.uiCustomization.dashboards).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Dashboard Preview</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            {Object.entries(processedData.uiCustomization.dashboards).map(([name, dashboard]: [string, any]) => (
              <div key={name} className="mb-6">
                <h3 className="font-bold mb-2">{name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboard.primary_widgets && dashboard.primary_widgets.map((widget: string, index: number) => (
                    <div key={index} className="border rounded-lg p-4 h-40 flex items-center justify-center bg-gray-50">
                      <p className="text-gray-600 font-medium">{widget}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Sample Document Display */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Document Analysis Demo</h2>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="border-b pb-4 mb-4">
            <h3 className="font-bold">Contract #AUS-2024-1052</h3>
            <p className="text-sm text-gray-600">Commercial Construction Project | Value: $45M | Duration: 24 months</p>
          </div>
          
          <div className="mb-4 h-64 border rounded flex items-center justify-center bg-gray-50 text-gray-400">
            Document preview area
          </div>
          
          <div className="flex flex-wrap gap-2">
            {processedData.uiFeatures
              .filter(f => f.displayLocation === 'document_viewer')
              .map(feature => (
                <DynamicButton
                  key={feature.id}
                  type={feature.buttonType}
                  text={`Run ${feature.name}`}
                  onClick={() => handleFeatureClick(feature)}
                />
              ))}
          </div>
        </div>
      </div>
      
      {/* Feature popup */}
      {selectedFeature && (
        <DynamicPopup 
          title={selectedFeature.name}
          content={
            <div>
              <p className="mb-4">{selectedFeature.functionality}</p>
              {selectedFeature.priority && (
                <div className="text-sm border rounded-full px-3 py-1 inline-block" 
                    style={{ 
                      backgroundColor: selectedFeature.priority === 'High' 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(59, 130, 246, 0.1)',
                      color: selectedFeature.priority === 'High' 
                        ? 'rgb(239, 68, 68)' 
                        : 'rgb(59, 130, 246)'
                    }}>
                  {selectedFeature.priority} Priority
                </div>
              )}
            </div>
          }
          isOpen={isPopupOpen}
          onClose={closePopup}
        />
      )}
    </div>
  );
};

export default TestPage;