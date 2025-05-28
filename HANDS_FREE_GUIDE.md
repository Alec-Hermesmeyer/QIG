# Hands-Free Chat Mode Guide

The chat component now supports hands-free interaction using voice commands! This allows you to interact with the assistant without touching any buttons.

## Features

### 1. Manual Controls (Original)
- **Microphone button** (🎤): Start/stop speech-to-text manually
- **Send button**: Submit your typed or spoken message
- These buttons remain fully functional alongside the hands-free mode

### 2. Hands-Free Mode (New)
- **Hands-free toggle button** (🤖/🎤): Enable/disable hands-free mode
- **Continuous listening**: Automatically listens for wake words
- **Automatic message submission**: Send messages using action words

## How to Use Hands-Free Mode

### Step 1: Enable Hands-Free Mode
1. Click the hands-free toggle button (🎤 → 🤖)
2. Grant microphone permission when prompted
3. You'll see a purple indicator showing "Hands-free mode active"

### Step 2: Use Wake Words
Say one of these wake words to start recording your message:
- **"Hey Assistant"**
- **"Hello Chat"**
- **"Hey Chat"**
- **"Assistant"**

When detected, you'll see "Wake word detected! Say your message..."

### Step 3: Say Your Message
After the wake word is detected, speak your message naturally. For example:
- "Hey Assistant, what is the weather like today?"
- "Hello Chat, explain quantum computing"

### Step 4: Auto-Submit or Use Action Words
Your message will automatically send after you stop speaking for 2 seconds. Alternatively, you can use action words for immediate sending:
- **"Send"**
- **"Submit"**
- **"Go"**
- **"Execute"**

For example: 
- **Auto-submit**: "Hey Assistant, what is machine learning?" → *pause 2 seconds* → automatically sends
- **Action word**: "Hey Assistant, what is machine learning? Send" → immediately sends

### Alternative: Manual Send
If you prefer more control, you can still:
- Click the Send button manually
- Press Enter in the text field  
- Use the microphone button to stop recording and then send

## Example Workflow

1. **Auto-submit (recommended)**: "Hey Assistant, tell me about artificial intelligence." → *pause 2 seconds* → automatically sends

2. **Quick action word**: "Hello Chat, explain quantum computing. Send" → immediately sends

3. **Manual control**: "Hey Chat, what is the weather?" → manually click Send button

## Visual Indicators

- **Purple indicator**: Hands-free mode is listening for wake words
- **Blue indicator**: Wake word detected, recording your message
- **Green indicator**: Currently recording (manual or hands-free)
- **Help text**: Shows available wake words and action words

## Requirements

- **Microphone access**: Required for speech recognition
- **Deepgram API key**: Must be configured in environment variables
- **Modern browser**: Supports Web Audio API and WebSocket

## Tips for Best Results

1. **Speak clearly**: Ensure good audio quality for accurate recognition
2. **Use natural speech**: No need to speak robotically
3. **Pause between phrases**: Give time between wake word and message
4. **Quiet environment**: Reduce background noise for better detection
5. **Practice the flow**: Try a few times to get comfortable with the timing

## Troubleshooting

- **"Microphone access denied"**: Enable microphone permissions in browser settings
- **"Deepgram API key missing"**: Check environment configuration
- **Wake word not detected**: Speak more clearly or try a different wake word
- **Action word not working**: Make sure to speak the action word clearly at the end

## Fallback Options

If hands-free mode encounters issues:
1. Turn off hands-free mode and use manual controls
2. Use the traditional microphone button for speech-to-text
3. Type your message manually

The hands-free mode is designed to enhance, not replace, the existing functionality. All original features remain available! 