// components/FeedbackForm.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { ThemeStyles } from '@/types';

interface FeedbackFormProps {
    themeStyles: ThemeStyles;
    feedbackRating: number | null;
    feedbackComment: string;
    setFeedbackRating: (rating: number | null) => void;
    setFeedbackComment: (comment: string) => void;
    handleSubmitFeedback: () => void;
    onClose: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
    themeStyles,
    feedbackRating,
    feedbackComment,
    setFeedbackRating,
    setFeedbackComment,
    handleSubmitFeedback,
    onClose
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 p-4 rounded-lg border"
            style={{ 
                backgroundColor: `${themeStyles.primaryColor}10`, 
                borderColor: `${themeStyles.primaryColor}30`
            }}
        >
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Rate this answer</h3>
                <button onClick={onClose}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div className="mb-3 flex justify-center space-x-3">
                {[1, 2, 3, 4, 5].map(rating => (
                    <button
                        key={rating}
                        onClick={() => setFeedbackRating(rating)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                            feedbackRating === rating ? 'border-2' : 'border'
                        }`}
                        style={{
                            backgroundColor: feedbackRating === rating ? `${themeStyles.primaryColor}20` : 'transparent',
                            borderColor: feedbackRating === rating ? themeStyles.primaryColor : themeStyles.borderColor,
                            color: feedbackRating === rating ? themeStyles.primaryColor : themeStyles.textColor
                        }}
                    >
                        {rating}
                    </button>
                ))}
            </div>
            
            <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Comments (optional)</label>
                <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={3}
                    className="w-full p-2 rounded border"
                    style={{
                        backgroundColor: themeStyles.cardBackgroundColor,
                        borderColor: themeStyles.borderColor,
                        color: themeStyles.textColor
                    }}
                    placeholder="What did you like or dislike about this answer?"
                />
            </div>
            
            <div className="flex justify-end">
                <button
                    onClick={handleSubmitFeedback}
                    disabled={feedbackRating === null}
                    className="px-4 py-2 rounded text-white text-sm font-medium"
                    style={{
                        backgroundColor: feedbackRating !== null ? themeStyles.primaryColor : `${themeStyles.primaryColor}50`,
                        cursor: feedbackRating !== null ? 'pointer' : 'not-allowed'
                    }}
                >
                    Submit Feedback
                </button>
            </div>
        </motion.div>
    );
};

export default FeedbackForm;