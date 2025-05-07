// src/utils/jsonProcessor.ts

// Type definitions
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
  
  // Function to process UI feature data from JSON
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
  
  // Function to process UI customization data
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
  
  // Function to parse report data
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
  
  // Main function to process the entire JSON
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