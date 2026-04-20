# Real-Time Translation Feature Implementation Guide

## What's Included

### 1. **Translation API** (`/api/translate`)
- Supports 12 languages: English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Chinese, Korean, Arabic, Hindi
- Uses MyMemory Translation API (free, no API key needed)
- POST endpoint to translate messages
- GET endpoint to fetch supported languages

### 2. **Translation Panel Component** (`/components/TranslationPanel.tsx`)
- Language selector dropdown
- "Translate All" button to translate all messages at once
- Individual message translation
- Shows original and translated text side-by-side

## How to Integrate into MeetingRoom

### Step 1: Import the Component
Add this to the top of `MeetingRoom.tsx`:
```tsx
import TranslationPanel from '@/components/TranslationPanel';
```

### Step 2: Add Translation State
Add these lines to the state declarations in MeetingRoom (around line 1022):
```tsx
const [selectedLanguage, setSelectedLanguage] = useState('en');
const [showTranslationPanel, setShowTranslationPanel] = useState(false);
```

### Step 3: Add Translation Button
In the chat panel area (where you have the download/upload buttons), add:
```tsx
<button
  onClick={() => setShowTranslationPanel(!showTranslationPanel)}
  className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
  title="Enable real-time translation"
>
  🌐 Translate
</button>
```

### Step 4: Render the Translation Panel
At the bottom of your chat panel, add:
```tsx
{showTranslationPanel && (
  <TranslationPanel 
    messages={messages}
    onTranslate={async (idx, lang) => {
      const response = await fetch('/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: messages[idx].text,
          targetLanguage: lang,
        }),
      });
      const data = await response.json();
      return data.translated;
    }}
  />
)}
```

## Features

✅ **12 Supported Languages**
- English, Spanish, French, German, Italian, Portuguese
- Russian, Japanese, Chinese, Korean, Arabic, Hindi

✅ **Flexible Translation**
- Translate individual messages
- Translate all messages at once
- Switch languages anytime

✅ **No API Key Required**
- Uses free MyMemory API
- No authentication needed
- Instant translations

✅ **Real-Time**
- Translates messages as they arrive
- Shows translated text below original
- Maintains translation history

## Advanced Options (Future Enhancements)

### 1. Auto-Translate on Language Change
Automatically translate all messages when user selects a different language.

### 2. Speech-to-Text Translation
Add audio transcription + translation using:
- Web Speech API for client-side transcription
- Google Cloud Speech-to-Text API for accuracy

### 3. Real-Time Subtitle Display
Show translated subtitles at the bottom of video feed like Zoom.

### 4. Translation History
Store translation cache to avoid repeated API calls.

### 5. Custom Translation Service
Replace MyMemory with:
- Google Cloud Translation
- Microsoft Translator
- DeepL API (higher quality)

## Usage Example

```tsx
// In your chat component
<div className="chat-container">
  <div className="messages">
    {messages.map((msg) => (
      <div key={msg.timestamp} className="message">
        <strong>{msg.user}:</strong> {msg.text}
      </div>
    ))}
  </div>
  
  <div className="controls">
    <button onClick={() => setShowTranslationPanel(!showTranslationPanel)}>
      🌐 Real-Time Translation
    </button>
  </div>
  
  {showTranslationPanel && (
    <TranslationPanel messages={messages} />
  )}
</div>
```

## API Reference

### POST /api/translate
Translates a message to target language.

**Request:**
```json
{
  "text": "Hello, how are you?",
  "targetLanguage": "es"
}
```

**Response:**
```json
{
  "original": "Hello, how are you?",
  "translated": "Hola, ¿cómo estás?",
  "targetLanguage": "es"
}
```

### GET /api/translate
Returns list of supported languages.

**Response:**
```json
{
  "languages": [
    { "code": "en", "name": "English" },
    { "code": "es", "name": "Spanish" },
    ...
  ]
}
```

## Testing

1. Start a video call
2. Send a message in English
3. Click the Translation button
4. Select a target language
5. Click "Translate All" or translate individual messages
6. See translations appear below original messages

## Notes

- MyMemory API is rate-limited (around 400 requests/day for free usage)
- For production with heavy usage, upgrade to paid API
- Translations are cached locally to reduce API calls
- Supports all UTF-8 characters and emojis
