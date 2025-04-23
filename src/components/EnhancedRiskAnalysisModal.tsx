import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, AlertTriangle, FileCheck, ArrowDownCircle } from 'lucide-react';

// Define types for the risk and analysis data
interface Risk {
  id: string | number;
  category: string;
  score: string;
  text: string;
  reason: string;
  location: string;
}

interface ContractAnalysisData {
  analysisText: string;
  risks: Risk[];
  mitigationPoints: string[];
  contractText: string;
}

interface ContractRiskAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisData: ContractAnalysisData | null;
}

const ContractRiskAnalysisModal = ({ 
  isOpen, 
  onClose, 
  analysisData 
}: ContractRiskAnalysisModalProps) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedRisk, setExpandedRisk] = useState<string | number | null>(null);
  
  // Reset expanded risk when analysis data changes
  useEffect(() => {
    setExpandedRisk(null);
  }, [analysisData]);
  
  // If no analysis data is provided, show a loading state
  if (!analysisData) {
    return null;
  }
  
  // Calculate risk counts by severity
  const criticalRisks = analysisData.risks.filter(risk => risk.score.toLowerCase() === 'critical');
  const highRisks = analysisData.risks.filter(risk => risk.score.toLowerCase() === 'high');
  const mediumRisks = analysisData.risks.filter(risk => risk.score.toLowerCase() === 'medium');
  const lowRisks = analysisData.risks.filter(risk => risk.score.toLowerCase() === 'low');
  
  // Helper function to get risk color based on severity
  const getRiskColor = (score: string) => {
    switch(score.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  // Modal animation variants
  const modalVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30 
      }
    },
    exit: { 
      x: '100%', 
      opacity: 0,
      transition: { 
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  };
  
  // Risk card animation variants
  const riskCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ 
      opacity: 1, 
      y: 0,
      transition: { 
        delay: i * 0.1,
        duration: 0.3
      }
    }),
    hover: { 
      y: -5, 
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" 
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed right-0 top-0 bottom-0 w-1/3 min-w-[400px] bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Contract Risk Analysis</h2>
            <motion.button 
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={20} />
            </motion.button>
          </div>
          
          {/* Summary Section */}
          <div className="bg-indigo-50 p-6">
            <motion.div 
              className="flex flex-col space-y-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-medium text-gray-800">Contract Risk Analysis</h3>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-gray-700 font-medium">{analysisData.risks.length} risks identified in this contract</p>
                
                <div className="flex gap-3 mt-3">
                  {criticalRisks.length > 0 && (
                    <motion.div 
                      className="flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span>{criticalRisks.length}</span>
                      <span>Critical</span>
                    </motion.div>
                  )}
                  
                  {highRisks.length > 0 && (
                    <motion.div 
                      className="flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span>{highRisks.length}</span>
                      <span>High</span>
                    </motion.div>
                  )}
                  
                  {mediumRisks.length > 0 && (
                    <motion.div 
                      className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span>{mediumRisks.length}</span>
                      <span>Medium</span>
                    </motion.div>
                  )}
                  
                  {lowRisks.length > 0 && (
                    <motion.div 
                      className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span>{lowRisks.length}</span>
                      <span>Low</span>
                    </motion.div>
                  )}
                </div>
                
                {analysisData.mitigationPoints.length > 0 && (
                  <p className="text-gray-600 text-sm mt-3">
                    {analysisData.mitigationPoints.length} mitigation strategies available. Click "View Full Assessment" for details.
                  </p>
                )}
              </div>
              
              <motion.button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium flex items-center justify-center gap-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab('summary')}
              >
                View Full Assessment
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <motion.button 
              className={`px-6 py-3 font-medium text-sm ${activeTab === 'summary' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
              onClick={() => setActiveTab('summary')}
              whileHover={{ backgroundColor: activeTab === 'summary' ? undefined : 'rgba(79, 70, 229, 0.05)' }}
            >
              Key Risks
            </motion.button>
            
            {analysisData.mitigationPoints.length > 0 && (
              <motion.button 
                className={`px-6 py-3 font-medium text-sm ${activeTab === 'mitigation' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
                onClick={() => setActiveTab('mitigation')}
                whileHover={{ backgroundColor: activeTab === 'mitigation' ? undefined : 'rgba(79, 70, 229, 0.05)' }}
              >
                Mitigation
              </motion.button>
            )}
            
            {analysisData.contractText && (
              <motion.button 
                className={`px-6 py-3 font-medium text-sm ${activeTab === 'contract' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
                onClick={() => setActiveTab('contract')}
                whileHover={{ backgroundColor: activeTab === 'contract' ? undefined : 'rgba(79, 70, 229, 0.05)' }}
              >
                Contract Text
              </motion.button>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'summary' && (
                <motion.div 
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {analysisData.risks.length === 0 ? (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-center">
                      <p className="text-blue-800">No specific risks were identified in this contract.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analysisData.risks.map((risk, index) => (
                        <motion.div 
                          key={risk.id || index}
                          className="border rounded-lg overflow-hidden"
                          custom={index}
                          variants={riskCardVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                        >
                          <div 
                            className="flex justify-between items-center p-4 cursor-pointer"
                            onClick={() => setExpandedRisk(expandedRisk === (risk.id || index) ? null : (risk.id || index))}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getRiskColor(risk.score)}`}>
                                <AlertTriangle size={16} />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-800">{risk.category}</h4>
                                <p className="text-sm text-gray-600">{risk.location}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(risk.score)}`}>
                                {risk.score}
                              </span>
                              <motion.div
                                animate={{ rotate: expandedRisk === (risk.id || index) ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ArrowDownCircle size={16} className="text-gray-500" />
                              </motion.div>
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {expandedRisk === (risk.id || index) && (
                              <motion.div 
                                className="p-4 border-t bg-gray-50"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="mb-3">
                                  <h5 className="font-medium text-gray-700 mb-1">Risky Contract Text:</h5>
                                  <p className="text-sm bg-white p-2 rounded border border-gray-200 italic">"{risk.text}"</p>
                                </div>
                                <div>
                                  <h5 className="font-medium text-gray-700 mb-1">Why This Is a Risk:</h5>
                                  <p className="text-sm">{risk.reason}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              
              {activeTab === 'mitigation' && (
                <motion.div 
                  key="mitigation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {analysisData.mitigationPoints.length === 0 ? (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-center">
                      <p className="text-blue-800">No mitigation strategies are available for this contract.</p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded-md mb-6">
                      <h3 className="flex items-center gap-2 text-lg font-medium text-green-800 mb-3">
                        <FileCheck size={20} />
                        Mitigation Strategies
                      </h3>
                      <p className="text-sm text-green-800 mb-4">
                        Consider the following actions to mitigate the identified risks in this contract:
                      </p>
                      <ul className="space-y-3">
                        {analysisData.mitigationPoints.map((mitigation, index) => (
                          <motion.li 
                            key={index}
                            className="flex items-start gap-2 text-gray-800"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="min-w-6 mt-1">
                              <div className="h-5 w-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                            </div>
                            <p>{mitigation}</p>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-800">
                      These mitigation strategies are suggestions only. You should consult with legal counsel before implementing changes to your contract.
                    </p>
                  </div>
                </motion.div>
              )}
              
              {activeTab === 'contract' && (
                <motion.div 
                  key="contract"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white p-4 rounded-lg border border-gray-200"
                >
                  {analysisData.contractText ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                      {analysisData.contractText}
                    </pre>
                  ) : (
                    <div className="h-96 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-400">Contract text not available</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContractRiskAnalysisModal;