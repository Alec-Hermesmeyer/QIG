// src/utils/jsonProcessor.ts

// Type definitions for original company data
export interface UIFeature {
    id: string;
    name: string;
    buttonType: string;
    displayLocation: string;
    functionality: string;
    priority: string;
}

export interface UICustomization {
    branding: {
      logo?: {
        url: string;
        alt_text: string;
        display_locations: string[];
      };
      colors: {
        primary?: string;
        secondary?: string;
        accent?: string;
        text?: string;
        background?: string;
        alert_high?: string;
        alert_medium?: string;
        alert_low?: string;
        success?: string;
      };
      typography: {
        primary_font?: string;
        secondary_font?: string;
        heading_sizes?: {
          h1?: string;
          h2?: string;
          h3?: string;
          h4?: string;
        };
        body_text?: string;
      };
      companyValues?: {
        enabled: boolean;
        values: string[];
        display_location: string;
      };
    };
    dashboards: Record<string, any>;
    visualizations: Record<string, any>;
}

export interface ReportComponent {
    component_name: string;
    content: string;
    visualization: string;
}

export interface Report {
    id: string;
    name: string;
    description: string;
    components: ReportComponent[];
    deliveryFormat: string[];
    audience: string[];
}

export interface CompanyData {
    companyProfile: {
      name: string;
      legalName: string;
      industry: string;
      employeeCount: number;
      revenue: string;
      operatingCompanies: any[];
    };
    uiFeatures: UIFeature[];
    uiCustomization: UICustomization;
    reports: Report[];
}

// New enhanced types for dynamic JSON processing
export type JsonSchemaType = 
  | 'company_data'
  | 'dashboard_config'
  | 'form_schema'
  | 'chart_config'
  | 'table_config'
  | 'navigation_menu'
  | 'user_profile'
  | 'generic_object'
  | 'unknown';

export interface ProcessedJsonData {
  schemaType: JsonSchemaType;
  title: string;
  description?: string;
  data: any;
  uiComponents: UIComponent[];
  metadata: {
    fields: number;
    depth: number;
    hasArrays: boolean;
    hasObjects: boolean;
  };
}

export interface UIComponent {
  id: string;
  type: 'card' | 'table' | 'list' | 'form' | 'chart' | 'metric' | 'text' | 'button' | 'grid';
  title: string;
  data: any;
  props?: Record<string, any>;
}

// Utility functions
export const analyzeJsonStructure = (obj: any, depth = 0): any => {
  if (typeof obj !== 'object' || obj === null) {
    return { type: typeof obj, depth };
  }

  const analysis = {
    type: Array.isArray(obj) ? 'array' : 'object',
    depth,
    keys: Array.isArray(obj) ? obj.length : Object.keys(obj).length,
    hasArrays: false,
    hasObjects: false,
    hasNested: false
  };

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        analysis.hasObjects = true;
        analysis.hasNested = true;
      }
    });
  } else {
    Object.values(obj).forEach(value => {
      if (Array.isArray(value)) {
        analysis.hasArrays = true;
        analysis.hasNested = true;
      } else if (typeof value === 'object' && value !== null) {
        analysis.hasObjects = true;
        analysis.hasNested = true;
      }
    });
  }

  return analysis;
};

export const detectJsonSchemaType = (jsonData: any): JsonSchemaType => {
  if (!jsonData || typeof jsonData !== 'object') {
    return 'unknown';
  }

  // Company data detection
  if (jsonData.company_profile && jsonData.rag_solution_requirements) {
    return 'company_data';
  }

  // Dashboard configuration detection
  if (jsonData.dashboards || jsonData.widgets || jsonData.layout) {
    return 'dashboard_config';
  }

  // Form schema detection
  if (jsonData.fields && Array.isArray(jsonData.fields)) {
    return 'form_schema';
  }

  // Chart configuration detection
  if (jsonData.type && (jsonData.data || jsonData.datasets) && (jsonData.options || jsonData.config)) {
    return 'chart_config';
  }

  // Table configuration detection
  if (jsonData.columns && jsonData.rows) {
    return 'table_config';
  }

  // Navigation menu detection
  if ((jsonData.menu || jsonData.navigation) && Array.isArray(jsonData.menu || jsonData.navigation)) {
    return 'navigation_menu';
  }

  // User profile detection
  if (jsonData.user || jsonData.profile || (jsonData.name && jsonData.email)) {
    return 'user_profile';
  }

  // Generic object
  return 'generic_object';
};

export const generateUIComponents = (jsonData: any, schemaType: JsonSchemaType): UIComponent[] => {
  const components: UIComponent[] = [];

  switch (schemaType) {
    case 'company_data':
      components.push(...generateCompanyDataComponents(jsonData));
      break;
    
    case 'dashboard_config':
      components.push(...generateDashboardComponents(jsonData));
      break;
    
    case 'form_schema':
      components.push(...generateFormComponents(jsonData));
      break;
    
    case 'chart_config':
      components.push(...generateChartComponents(jsonData));
      break;
    
    case 'table_config':
      components.push(...generateTableComponents(jsonData));
      break;
    
    case 'navigation_menu':
      components.push(...generateNavigationComponents(jsonData));
      break;
    
    case 'user_profile':
      components.push(...generateUserProfileComponents(jsonData));
      break;
    
    case 'generic_object':
    default:
      components.push(...generateGenericComponents(jsonData));
      break;
  }

  return components;
};

// Component generators for different schema types
const generateCompanyDataComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  if (data.company_profile?.basic_info) {
    components.push({
      id: 'company-profile',
      type: 'card',
      title: 'Company Profile',
      data: data.company_profile.basic_info
    });
  }

  if (data.rag_solution_requirements?.contract_analysis_features) {
    components.push({
      id: 'features-table',
      type: 'table',
      title: 'AI Features',
      data: data.rag_solution_requirements.contract_analysis_features
    });
  }

  if (data.rag_solution_requirements?.ui_customization?.branding?.colors) {
    components.push({
      id: 'color-palette',
      type: 'grid',
      title: 'Brand Colors',
      data: data.rag_solution_requirements.ui_customization.branding.colors
    });
  }

  return components;
};

const generateDashboardComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  if (data.widgets) {
    components.push({
      id: 'widgets-grid',
      type: 'grid',
      title: 'Dashboard Widgets',
      data: data.widgets
    });
  }

  if (data.layout) {
    components.push({
      id: 'layout-config',
      type: 'card',
      title: 'Layout Configuration',
      data: data.layout
    });
  }

  return components;
};

const generateFormComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  components.push({
    id: 'form-preview',
    type: 'form',
    title: data.title || 'Form Preview',
    data: data.fields || []
  });

  if (data.validation) {
    components.push({
      id: 'validation-rules',
      type: 'card',
      title: 'Validation Rules',
      data: data.validation
    });
  }

  return components;
};

const generateChartComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  components.push({
    id: 'chart-preview',
    type: 'chart',
    title: data.title || `${data.type || 'Chart'} Preview`,
    data: data
  });

  if (data.options || data.config) {
    components.push({
      id: 'chart-config',
      type: 'card',
      title: 'Chart Configuration',
      data: data.options || data.config
    });
  }

  return components;
};

const generateTableComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  components.push({
    id: 'data-table',
    type: 'table',
    title: data.title || 'Data Table',
    data: {
      columns: data.columns,
      rows: data.rows
    }
  });

  return components;
};

const generateNavigationComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  const menuData = data.menu || data.navigation;
  components.push({
    id: 'navigation-menu',
    type: 'list',
    title: 'Navigation Menu',
    data: menuData
  });

  return components;
};

const generateUserProfileComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  const profileData = data.user || data.profile || data;
  components.push({
    id: 'user-profile',
    type: 'card',
    title: 'User Profile',
    data: profileData
  });

  if (data.preferences) {
    components.push({
      id: 'user-preferences',
      type: 'card',
      title: 'Preferences',
      data: data.preferences
    });
  }

  return components;
};

const generateGenericComponents = (data: any): UIComponent[] => {
  const components: UIComponent[] = [];
  
  // Generate components based on data structure
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        // Array of objects - create a table
        components.push({
          id: `${key}-table`,
          type: 'table',
          title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          data: value
        });
      } else {
        // Array of primitives - create a list
        components.push({
          id: `${key}-list`,
          type: 'list',
          title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          data: value
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      // Object - create a card
      components.push({
        id: `${key}-card`,
        type: 'card',
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        data: value
      });
    } else if (typeof value === 'number') {
      // Number - create a metric
      components.push({
        id: `${key}-metric`,
        type: 'metric',
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        data: value
      });
    }
  });

  return components;
};

// Enhanced main processing function
export const processJsonData = (jsonData: any): ProcessedJsonData => {
  const schemaType = detectJsonSchemaType(jsonData);
  const analysis = analyzeJsonStructure(jsonData);
  
  const processedData: ProcessedJsonData = {
    schemaType,
    title: getSchemaTitle(schemaType, jsonData),
    description: getSchemaDescription(schemaType, jsonData),
    data: jsonData,
    uiComponents: generateUIComponents(jsonData, schemaType),
    metadata: {
      fields: analysis.keys,
      depth: analysis.depth,
      hasArrays: analysis.hasArrays,
      hasObjects: analysis.hasObjects
    }
  };

  return processedData;
};

const getSchemaTitle = (schemaType: JsonSchemaType, data: any): string => {
  switch (schemaType) {
    case 'company_data':
      return data.company_profile?.basic_info?.company_name || 'Company Data';
    case 'dashboard_config':
      return data.title || 'Dashboard Configuration';
    case 'form_schema':
      return data.title || 'Form Schema';
    case 'chart_config':
      return data.title || `${data.type || 'Chart'} Configuration`;
    case 'table_config':
      return data.title || 'Table Data';
    case 'navigation_menu':
      return 'Navigation Menu';
    case 'user_profile':
      return `${data.user?.name || data.profile?.name || data.name || 'User'} Profile`;
    default:
      return 'JSON Data Visualization';
  }
};

const getSchemaDescription = (schemaType: JsonSchemaType, data: any): string => {
  switch (schemaType) {
    case 'company_data':
      return 'Company profile and contract analysis configuration';
    case 'dashboard_config':
      return 'Dashboard layout and widget configuration';
    case 'form_schema':
      return 'Form field definitions and validation rules';
    case 'chart_config':
      return 'Chart data and visualization settings';
    case 'table_config':
      return 'Tabular data with columns and rows';
    case 'navigation_menu':
      return 'Navigation menu structure and links';
    case 'user_profile':
      return 'User information and preferences';
    default:
      return 'Generic JSON data structure';
  }
};

// Legacy functions for backward compatibility
export const processUIFeatures = (features: any[]): UIFeature[] => {
    if (!features || !Array.isArray(features)) {
      return [];
    }
    
    return features.map(feature => ({
      id: feature.feature_id,
      name: feature.feature_name,
      buttonType: feature.button_type || 'default',
      displayLocation: feature.display_location,
      functionality: feature.functionality,
      priority: feature.implementation_priority
    }));
};

export const processUICustomization = (customization: any): UICustomization => {
    if (!customization) {
      return {
        branding: { colors: {}, typography: {} },
        dashboards: {},
        visualizations: {}
      };
    }
    
    return {
      branding: {
        logo: customization.branding?.logo,
        colors: customization.branding?.colors || {},
        typography: customization.branding?.typography || {},
        companyValues: customization.branding?.company_values_display
      },
      dashboards: customization.dashboards || {},
      visualizations: customization.visualization_types || {}
    };
};

export const processReports = (reports: any[]): Report[] => {
    if (!reports || !Array.isArray(reports)) {
      return [];
    }
    
    return reports.map(report => ({
      id: report.report_id,
      name: report.report_name,
      description: report.description,
      components: report.components || [],
      deliveryFormat: report.delivery_format || [],
      audience: report.target_audience || []
    }));
};

export const processCompanyData = (jsonData: any): CompanyData | null => {
    if (!jsonData) return null;
    
    return {
      companyProfile: {
        name: jsonData.company_profile?.basic_info?.company_name,
        legalName: jsonData.company_profile?.basic_info?.legal_name,
        industry: jsonData.company_profile?.basic_info?.industry,
        employeeCount: jsonData.company_profile?.basic_info?.employee_count,
        revenue: jsonData.company_profile?.basic_info?.annual_revenue,
        operatingCompanies: jsonData.company_profile?.operating_companies || []
      },
      uiFeatures: processUIFeatures(jsonData.rag_solution_requirements?.contract_analysis_features),
      uiCustomization: processUICustomization(jsonData.rag_solution_requirements?.ui_customization),
      reports: processReports(jsonData.rag_solution_requirements?.contract_analysis_reports)
    };
};