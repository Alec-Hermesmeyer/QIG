-- Insert only the three main services
-- Run this if the services table exists but is empty

INSERT INTO services (service_name, service_key, display_name, description, default_features, default_limits, default_ui_config) VALUES 
(
    'Contract Analyst',
    'contract-analyst',
    'Contract Analyst',
    'AI-powered contract analysis and review platform',
    '{
        "contract_analysis": true,
        "clause_extraction": true,
        "risk_assessment": true,
        "template_matching": true,
        "compliance_checking": true,
        "redline_comparison": true,
        "bulk_processing": false,
        "custom_workflows": false,
        "advanced_analytics": false
    }',
    '{
        "requests_per_minute": 30,
        "requests_per_day": 500,
        "max_file_size_mb": 25,
        "max_concurrent_sessions": 3,
        "contracts_per_month": 100
    }',
    '{
        "theme_primary_color": "#059669",
        "theme_secondary_color": "#064e3b",
        "service_icon": "FileText",
        "sidebar_color": "#065f46"
    }'
),
(
    'Open Records',
    'open-records',
    'Open Records',
    'Public records management and FOIA request processing system',
    '{
        "document_search": true,
        "metadata_extraction": true,
        "redaction_tools": true,
        "foia_processing": true,
        "batch_operations": true,
        "audit_trails": true,
        "public_portal": false,
        "advanced_redaction": false,
        "ml_classification": false
    }',
    '{
        "requests_per_minute": 50,
        "requests_per_day": 800,
        "max_file_size_mb": 100,
        "max_concurrent_sessions": 5,
        "records_per_month": 1000
    }',
    '{
        "theme_primary_color": "#2563eb",
        "theme_secondary_color": "#1e3a8a",
        "service_icon": "Archive",
        "sidebar_color": "#1d4ed8"
    }'
),
(
    'Insurance Broker',
    'insurance-broker',
    'Insurance Broker',
    'Insurance policy analysis and comparison platform',
    '{
        "policy_analysis": true,
        "coverage_comparison": true,
        "risk_assessment": true,
        "premium_calculation": true,
        "claims_processing": true,
        "client_portal": true,
        "automated_quotes": false,
        "advanced_underwriting": false,
        "integration_apis": false
    }',
    '{
        "requests_per_minute": 40,
        "requests_per_day": 600,
        "max_file_size_mb": 15,
        "max_concurrent_sessions": 4,
        "policies_per_month": 200
    }',
    '{
        "theme_primary_color": "#dc2626",
        "theme_secondary_color": "#991b1b",
        "service_icon": "Shield",
        "sidebar_color": "#b91c1c"
    }'
) ON CONFLICT (service_key) DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as inserted_services FROM services;
SELECT service_name, service_key FROM services ORDER BY service_name; 