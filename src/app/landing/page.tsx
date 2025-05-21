"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Zap, Database, FileSearch, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { LOGOS_BUCKET, getOrganizationLogoUrl } from "@/lib/supabase/storage";

// Animation variants
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
  const [logoUrl, setLogoUrl] = useState<string>('/defaultLogo.png');
  const [themeColor, setThemeColor] = useState<string>('bg-slate-800'); // Default theme

  // Fetch the organization logo and theme when the component mounts
  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!organization?.id) {
        console.log('No organization ID available');
        return;
      }
      
      console.log('Organization data:', organization);
      
      try {
        // First check if this organization has a logo in the bucket
        const { data: files, error } = await supabase.storage
          .from(LOGOS_BUCKET)
          .list(organization.id.toString());
          
        if (error) {
          console.error('Error fetching organization logo:', error);
          return;
        }
        
        console.log('Files in organization folder:', files);
        
        // If we have files, use the first one
        if (files && files.length > 0) {
          const logoPath = `${organization.id.toString()}/${files[0].name}`;
          console.log('Logo path:', logoPath);
          
          const url = getOrganizationLogoUrl(logoPath);
          console.log('Generated logo URL:', url);
          
          setLogoUrl(url);
        } else {
          console.log('No logo files found for organization');
          
          // Check if organization has a logo_url directly
          if (organization.logo_url) {
            console.log('Using organization.logo_url directly:', organization.logo_url);
            setLogoUrl(organization.logo_url);
          }
        }
        
        // Set theme color directly from the database
        if (organization.theme_color) {
          console.log('Using theme color from database:', organization.theme_color);
          setThemeColor(organization.theme_color);
        } else {
          console.log('No theme color found, using default');
        }
      } catch (err) {
        console.error('Failed to fetch organization data:', err);
      }
    };
    
    fetchOrganizationData();
  }, [organization]);

  const navigateToPage = (path: string) => {
    router.push(path);
  };

  // Get button style based on theme color
  const getButtonStyle = () => {
    // If theme color starts with bg-, convert it to the button equivalent
    if (themeColor.startsWith('bg-')) {
      return themeColor.replace('bg-', '');
    }
    return themeColor;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        {/* Header section - now using solid color instead of gradient */}
        <motion.section
          className={`${themeColor} text-white py-8`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center">
              {logoUrl && (
                <motion.div
                  className="mr-4 bg-white p-2 rounded-lg"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Image 
                    src={logoUrl} 
                    alt={organization?.name || 'Organization'} 
                    width={60} 
                    height={60}
                    className="rounded"
                    onError={() => {
                      console.error('Image failed to load:', logoUrl);
                      setLogoUrl('/defaultLogo.png');
                    }}
                    priority
                    unoptimized
                  />
                </motion.div>
              )}
              <div>
                <motion.h1 
                  className="text-3xl md:text-4xl font-semibold mb-1"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {organization?.name || 'QIG'} Document Intelligence
                </motion.h1>
                <motion.p 
                  className="text-lg max-w-2xl opacity-90"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Choose the right solution for your document analysis needs
                </motion.p>
              </div>
            </div>
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
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border border-gray-100"
                variants={cardVariant}
                whileHover={{ y: -4 }}
                onClick={() => navigateToPage('/fast-rag')}
              >
                <div className={`h-1 ${themeColor}`}></div>
                <div className="p-6">
                  <div className="mb-4 flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Sparkles size={20} className="text-blue-500" />
                    </div>
                    <h2 className="ml-3 text-xl font-semibold">FastRAG</h2>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Quick document search and analysis with immediate responses and real-time insights.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                        <FileSearch size={16} className="text-blue-500" />
                      </div>
                      <span className="text-gray-700">Fast search across documents</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                        <BookOpen size={16} className="text-blue-500" />
                      </div>
                      <span className="text-gray-700">Quick summary generation</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                        <Database size={16} className="text-blue-500" />
                      </div>
                      <span className="text-gray-700">Basic document analysis</span>
                    </div>
                  </div>
                  <Button className={`${getButtonStyle()} hover:opacity-90 text-white`}>
                    Use FastRAG <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </motion.div>

              {/* DeepRAG Card */}
              <motion.div 
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border border-gray-100"
                variants={cardVariant}
                whileHover={{ y: -4 }}
                onClick={() => navigateToPage('/deep-rag')}
              >
                <div className={`h-1 ${themeColor}`}></div>
                <div className="p-6">
                  <div className="mb-4 flex items-center">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Zap size={20} className="text-yellow-500" />
                    </div>
                    <h2 className="ml-3 text-xl font-semibold">DeepRAG</h2>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Advanced document intelligence with X-Ray technology for deeper insights and structured data extraction.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center mr-3">
                        <Zap size={16} className="text-yellow-500" />
                      </div>
                      <span className="text-gray-700">X-Ray document analysis</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center mr-3">
                        <Database size={16} className="text-yellow-500" />
                      </div>
                      <span className="text-gray-700">Structured data extraction</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center mr-3">
                        <FileSearch size={16} className="text-yellow-500" />
                      </div>
                      <span className="text-gray-700">Comprehensive document insights</span>
                    </div>
                  </div>
                  <Button className={`${getButtonStyle()} hover:opacity-90 text-white`}>
                    Use DeepRAG <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
            
            {/* Information text */}
            <motion.div 
              className="mt-10 bg-white p-5 rounded-lg shadow-sm text-center border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-lg font-semibold mb-2">Which RAG system should I use?</h3>
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