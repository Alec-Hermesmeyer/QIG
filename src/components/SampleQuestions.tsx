'use client';

import { useState } from 'react';
import { useSampleQuestions, SampleQuestion } from '@/hooks/useSampleQuestions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SampleQuestionsProps {
  onQuestionClick: (question: string) => void;
  limit?: number;
  className?: string;
}

export default function SampleQuestions({ 
  onQuestionClick, 
  limit = 5,
  className = ''
}: SampleQuestionsProps) {
  const { sampleQuestions, loading, error } = useSampleQuestions({ limit });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Get unique categories
  const categories = [...new Set(sampleQuestions.map(q => q.category || 'General'))];
  
  // Filter questions by active category or show all if no category is selected
  const filteredQuestions = activeCategory 
    ? sampleQuestions.filter(q => (q.category || 'General') === activeCategory)
    : sampleQuestions;
  
  // Limit number of questions shown
  const displayQuestions = filteredQuestions.slice(0, limit);
  
  if (loading) {
    return (
      <div className={`flex justify-center items-center py-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        Failed to load sample questions
      </div>
    );
  }
  
  if (sampleQuestions.length === 0) {
    return null; // Don't show anything if no questions available
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-500">
        <Lightbulb className="w-4 h-4" />
        <span>Sample Questions</span>
      </div>
      
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={activeCategory === null ? "secondary" : "outline"}
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => setActiveCategory(null)}
          >
            All
          </Badge>
          {categories.map(category => (
            <Badge
              key={category}
              variant={activeCategory === category ? "secondary" : "outline"}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      )}
      
      <div className="space-y-2">
        {displayQuestions.map((q, index) => (
          <motion.div
            key={q.id} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Button
              variant="ghost"
              className="justify-between w-full text-left hover:bg-gray-100 rounded-lg h-auto py-2 px-3"
              onClick={() => onQuestionClick(q.question)}
            >
              <span className="flex-1 text-sm mr-2">{q.question}</span>
              <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 