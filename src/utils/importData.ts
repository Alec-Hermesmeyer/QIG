// src/utils/importData.ts
import { supabase } from '@/lib/supabase/client';

interface ImportResult {
  success: boolean;
  companyId?: string;
  error?: string;
}

export const importJSONData = async (jsonData: any): Promise<ImportResult> => {
  if (!jsonData) {
    throw new Error('No data provided');
  }
  
  // Begin transaction
  try {
    // 1. Import company profile data
    const companyProfileData = {
      company_name: jsonData.company_profile.basic_info.company_name,
      legal_name: jsonData.company_profile.basic_info.legal_name,
      basic_info: jsonData.company_profile.basic_info
    };
    
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profiles')
      .insert(companyProfileData)
      .select()
      .single();
      
    if (companyError) throw companyError;
    if (!companyProfile) throw new Error('Failed to insert company profile');
    
    // 2. Import operating companies
    const operatingCompaniesData = jsonData.company_profile.operating_companies.map((oc: any) => ({
      company_profile_id: companyProfile.id,
      name: oc.name,
      contract_types: oc.primary_contract_types,
      contract_volume: oc.contract_volume,
      average_contract_value: oc.average_contract_value,
      contract_risks: oc.primary_contract_risks
    }));
    
    const { error: ocError } = await supabase
      .from('operating_companies')
      .insert(operatingCompaniesData);
      
    if (ocError) throw ocError;
    
    // 3. Import contract document types
    const documentTypesData = jsonData.company_profile.contract_document_types.map((doc: any) => ({
      company_profile_id: companyProfile.id,
      document_type: doc.document_type,
      frequency: doc.frequency,
      components: doc.typical_components,
      average_page_count: doc.average_page_count,
      typical_format: doc.typical_format,
      storage_location: doc.storage_location
    }));
    
    const { error: docError } = await supabase
      .from('contract_document_types')
      .insert(documentTypesData);
      
    if (docError) throw docError;
    
    // 4. Import UI features
    const featuresData = jsonData.rag_solution_requirements.contract_analysis_features.map((feature: any) => ({
      feature_id: feature.feature_id,
      feature_name: feature.feature_name,
      functionality: feature.functionality,
      analysis_capabilities: feature.analysis_capabilities,
      implementation_priority: feature.implementation_priority,
      button_type: feature.button_type,
      display_location: feature.display_location
    }));
    
    const { error: featureError } = await supabase
      .from('ui_features')
      .insert(featuresData);
      
    if (featureError) throw featureError;
    
    // 5. Import UI customization
    const customizationData = {
      company_id: companyProfile.id,
      branding: jsonData.rag_solution_requirements.ui_customization.branding,
      dashboards: jsonData.rag_solution_requirements.ui_customization.dashboards,
      visualization_types: jsonData.rag_solution_requirements.ui_customization.visualization_types,
      mobile_experience: jsonData.rag_solution_requirements.ui_customization.mobile_experience
    };
    
    const { error: customizationError } = await supabase
      .from('ui_customization')
      .insert(customizationData);
      
    if (customizationError) throw customizationError;
    
    // 6. Import contract analysis reports
    const reportsData = jsonData.rag_solution_requirements.contract_analysis_reports.map((report: any) => ({
      report_id: report.report_id,
      report_name: report.report_name,
      description: report.description,
      components: report.components,
      customization_options: report.customization_options,
      delivery_format: report.delivery_format,
      scheduling: report.scheduling,
      target_audience: report.target_audience
    }));
    
    const { error: reportError } = await supabase
      .from('analysis_reports')
      .insert(reportsData);
      
    if (reportError) throw reportError;
    
    return { success: true, companyId: companyProfile.id };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Helper function to parse JSON file from upload
export const parseJSONFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = event => {
      try {
        if (event.target && event.target.result) {
          const data = JSON.parse(event.target.result as string);
          resolve(data);
        } else {
          reject(new Error('Failed to read file'));
        }
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    fileReader.onerror = error => reject(error);
    fileReader.readAsText(file);
  });
};