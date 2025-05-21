"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Zap, Database, FileSearch, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

export default function LandingPage() {
  const router = useRouter();
  const { user, organization } = useAuth();

  const navigateToPage = (path: string) => {
    router.push(path);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        {/* Hero section */}
        <motion.section
          className="bg-gradient-to-br from-red-500 to-red-600 text-white py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-7xl mx-auto px-6">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              QIG Document Intelligence
            </motion.h1>
            <motion.p 
              className="text-xl max-w-2xl opacity-90"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Choose the right solution for your document analysis needs
            </motion.p>
            
            {organization && (
              <motion.p 
                className="mt-4 text-sm"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Organization: <span className="font-semibold">{organization.name}</span>
              </motion.p>
            )}
          </div>
        </motion.section>

        {/* Main content */}
        <main className="flex-1 bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {/* FastRAG Card */}
              <motion.div 
                className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                variants={cardVariant}
                whileHover={{ y: -5 }}
                onClick={() => navigateToPage('/fast-rag')}
              >
                <div className="h-2 bg-blue-500"></div>
                <div className="p-8">
                  <div className="mb-4 flex items-center">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Sparkles size={24} className="text-blue-500" />
                    </div>
                    <h2 className="ml-4 text-2xl font-bold">FastRAG</h2>
                  </div>
                  <p className="text-gray-600 mb-8">
                    Quick document search and analysis with immediate responses and real-time insights.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                        <FileSearch size={16} className="text-blue-500" />
                      </div>
                      <span className="text-gray-700">Fast search across documents</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                        <BookOpen size={16} className="text-blue-500" />
                      </div>
                      <span className="text-gray-700">Quick summary generation</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                        <Database size={16} className="text-blue-500" />
                      </div>
                      <span className="text-gray-700">Basic document analysis</span>
                    </div>
                  </div>
                  <Button className="mt-8 bg-blue-500 hover:bg-blue-600">
                    Use FastRAG <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </motion.div>

              {/* DeepRAG Card */}
              <motion.div 
                className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                variants={cardVariant}
                whileHover={{ y: -5 }}
                onClick={() => navigateToPage('/deep-rag')}
              >
                <div className="h-2 bg-yellow-500"></div>
                <div className="p-8">
                  <div className="mb-4 flex items-center">
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Zap size={24} className="text-yellow-500" />
                    </div>
                    <h2 className="ml-4 text-2xl font-bold">DeepRAG</h2>
                  </div>
                  <p className="text-gray-600 mb-8">
                    Advanced document intelligence with X-Ray technology for deeper insights and structured data extraction.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                        <Zap size={16} className="text-yellow-500" />
                      </div>
                      <span className="text-gray-700">X-Ray document analysis</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                        <Database size={16} className="text-yellow-500" />
                      </div>
                      <span className="text-gray-700">Structured data extraction</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                        <FileSearch size={16} className="text-yellow-500" />
                      </div>
                      <span className="text-gray-700">Comprehensive document insights</span>
                    </div>
                  </div>
                  <Button className="mt-8 bg-yellow-500 hover:bg-yellow-600">
                    Use DeepRAG <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
            
            {/* Information text */}
            <motion.div 
              className="mt-12 bg-white p-6 rounded-lg shadow text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-xl font-semibold mb-2">Which RAG system should I use?</h3>
              <p className="text-gray-600">
                Use <span className="font-medium text-blue-600">FastRAG</span> for quick searches and simple document questions.
                Choose <span className="font-medium text-yellow-600">DeepRAG</span> when you need in-depth analysis, structured data extraction, or X-Ray insights.
              </p>
            </motion.div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 