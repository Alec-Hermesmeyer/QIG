'use client'; // Add this for Next.js App Router

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  processCompanyData, 
  UIFeature, 
  UICustomization, 
  Report, 
  CompanyData 
} from '@/utils/jsonProcessor';

// Dynamic button component that renders based on the JSON configuration
interface DynamicButtonProps {
  type: string;
  text: string;
  onClick: () => void;
  location: string;
}

const DynamicButton: React.FC<DynamicButtonProps> = ({ type, text, onClick, location }) => {
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
      data-location={location}
    >
      {text}
    </button>
  );
};

// Dynamic popup component
interface DynamicPopupProps {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

const DynamicPopup: React.FC<DynamicPopupProps> = ({ title, content, isOpen, onClose }) => {
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

// Feature Button Group component
interface FeatureButtonGroupProps {
  features: UIFeature[];
  location: string;
  onFeatureClick: (feature: UIFeature) => void;
}

const FeatureButtonGroup: React.FC<FeatureButtonGroupProps> = ({ features, location, onFeatureClick }) => {
  // Filter features by display location
  const filteredFeatures = features.filter(feature => 
    feature.displayLocation === location
  );
  
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {filteredFeatures.map(feature => (
        <DynamicButton
          key={feature.id}
          type={feature.buttonType}
          text={feature.name}
          onClick={() => onFeatureClick(feature)}
          location={location}
        />
      ))}
    </div>
  );
};

// Report Card component
interface ReportCardProps {
  report: Report;
  onClick: (report: Report) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
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

// Main component that loads data and renders dynamic UI
const DynamicUI: React.FC = () => {
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<UIFeature | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch UI features
        const { data: featuresData, error: featuresError } = await supabase
          .from('ui_features')
          .select('*');
          
        if (featuresError) throw featuresError;
        
        // Fetch UI customization
        const { data: customizationData, error: customizationError } = await supabase
          .from('ui_customization')
          .select('*')
          .limit(1);
          
        if (customizationError) throw customizationError;
        
        // Fetch reports
        const { data: reportsData, error: reportsError } = await supabase
          .from('analysis_reports')
          .select('*');
          
        if (reportsError) throw reportsError;
        
        // Combine all data
        const combinedData = {
          rag_solution_requirements: {
            contract_analysis_features: featuresData,
            ui_customization: customizationData[0],
            contract_analysis_reports: reportsData
          }
        };
        
        // Process data
        const processedData = processCompanyData(combinedData);
        setCompanyData(processedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleFeatureClick = (feature: UIFeature) => {
    setSelectedFeature(feature);
    setIsPopupOpen(true);
  };
  
  const closePopup = () => {
    setIsPopupOpen(false);
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  
  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }
  
  if (!companyData) {
    return <div>No data available</div>;
  }
  
  // Apply the theme from JSON
  const theme = companyData.uiCustomization.branding;
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
  `;
  
  return (
    <div className="container mx-auto p-4">
      {/* Inject dynamic styles */}
      <style jsx global>{dynamicStyles}</style>
      
      {/* Company header */}
      <header className="mb-8">
        {theme.logo && (
          <img 
            src={theme.logo.url} 
            alt={theme.logo.alt_text || 'Company logo'} 
            className="h-12 mb-4"
          />
        )}
        <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
          {companyData.companyProfile.name}
        </h1>
      </header>
      
      {/* Display feature buttons in different locations */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Document Viewer</h2>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="mb-4 h-64 bg-white border rounded flex items-center justify-center text-gray-400">
            Document preview area
          </div>
          <FeatureButtonGroup 
            features={companyData.uiFeatures}
            location="document_viewer"
            onFeatureClick={handleFeatureClick}
          />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Contract Summary</h2>
        <div className="border rounded-lg p-4 bg-gray-50">
          <FeatureButtonGroup 
            features={companyData.uiFeatures}
            location="contract_summary"
            onFeatureClick={handleFeatureClick}
          />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Compliance Tab</h2>
        <div className="border rounded-lg p-4 bg-gray-50">
          <FeatureButtonGroup 
            features={companyData.uiFeatures}
            location="compliance_tab"
            onFeatureClick={handleFeatureClick}
          />
        </div>
      </div>
      
      {/* Reports section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companyData.reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={(report) => console.log('Report clicked:', report)}
            />
          ))}
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

export default DynamicUI;