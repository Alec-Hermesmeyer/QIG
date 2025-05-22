'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, MessagesSquare, ArrowRight } from 'lucide-react';
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
    icon: FileText,
    title: 'Contract Analysis',
    colorFrom: 'from-blue-50',
    colorTo: 'to-blue-100',
    border: 'border-blue-200',
    bgIcon: 'bg-blue-200',
    textIcon: 'text-blue-700',
    fallbackQuestion: 'What are the key points in our latest contracts?'
  },
  {
    icon: Shield,
    title: 'Policy Intelligence',
    colorFrom: 'from-emerald-50',
    colorTo: 'to-emerald-100',
    border: 'border-emerald-200',
    bgIcon: 'bg-emerald-200',
    textIcon: 'text-emerald-700',
    fallbackQuestion: 'Summarize our company policies on data security'
  },
  {
    icon: MessagesSquare,
    title: 'Document Comparison',
    colorFrom: 'from-violet-50',
    colorTo: 'to-violet-100',
    border: 'border-violet-200',
    bgIcon: 'bg-violet-200',
    textIcon: 'text-violet-700',
    fallbackQuestion: 'Find inconsistencies between our Terms of Service and Privacy Policy'
  }
];

interface FastRagTopicCardsProps {
  chatRef: React.RefObject<ImprovedChatHandle>;
}

export default function FastRagTopicCards({ chatRef }: FastRagTopicCardsProps) {
  const { sampleQuestions, loading } = useSampleQuestions();
  console.log('FastRAG sample questions:', sampleQuestions);
  
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