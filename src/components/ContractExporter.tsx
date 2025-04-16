'use client';

import React from 'react';
import { Risk } from '@/lib/useContractAnalyst';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ContractExporterProps {
  contractText: string;
  risks: Risk[];
  mitigationPoints: string[];
  documentTitle?: string;
}

export const ContractExporter: React.FC<ContractExporterProps> = ({
  contractText,
  risks,
  mitigationPoints,
  documentTitle = 'Contract Analysis'
}) => {
  // Helper function to get color based on risk score
  const getRiskColor = (score: string) => {
    switch (score.toLowerCase()) {
      case 'critical': return '#ffcccc'; // Light red
      case 'high': return '#ffd8b5';     // Light orange  
      case 'medium': return '#fff4b5';   // Light yellow
      case 'low': return '#d1ffd1';      // Light green
      default: return '#f0f0f0';         // Light gray
    }
  };

  const getRiskTextColor = (score: string) => {
    switch (score.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f97316';     // Orange
      case 'medium': return '#eab308';   // Yellow
      case 'low': return '#22c55e';      // Green
      default: return '#6b7280';         // Gray
    }
  };

  // Create and download a document
  const exportToWord = () => {
    try {
      // Process contract text with highlights
      let processedText = contractText;
      
      // Find all risk text occurrences in the full text
      risks.forEach(risk => {
        if (!risk.text) return;
        const cleanRiskText = risk.text.replace(/["']/g, '').trim();
        
        // Skip empty or very short risk texts
        if (cleanRiskText.length < 5) return;
        
        // Try to find the text in the contract
        const index = processedText.indexOf(cleanRiskText);
        
        if (index >= 0) {
          // Create the highlighted version
          const highlighted = `<span style="background-color: ${getRiskColor(risk.score)}; padding: 1px 0;">${cleanRiskText}</span>`;
          
          // Replace the text with highlighted version
          processedText = 
            processedText.substring(0, index) + 
            highlighted + 
            processedText.substring(index + cleanRiskText.length);
        }
      });
      
      // Format the contract text with paragraphs
      const formattedContractText = processedText
        .split('\n\n')
        .map(para => `<p>${para}</p>`)
        .join('');

      // Group risks by severity
      const criticalRisks = risks.filter(risk => risk.score.toLowerCase() === 'critical');
      const highRisks = risks.filter(risk => risk.score.toLowerCase() === 'high');
      const mediumRisks = risks.filter(risk => risk.score.toLowerCase() === 'medium');
      const lowRisks = risks.filter(risk => risk.score.toLowerCase() === 'low');
      
      // Create risk table rows
      const createRiskRow = (risk: Risk, index: number) => {
        return `
          <tr>
            <td style="text-align: center;">${index}</td>
            <td>${risk.category || 'Unspecified'}</td>
            <td style="text-align: center; background-color: ${getRiskColor(risk.score)};">
              <span style="font-weight: ${risk.score.toLowerCase() === 'critical' || risk.score.toLowerCase() === 'high' ? 'bold' : 'normal'};">
                ${risk.score}
              </span>
            </td>
            <td>${risk.text || ''}</td>
            <td>${risk.reason || ''}</td>
          </tr>
        `;
      };
      
      // Create all risk rows
      let riskRows = '';
      let riskCounter = 1;
      
      // Add risks in order of severity
      criticalRisks.forEach(risk => {
        riskRows += createRiskRow(risk, riskCounter++);
      });
      
      highRisks.forEach(risk => {
        riskRows += createRiskRow(risk, riskCounter++);
      });
      
      mediumRisks.forEach(risk => {
        riskRows += createRiskRow(risk, riskCounter++);
      });
      
      lowRisks.forEach(risk => {
        riskRows += createRiskRow(risk, riskCounter++);
      });
      
      // Create mitigation list items
      const mitigationItems = mitigationPoints.map((point, index) => {
        return `<li>${point}</li>`;
      }).join('');
      
      // Build complete HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${documentTitle}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            /* General styles */
            body {
              font-family: Calibri, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            h1 {
              color: #2F5496;
              text-align: center;
              font-size: 24pt;
              margin-bottom: 10px;
            }
            h2 {
              color: #2F5496;
              font-size: 18pt;
              margin-top: 40px;
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
              page-break-before: always;
            }
            .export-date {
              text-align: center;
              margin-bottom: 30px;
              font-size: 12pt;
              color: #666;
            }
            .contract-text {
              background-color: #f9f9f9;
              padding: 20px;
              border: 1px solid #e0e0e0;
              border-radius: 5px;
              margin-bottom: 30px;
              white-space: pre-line;
            }
            /* Table styles */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8pt;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            /* List styles */
            .mitigation-list {
              background-color: #f0f7ff;
              padding: 20px;
              border-radius: 5px;
              border-left: 4px solid #4b89dc;
            }
            /* Risk summary styles */
            .risk-summary {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-bottom: 20px;
            }
            .risk-count {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .risk-indicator {
              width: 20px;
              height: 20px;
              display: inline-block;
              border-radius: 3px;
            }
            /* Basic MsWord styles for better compatibility */
            @page {
              mso-page-orientation: portrait;
              margin: 2.5cm;
            }
            div.MsoNormal {
              mso-style-parent:"";
              margin:0in;
              margin-bottom:.0001pt;
              mso-pagination:widow-orphan;
              font-size:12.0pt;
              font-family:Calibri;
            }
            /* Printing styles */
            @media print {
              body {
                padding: 0;
              }
              h2 {
                page-break-before: always;
              }
              table {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <h1>${documentTitle}</h1>
          <p class="export-date">Exported on ${new Date().toLocaleDateString()}</p>
          
          <h2>Risk Summary</h2>
          
          <div class="risk-summary">
            <div class="risk-count">
              <span class="risk-indicator" style="background-color: ${getRiskColor('critical')};"></span>
              <span>Critical: ${criticalRisks.length}</span>
            </div>
            <div class="risk-count">
              <span class="risk-indicator" style="background-color: ${getRiskColor('high')};"></span>
              <span>High: ${highRisks.length}</span>
            </div>
            <div class="risk-count">
              <span class="risk-indicator" style="background-color: ${getRiskColor('medium')};"></span>
              <span>Medium: ${mediumRisks.length}</span>
            </div>
            <div class="risk-count">
              <span class="risk-indicator" style="background-color: ${getRiskColor('low')};"></span>
              <span>Low: ${lowRisks.length}</span>
            </div>
          </div>
          
          <table border="1" cellspacing="0" cellpadding="5">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 20%;">Category</th>
                <th style="width: 10%;">Severity</th>
                <th style="width: 30%;">Risk Text</th>
                <th style="width: 35%;">Reason</th>
              </tr>
            </thead>
            <tbody>
              ${riskRows}
            </tbody>
          </table>
          
          <h2>Contract Text with Highlighted Risks</h2>
          
          <div class="contract-text">
            ${formattedContractText}
          </div>
          
          <h2>Mitigation Strategies</h2>
          
          <div class="mitigation-list">
            <ol>
              ${mitigationItems}
            </ol>
          </div>
        </body>
        </html>
      `;
      
      // Function to convert and download as Word
      const downloadAsWord = (htmlContent: string, filename: string) => {
        // Create a Blob with the HTML content
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        
        // Add special Word-friendly headers
        const wordHeader = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      
      // Download as Word document
      downloadAsWord(htmlContent, `${documentTitle.replace(/\s+/g, '_')}.doc`);
      
    } catch (error) {
      console.error('Error exporting document:', error);
      alert('Failed to export the document. Please try again.');
    }
  };

  return (
    <Button 
      onClick={exportToWord}
      className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
    >
      <Download size={18} />
      Export to Word
    </Button>
  );
};