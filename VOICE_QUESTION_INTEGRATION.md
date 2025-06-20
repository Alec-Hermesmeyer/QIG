# Voice Question Integration Guide

## Overview

The voice control system now supports asking questions directly from any page, which will automatically navigate to fast-rag and submit the question.

## How It Works

1. **User clicks microphone** on any page
2. **User asks a question** like "What is machine learning?" or "How do neural networks work?"
3. **System detects it's a question** (not a navigation command)
4. **Automatically navigates** to `/fast-rag` page
5. **Question is auto-submitted** to the RAG system
6. **User gets their answer** immediately

## Question Detection

The system detects questions using:

- **Question words**: what, how, why, when, where, who, which, can, could, etc.
- **Question marks**: Any sentence ending with "?"
- **Question patterns**: "how to", "what is", "tell me", "explain", etc.

## Integration in RAG Pages

### Fast-RAG (Already Integrated)

```typescript
import { useVoiceQuestion } from "@/hooks/useVoiceQuestion";

export default function FastRAGPage() {
  const { question: voiceQuestion, isVoiceQuestion, clearVoiceQuestion } = useVoiceQuestion();
  
  // Auto-submit voice questions
  useEffect(() => {
    if (voiceQuestion && isVoiceQuestion && chatRef.current) {
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.submitMessage(voiceQuestion);
          clearVoiceQuestion();
        }
      }, 500);
    }
  }, [voiceQuestion, isVoiceQuestion, clearVoiceQuestion]);
  
  return (
    <div>
      {/* Voice indicator in header */}
      {isVoiceQuestion && (
        <Badge className="bg-green-50 border-green-200 text-green-700 animate-pulse">
          🎤 Voice Question
        </Badge>
      )}
      {/* Rest of component */}
    </div>
  );
}
```

### Deep-RAG Integration

```typescript
import { useVoiceQuestion } from "@/hooks/useVoiceQuestion";

export default function DeepRAGPage() {
  const { question: voiceQuestion, isVoiceQuestion, clearVoiceQuestion } = useVoiceQuestion();
  
  // Auto-submit to deep-rag system
  useEffect(() => {
    if (voiceQuestion && isVoiceQuestion) {
      // Submit to deep-rag specific handler
      handleDeepRagQuestion(voiceQuestion);
      clearVoiceQuestion();
    }
  }, [voiceQuestion, isVoiceQuestion, clearVoiceQuestion]);
  
  const handleDeepRagQuestion = (question: string) => {
    // Your deep-rag specific submission logic
    setInputValue(question);
    submitQuery();
  };
}
```

## Updating Navigation Target

To change which page questions navigate to, modify `StandaloneVoiceControls.tsx`:

```typescript
const handleRagQuestion = (question: string) => {
  // Store question
  sessionStorage.setItem('voiceQuestion', question);
  sessionStorage.setItem('voiceQuestionTimestamp', Date.now().toString());
  
  // Change this line to navigate to different page
  window.location.href = '/deep-rag'; // or '/dual-rag', etc.
};
```

## Voice Commands vs Questions

### Navigation Commands:
- "Go to fast rag"
- "Go to settings" 
- "Go to admin services"

### Questions (Auto-navigate to RAG):
- "What is artificial intelligence?"
- "How do neural networks work?"
- "Explain quantum computing"
- "Tell me about machine learning"

## Technical Details

- **Session Storage**: Questions stored temporarily (30 second timeout)
- **Auto-cleanup**: Prevents stale questions from being reused
- **Visual Feedback**: Green badge shows when voice question is active
- **Memory Management**: Automatic cleanup before navigation

## Testing

1. **Click microphone** on any page
2. **Ask a question**: "What is the capital of France?"
3. **Verify navigation** to fast-rag page
4. **Verify auto-submission** of the question
5. **Check visual indicator** appears in header 