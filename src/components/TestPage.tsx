'use client';

import { useState } from 'react';
import { UIFeature, CompanyData } from '../utils/jsonProcessor';

// Value Badge component
const ValueBadge = ({ value }: { value: string }) => {
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
  onClick,
  size = 'medium'
}: { 
  type: string; 
  text: string; 
  onClick: () => void;
  size?: 'small' | 'medium' | 'large';
}) => {
  // Map button types to tailwind classes
  const buttonStyles: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white font-bold rounded",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded",
    default: "bg-white hover:bg-gray-100 text-gray-800 font-bold border border-gray-400 rounded"
  };

  // Size variations
  const sizeClasses: Record<string, string> = {
    small: "py-1 px-2 text-xs",
    medium: "py-2 px-4 text-sm",
    large: "py-3 px-6 text-base"
  };
  
  return (
    <button 
      className={`${buttonStyles[type] || buttonStyles.default} ${sizeClasses[size]}`}
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
  onClose,
  size = 'medium'
}: { 
  title: string; 
  content: React.ReactNode; 
  isOpen: boolean; 
  onClose: () => void;
  size?: 'small' | 'medium' | 'large';
}) => {
  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    small: "max-w-md",
    medium: "max-w-2xl",
    large: "max-w-4xl"
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg p-6 w-full mx-4 ${sizeClasses[size]}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="prose max-w-none overflow-y-auto" style={{ maxHeight: '70vh' }}>
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

// Report card component with expanded details
const ReportCard = ({ 
  report, 
  onClick 
}: { 
  report: any; 
  onClick: (report: any) => void; 
}) => {
  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-md cursor-pointer bg-white"
      onClick={() => onClick(report)}
    >
      <h3 className="font-bold text-lg">{report.name}</h3>
      <p className="text-gray-600 text-sm mb-2">{report.description}</p>
      
      {report.components && report.components.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-semibold">Components: </span>
          <span className="text-xs">{report.components.length} total</span>
        </div>
      )}
      
      <div className="flex flex-wrap gap-1 mb-2">
        {report.deliveryFormat && report.deliveryFormat.map((format: string, index: number) => (
          <span key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
            {format}
          </span>
        ))}
      </div>
      
      <div className="text-xs text-gray-500">
        {report.scheduling && <div>Scheduling: {report.scheduling}</div>}
      </div>
    </div>
  );
};

// Detailed Report View component
const DetailedReportView = ({ 
  report 
}: { 
  report: any;
}) => {
  return (
    <div>
      <div className="mb-4">
        <p>{report.description}</p>
      </div>
      
      {report.components && report.components.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Components</h3>
          <div className="grid grid-cols-1 gap-4">
            {report.components.map((component: any, index: number) => (
              <div key={index} className="border rounded p-3 bg-gray-50">
                <h4 className="font-medium text-base">{component.component_name}</h4>
                <p className="text-sm text-gray-600 mb-2">{component.content}</p>
                <div className="text-xs text-gray-500">
                  Visualization: {component.visualization}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {report.customization_options && report.customization_options.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Customization Options</h3>
          <ul className="list-disc list-inside text-sm">
            {report.customization_options.map((option: string, index: number) => (
              <li key={index}>{option}</li>
            ))}
          </ul>
        </div>
      )}
      
      {report.delivery_format && report.delivery_format.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Delivery Formats</h3>
          <div className="flex flex-wrap gap-2">
            {report.delivery_format.map((format: string, index: number) => (
              <span key={index} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                {format}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {report.target_audience && report.target_audience.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Target Audience</h3>
          <div className="flex flex-wrap gap-2">
            {report.target_audience.map((audience: string, index: number) => (
              <span key={index} className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                {audience}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-sm text-gray-600">
        {report.scheduling && (
          <div className="mb-2">
            <span className="font-medium">Scheduling: </span>
            {report.scheduling}
          </div>
        )}
      </div>
    </div>
  );
};

// Dashboard tab component
const DashboardTabs = ({ 
  dashboards 
}: { 
  dashboards: Record<string, any>;
}) => {
  const [activeTab, setActiveTab] = useState<string>(Object.keys(dashboards)[0] || '');
  
  if (!dashboards || Object.keys(dashboards).length === 0) {
    return null;
  }
  
  const formatTabName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderDashboardLayout = (dashboard: any) => {
    const layout = dashboard.layout || 'grid';
    
    if (layout === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboard.primary_widgets && dashboard.primary_widgets.map((widget: string, index: number) => (
            <div key={index} className="border rounded-lg p-4 h-40 flex items-center justify-center bg-gray-50">
              <p className="text-gray-600 font-medium">{widget}</p>
            </div>
          ))}
          {dashboard.secondary_widgets && (
            <div className="col-span-1 md:col-span-2 mt-4">
              <h4 className="text-sm font-medium mb-2 text-gray-500">Secondary Widgets</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {dashboard.secondary_widgets.map((widget: string, index: number) => (
                  <div key={index} className="border rounded-lg p-3 h-24 flex items-center justify-center bg-gray-50">
                    <p className="text-gray-600 text-sm">{widget}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (layout === 'tabbed') {
      return (
        <div>
          <div className="border-b flex">
            {dashboard.primary_widgets && dashboard.primary_widgets.slice(0, 4).map((widget: string, index: number) => (
              <div key={index} className={`px-4 py-2 border-b-2 ${index === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent'} cursor-pointer`}>
                {widget.length > 15 ? `${widget.substring(0, 15)}...` : widget}
              </div>
            ))}
          </div>
          <div className="p-4 border-l border-r border-b rounded-b-lg">
            <div className="h-48 flex items-center justify-center bg-gray-50 border rounded">
              <p className="text-gray-500">{dashboard.primary_widgets && dashboard.primary_widgets[0]} Content</p>
            </div>
            
            {dashboard.secondary_widgets && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 text-gray-500">Additional Information</h4>
                <div className="grid grid-cols-2 gap-2">
                  {dashboard.secondary_widgets.slice(0, 4).map((widget: string, index: number) => (
                    <div key={index} className="border rounded p-2 text-xs text-gray-600">
                      {widget}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (layout === 'list') {
      return (
        <div className="space-y-4">
          {dashboard.primary_widgets && dashboard.primary_widgets.map((widget: string, index: number) => (
            <div key={index} className="border rounded-lg p-4 bg-white">
              <h4 className="font-medium mb-2">{widget}</h4>
              <div className="h-24 flex items-center justify-center bg-gray-50 border rounded">
                <p className="text-gray-500 text-sm">Widget content goes here</p>
              </div>
              
              {dashboard.secondary_widgets && index < dashboard.secondary_widgets.length && (
                <div className="mt-2 text-xs text-gray-500">
                  Related: {dashboard.secondary_widgets[index]}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-gray-500">Unknown layout type: {layout}</p>
      </div>
    );
  };
  
  return (
    <div>
      <div className="flex overflow-x-auto mb-4 border-b">
        {Object.keys(dashboards).map(key => (
          <div 
            key={key}
            className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
              activeTab === key 
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab(key)}
          >
            {formatTabName(key)}
          </div>
        ))}
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {activeTab && dashboards[activeTab] && (
          <div>
            <div className="mb-2 text-sm text-gray-500">
              Default timeframe: {dashboards[activeTab].default_timeframe}
            </div>
            {renderDashboardLayout(dashboards[activeTab])}
          </div>
        )}
      </div>
    </div>
  );
};

// Visualization Section component
const VisualizationType = ({ 
  title, 
  config 
}: { 
  title: string; 
  config: any;
}) => {
  if (!config || !config.enabled) {
    return null;
  }
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="font-medium">Default View:</span> {config.default_view}
        </div>
        <div>
          <span className="font-medium">Color Scheme:</span> {config.color_scheme}
        </div>
        <div>
          <span className="font-medium">Interaction:</span> {config.interaction}
        </div>
        <div>
          <span className="font-medium">Export Formats:</span> {config.export_formats.join(', ')}
        </div>
      </div>
      
      {/* Demo visualization area */}
      <div className="mt-4 h-40 border rounded bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">{title} Preview</p>
      </div>
    </div>
  );
};

// System Integration component
const SystemIntegration = ({
  system
}: {
  system: any;
}) => {
  return (
    <div className="border rounded-lg p-4 bg-white mb-4">
      <h3 className="font-bold text-lg mb-2">{system.system_name}</h3>
      
      <div className="mb-2">
        <span className="text-sm font-medium">Integration Type:</span>{' '}
        <span className={`text-sm px-2 py-0.5 rounded ${
          system.integration_type === 'Bi-directional' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {system.integration_type}
        </span>
      </div>
      
      <div className="mb-2">
        <span className="text-sm font-medium">Authentication:</span>{' '}
        <span className="text-sm">{system.authentication}</span>
      </div>
      
      <div className="mb-1">
        <span className="text-sm font-medium">Data Exchange:</span>
      </div>
      <ul className="list-disc list-inside text-sm pl-2 mb-2">
        {system.data_exchange.map((item: string, index: number) => (
          <li key={index} className="text-gray-700">{item}</li>
        ))}
      </ul>
    </div>
  );
};

// Data Security component
const DataSecurity = ({
  security
}: {
  security: any;
}) => {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-bold text-lg mb-4">Data Security Requirements</h3>
      
      {security.data_classification_levels && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Data Classification Levels</h4>
          <div className="flex flex-wrap gap-2">
            {security.data_classification_levels.map((level: string, index: number) => (
              <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {level}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {security.encryption_requirements && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Encryption Requirements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Data at Rest:</span> {security.encryption_requirements.data_at_rest}</div>
            <div><span className="font-medium">Data in Transit:</span> {security.encryption_requirements.data_in_transit}</div>
            <div className="md:col-span-2"><span className="font-medium">Key Management:</span> {security.encryption_requirements.key_management}</div>
          </div>
        </div>
      )}
      
      {security.access_controls && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Access Controls</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Role Based Access:</span> {security.access_controls.role_based_access ? 'Yes' : 'No'}</div>
            <div><span className="font-medium">Multi-Factor Authentication:</span> {security.access_controls.multi_factor_authentication ? 'Yes' : 'No'}</div>
            <div><span className="font-medium">Session Management:</span> {security.access_controls.session_management}</div>
            <div><span className="font-medium">Audit Logging:</span> {security.access_controls.audit_logging}</div>
          </div>
        </div>
      )}
      
      {security.privacy_compliance && (
        <div>
          <h4 className="font-medium mb-2">Privacy Compliance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Data Retention:</span> {security.privacy_compliance.data_retention}</div>
            <div><span className="font-medium">Data Residency:</span> {security.privacy_compliance.data_residency}</div>
            <div className="md:col-span-2"><span className="font-medium">Right to be Forgotten:</span> {security.privacy_compliance.right_to_be_forgotten}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
interface EnhancedTestPageProps {
  customData?: CompanyData;
  jsonData?: any; // This is the full raw JSON
}

const EnhancedTestPage: React.FC<EnhancedTestPageProps> = ({ customData, jsonData }) => {
  const [selectedFeature, setSelectedFeature] = useState<UIFeature | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  // Use the provided data
  const processedData = customData;
  
  if (!processedData) {
    return <div>No data available</div>;
  }
  
  const handleFeatureClick = (feature: UIFeature) => {
    setSelectedFeature(feature);
    setSelectedReport(null);
    setIsPopupOpen(true);
  };
  
  const handleReportClick = (report: any) => {
    setSelectedReport(report);
    setSelectedFeature(null);
    setIsPopupOpen(true);
  };
  
  const closePopup = () => {
    setIsPopupOpen(false);
  };
  
  // Get visualization types from raw JSON if available
  const visualizationTypes = jsonData?.rag_solution_requirements?.ui_customization?.visualization_types || {};
  
  // Get integration requirements from raw JSON if available
  const integrationRequirements = jsonData?.rag_solution_requirements?.integration_requirements || { existing_systems: [], data_security: {} };
  
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
      --alert-high: ${theme.colors?.alert_high || '#d9534f'};
      --alert-medium: ${theme.colors?.alert_medium || '#f0ad4e'};
      --alert-low: ${theme.colors?.alert_low || '#5bc0de'};
      --success: ${theme.colors?.success || '#5cb85c'};
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
    .primary-color {
      color: var(--primary-color);
    }
    .primary-bg {
      background-color: var(--primary-color);
    }
    .accent-color {
      color: var(--accent-color);
    }
    .alert-high {
      color: var(--alert-high);
    }
    .alert-high-bg {
      background-color: var(--alert-high);
      color: white;
    }
    .alert-medium {
      color: var(--alert-medium);
    }
    .alert-low {
      color: var(--alert-low);
    }
    .success-color {
      color: var(--success);
    }
  `;
  
  // All possible display locations from the JSON
  const displayLocations = [
    { id: 'document_viewer', title: 'Document Viewer' },
    { id: 'contract_summary', title: 'Contract Summary' },
    { id: 'compliance_tab', title: 'Compliance Tab' },
    { id: 'financial_tab', title: 'Financial Tab' },
    { id: 'project_management', title: 'Project Management' },
    { id: 'document_comparison', title: 'Document Comparison' },
    { id: 'subcontractor_management', title: 'Subcontractor Management' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Inject dynamic styles */}
      <style jsx global>{dynamicStyles}</style>
      
      {/* Navigation tabs */}
      <div className="flex overflow-x-auto mb-6 border-b">
        <div 
          className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </div>
        <div 
          className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'features' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('features')}
        >
          Features
        </div>
        <div 
          className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboards' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('dashboards')}
        >
          Dashboards
        </div>
        <div 
          className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'reports' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </div>
        <div 
          className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'visualizations' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('visualizations')}
        >
          Visualizations
        </div>
        <div 
          className={`px-4 py-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'integrations' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('integrations')}
        >
          Integrations
        </div>
      </div>
      
      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Header with company info */}
          <header className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {processedData.companyProfile.name}
                </h1>
                <p className="text-gray-600">
                  {processedData.companyProfile.industry} | {processedData.companyProfile.employeeCount} Employees | Revenue: {processedData.companyProfile.revenue}
                </p>
              </div>
              <div className="mt-3 md:mt-0">
                {theme.companyValues?.enabled && (
                  <div className="flex flex-wrap gap-1">
                    {theme.companyValues.values.map((value, index) => (
                      <ValueBadge key={index} value={value} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>
          
          {/* Platform Overview */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Platform Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-bold text-lg mb-2">Features</h3>
                <p className="text-gray-600">{processedData.uiFeatures.length} AI-powered features available across the platform.</p>
                <DynamicButton 
                  type="primary" 
                  text="View All Features" 
                  size="small" 
                  onClick={() => setActiveTab('features')} 
                />
              </div>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-bold text-lg mb-2">Dashboards</h3>
                <p className="text-gray-600">{Object.keys(processedData.uiCustomization.dashboards).length} customized dashboards for different user roles.</p>
                <DynamicButton 
                  type="primary" 
                  text="View Dashboards" 
                  size="small" 
                  onClick={() => setActiveTab('dashboards')} 
                />
              </div>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-bold text-lg mb-2">Reports</h3>
                <p className="text-gray-600">{processedData.reports.length} detailed analytical reports available.</p>
                <DynamicButton 
                  type="primary" 
                  text="View Reports" 
                  size="small" 
                  onClick={() => setActiveTab('reports')} 
                />
              </div>
            </div>
          </div>
          
          {/* Operating Companies Section */}
          {processedData.companyProfile.operatingCompanies && 
            processedData.companyProfile.operatingCompanies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Operating Companies</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          
          {/* Featured Modules */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Featured Modules</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document Analysis Module */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-bold text-lg mb-3">Document Analysis</h3>
                <div className="mb-4 h-40 border rounded flex items-center justify-center bg-white text-gray-400">
                  Document preview area
                </div>
                <div className="flex flex-wrap gap-2">
                  {processedData.uiFeatures
                    .filter(f => f.displayLocation === 'document_viewer')
                    .slice(0, 2)
                    .map(feature => (
                      <DynamicButton
                        key={feature.id}
                        type={feature.buttonType}
                        text={feature.name}
                        onClick={() => handleFeatureClick(feature)}
                        size="small"
                      />
                    ))}
                  {processedData.uiFeatures.filter(f => f.displayLocation === 'document_viewer').length > 2 && (
                    <span className="text-xs text-blue-600 self-center ml-2">
                      +{processedData.uiFeatures.filter(f => f.displayLocation === 'document_viewer').length - 2} more
                    </span>
                  )}
                </div>
              </div>
              
              {/* Report Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-bold text-lg mb-3">Contract Risk Analysis</h3>
                {processedData.reports.length > 0 && (
                  <div className="mb-4 h-40 border rounded bg-white p-3 overflow-hidden">
                    <h4 className="font-medium text-sm mb-2">{processedData.reports[0].name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{processedData.reports[0].description}</p>
                    <div className="flex gap-1 flex-wrap mb-1">
                      {processedData.reports[0].components && processedData.reports[0].components.slice(0, 3).map((comp: any, idx: number) => (
                        <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {comp.component_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <DynamicButton 
                  type="primary" 
                  text="View Reports" 
                  size="small" 
                  onClick={() => setActiveTab('reports')} 
                />
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Features Tab Content */}
      {activeTab === 'features' && (
        <div>
          <h2 className="text-xl font-bold mb-6">Contract Analysis Features</h2>
          
          {/* Feature Sections - one for each display location */}
          {displayLocations.map(location => (
            <FeatureSection 
              key={location.id}
              title={location.title}
              location={location.id}
              features={processedData.uiFeatures}
              onFeatureClick={handleFeatureClick}
            />
          ))}
          
          {/* Sample Document Display - example usage */}
          <div className="mt-8 mb-8">
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
        </div>
      )}
      
      {/* Dashboards Tab Content */}
      {activeTab === 'dashboards' && (
        <div>
          <h2 className="text-xl font-bold mb-6">Dashboards</h2>
          
          {processedData.uiCustomization.dashboards && 
          Object.keys(processedData.uiCustomization.dashboards).length > 0 && (
            <DashboardTabs dashboards={processedData.uiCustomization.dashboards} />
          )}
        </div>
      )}
      
      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        <div>
          <h2 className="text-xl font-bold mb-6">Reports</h2>
          
          {processedData.reports && processedData.reports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedData.reports.map((report) => (
                <ReportCard 
                  key={report.id} 
                  report={report} 
                  onClick={handleReportClick} 
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Visualizations Tab Content */}
      {activeTab === 'visualizations' && (
        <div>
          <h2 className="text-xl font-bold mb-6">Visualization Types</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VisualizationType title="Risk Heatmaps" config={visualizationTypes.risk_heatmaps} />
            <VisualizationType title="Obligation Timelines" config={visualizationTypes.obligation_timelines} />
            <VisualizationType title="Comparison Tables" config={visualizationTypes.comparison_tables} />
            <VisualizationType title="Risk Scorecards" config={visualizationTypes.risk_scorecards} />
          </div>
        </div>
      )}
      
      {/* Integrations Tab Content */}
      {activeTab === 'integrations' && (
        <div>
          <h2 className="text-xl font-bold mb-6">System Integrations</h2>
          
          {integrationRequirements.existing_systems && 
           integrationRequirements.existing_systems.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Existing Systems</h3>
              <div>
                {integrationRequirements.existing_systems.map((system: any, index: number) => (
                  <SystemIntegration key={index} system={system} />
                ))}
              </div>
            </div>
          )}
          
          {integrationRequirements.data_security && (
            <DataSecurity security={integrationRequirements.data_security} />
          )}
        </div>
      )}
      
      {/* Feature popup */}
      {selectedFeature && (
        <DynamicPopup 
          title={selectedFeature.name}
          content={
            <div>
              <p className="mb-4">{selectedFeature.functionality}</p>
              {selectedFeature.priority && (
                <div className="text-sm border rounded-full px-3 py-1 inline-block mb-4" 
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
              
              {/* Get capabilities from raw JSON if available */}
              {jsonData?.rag_solution_requirements?.contract_analysis_features && (
                (() => {
                  const featureData = jsonData.rag_solution_requirements.contract_analysis_features.find(
                    (f: any) => f.feature_id === selectedFeature.id
                  );
                  if (featureData && featureData.analysis_capabilities) {
                    return (
                      <div>
                        <h3 className="font-bold text-lg mb-2">Capabilities</h3>
                        <ul className="list-disc list-inside">
                          {featureData.analysis_capabilities.map((capability: string, index: number) => (
                            <li key={index} className="mb-1">{capability}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })()
              )}
            </div>
          }
          isOpen={isPopupOpen && selectedFeature !== null}
          onClose={closePopup}
        />
      )}
      
      {/* Report popup */}
      {selectedReport && (
        <DynamicPopup 
          title={selectedReport.name}
          content={<DetailedReportView report={selectedReport} />}
          isOpen={isPopupOpen && selectedReport !== null}
          onClose={closePopup}
          size="large"
        />
      )}
    </div>
  );
};

export default EnhancedTestPage;