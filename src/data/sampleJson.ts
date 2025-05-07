// src/data/sampleJSON.ts

const sampleJSON = {
    company_profile: {
      basic_info: {
        company_name: "Austin Industries",
        legal_name: "Austin Industries, Inc.",
        industry: "Construction",
        employee_count: 7000,
        annual_revenue: "$2 billion"
      },
      operating_companies: [
        {
          name: "Austin Bridge & Road",
          primary_contract_types: ["Government Transportation Contracts", "Municipal Infrastructure Projects"],
          contract_volume: "35% of total company contracts",
          average_contract_value: "$35M"
        },
        {
          name: "Austin Commercial",
          primary_contract_types: ["Commercial Construction Management", "Design-Build Agreements"],
          contract_volume: "40% of total company contracts",
          average_contract_value: "$50M"
        }
      ]
    },
    rag_solution_requirements: {
      contract_analysis_features: [
        {
          feature_id: "CA001",
          feature_name: "Clause Risk Scanner",
          functionality: "Identifies high-risk clauses in contracts and compares against approved language",
          implementation_priority: "High",
          button_type: "primary",
          display_location: "document_viewer"
        },
        {
          feature_id: "CA002",
          feature_name: "Obligation Extractor",
          functionality: "Identifies all contractual obligations and creates a structured calendar and responsibility matrix",
          implementation_priority: "High",
          button_type: "primary",
          display_location: "contract_summary"
        },
        {
          feature_id: "CA003",
          feature_name: "Change Order Risk Analyzer",
          functionality: "Analyzes proposed change orders against original contract terms to identify risks and inconsistencies",
          implementation_priority: "Medium",
          button_type: "secondary",
          display_location: "document_viewer"
        },
        {
          feature_id: "CA005",
          feature_name: "Regulatory Compliance Checker",
          functionality: "Verifies contract compliance with applicable regulations and standards",
          implementation_priority: "High",
          button_type: "primary",
          display_location: "compliance_tab"
        },
        {
          feature_id: "CA006",
          feature_name: "Financial Term Analyzer",
          functionality: "Extracts and analyzes payment terms, fee structures, and financial risks",
          implementation_priority: "High",
          button_type: "primary",
          display_location: "financial_tab"
        }
      ],
      ui_customization: {
        branding: {
          logo: {
            url: "https://www.austin-ind.com/logo.png",
            alt_text: "Austin Industries Logo",
            display_locations: ["header", "reports", "login_screen"]
          },
          colors: {
            primary: "#0056b3",
            secondary: "#003366",
            accent: "#ff7700",
            text: "#333333",
            background: "#ffffff",
            alert_high: "#d9534f",
            alert_medium: "#f0ad4e",
            alert_low: "#5bc0de",
            success: "#5cb85c"
          },
          typography: {
            primary_font: "Roboto, sans-serif",
            secondary_font: "Open Sans, sans-serif",
            heading_sizes: {
              h1: "24px",
              h2: "20px",
              h3: "18px",
              h4: "16px"
            },
            body_text: "14px"
          },
          company_values_display: {
            enabled: true,
            values: ["Safety", "Service", "Integrity", "Employee-Ownership"],
            display_location: "sidebar"
          }
        },
        dashboards: {
          executive_dashboard: {
            layout: "grid",
            default_timeframe: "Last 30 days",
            primary_widgets: [
              "Contract Risk Summary",
              "Critical Obligation Timeline",
              "Financial Risk Exposure",
              "Regulatory Compliance Status"
            ]
          }
        }
      },
      contract_analysis_reports: [
        {
          report_id: "CR001",
          report_name: "Contract Risk Profile",
          description: "Comprehensive analysis of an individual contract's risk factors and mitigation strategies",
          components: [
            {
              component_name: "Executive Summary",
              content: "Overall risk assessment with key findings and recommendations",
              visualization: "Risk scorecard with executive-friendly metrics"
            },
            {
              component_name: "Clause Risk Analysis",
              content: "Detailed breakdown of high-risk clauses with specific language concerns",
              visualization: "Heat-mapped contract with risk annotations"
            }
          ],
          delivery_format: ["Interactive Web Dashboard", "PDF Export", "PowerPoint Export"],
          target_audience: ["Project Executives", "Legal Team", "Risk Managers"]
        },
        {
          report_id: "CR002",
          report_name: "Contract Portfolio Analysis",
          description: "Aggregated risk analysis across multiple contracts to identify patterns and systemic risks",
          components: [
            {
              component_name: "Portfolio Overview",
              content: "Summary statistics on contract portfolio with risk distribution",
              visualization: "Multi-dimensional risk distribution charts"
            }
          ],
          delivery_format: ["Interactive Web Dashboard", "PDF Export", "Executive Presentation"],
          target_audience: ["Executive Leadership", "Legal Department", "Risk Committee"]
        }
      ]
    }
  };
  
  export default sampleJSON;