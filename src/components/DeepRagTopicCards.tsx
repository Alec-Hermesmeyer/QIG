'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Database, BarChart4, ArrowRight } from 'lucide-react';
import { useSampleQuestions } from '@/hooks/useSampleQuestions';
import { ImprovedChatHandle } from '@/components/chat';

// Animation variants
const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

// Card themes with icons and colors
const cardThemes = [
  {
    icon: FileSearch,
    title: 'Document Structure',
    colorFrom: 'from-amber-50',
    colorTo: 'to-amber-100',
    border: 'border-amber-200',
    bgIcon: 'bg-amber-200',
    textIcon: 'text-amber-700',
    fallbackQuestion: 'Analyze the structure and key sections of our most recent contract'
  },
  {
    icon: Database,
    title: 'Data Extraction',
    colorFrom: 'from-orange-50',
    colorTo: 'to-orange-100',
    border: 'border-orange-200',
    bgIcon: 'bg-orange-200',
    textIcon: 'text-orange-700',
    fallbackQuestion: 'Extract all tables from our financial reports and summarize each one'
  },
  {
    icon: BarChart4,
    title: 'Comparative Analysis',
    colorFrom: 'from-rose-50',
    colorTo: 'to-rose-100',
    border: 'border-rose-200',
    bgIcon: 'bg-rose-200',
    textIcon: 'text-rose-700',
    fallbackQuestion: 'Compare our latest product specifications against industry standards'
  }
];

interface DeepRagTopicCardsProps {
  chatRef: React.RefObject<ImprovedChatHandle>;
}

export default function DeepRagTopicCards({ chatRef }: DeepRagTopicCardsProps) {
  const { sampleQuestions, loading } = useSampleQuestions();
  console.log('DeepRAG sample questions:', sampleQuestions);
  
  const handleSubmitQuestion = (question: string) => {
    if (chatRef.current) {
      chatRef.current.submitMessage(question);
    }
  };

  // Use only the first 3 sample questions or fallbacks if we don't have enough
  const getQuestionForCard = (index: number) => {
    if (!loading && sampleQuestions.length > index) {
      return sampleQuestions[index].question;
    }
    return cardThemes[index].fallbackQuestion;
  };

  return (
    <>
      {cardThemes.map((theme, index) => {
        const Icon = theme.icon;
        const question = getQuestionForCard(index);
        
        return (
          <motion.div
            key={index}
            className={`bg-gradient-to-br ${theme.colorFrom} ${theme.colorTo} p-6 rounded-lg border ${theme.border} shadow-sm hover:shadow-md transition-all cursor-pointer group`}
            variants={slideUp}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            onClick={() => handleSubmitQuestion(question)}
          >
            <div className="flex items-start">
              <div className="flex-1 pr-2">
                <h3 className="text-lg font-medium text-gray-800 mb-3">{question}</h3>
                <div className="mt-auto pt-2 flex justify-end">
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                </div>
              </div>
              <span className={`p-2 ${theme.bgIcon} ${theme.textIcon} rounded-lg flex-shrink-0`}>
                <Icon size={20} />
              </span>
            </div>
          </motion.div>
        );
      })}
    </>
  );
} 