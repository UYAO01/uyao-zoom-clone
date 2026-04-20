import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ur', name: 'Urdu' },
  { code: 'fil', name: 'Filipino (Tagalog)' },
  { code: 'ne', name: 'Nepali' },
  { code: 'fa', name: 'Persian (Farsi)' },
  { code: 'ta', name: 'Tamil' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'he', name: 'Hebrew' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
];

// Language code mapping for Azure Translator
const AZURE_LANGUAGE_MAP: Record<string, string> = {
  'en': 'en',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
  'ja': 'ja',
  'zh': 'zh-Hans', // Simplified Chinese for Azure
  'ko': 'ko',
  'ar': 'ar',
  'hi': 'hi',
  'nl': 'nl',
  'pl': 'pl',
  'tr': 'tr',
  'vi': 'vi',
  'sw': 'sw',
  'bn': 'bn',
  'ur': 'ur',
  'fil': 'fil',
  'ne': 'ne',
  'fa': 'fa',
  'ta': 'ta',
  'id': 'id',
  'ms': 'ms',
  'zh-TW': 'zh-Hant', // Traditional Chinese for Azure
  'pt-BR': 'pt-BR',
  'he': 'he',
  'el': 'el',
  'cs': 'cs',
  'ro': 'ro',
  'hu': 'hu',
};

// Mapping adjustments for MyMemory (or other fallbacks) where codes differ
const MYMEMORY_LANGUAGE_MAP: Record<string, string> = {
  'fil': 'tl', // MyMemory uses 'tl' for Tagalog
  'pt-BR': 'pt',
  'zh-TW': 'zh-TW',
};

// Normalize language codes for MyMemory: map known differences and reduce region variants
function normalizeForMyMemory(code?: string) {
  if (!code) return code;
  const mapped = MYMEMORY_LANGUAGE_MAP[code] || code;
  // Preserve specific exceptions
  if (mapped.toLowerCase() === 'zh-tw') return 'zh-TW';
  if (mapped.toLowerCase() === 'pt-br') return 'pt-BR';
  // Reduce region variants like en-US -> en, pt-BR handled above
  if (mapped.includes('-')) return mapped.split('-')[0];
  return mapped;
}

/**
 * Translate using Microsoft Azure Translator API
 */
async function translateWithAzure(text: string, targetLanguage: string): Promise<string> {
  const apiKey = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const region = process.env.AZURE_TRANSLATOR_REGION || 'eastus';

  if (!apiKey) {
    throw new Error('Azure Translator API key not configured. Using MyMemory instead.');
  }

  const azureLanguage = AZURE_LANGUAGE_MAP[targetLanguage] || targetLanguage;

  const url = `${endpoint}/translate?api-version=3.0&to=${azureLanguage}`;

  try {
    // Azure Translator expects a JSON array body like [{ "Text": "..." }]
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      const errorMsg = `Azure Translator API error: ${response.status} ${response.statusText}`;
      console.error(errorMsg, bodyText);
      throw new Error(errorMsg);
    }

    const result = await response.json();

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Invalid response from Azure Translator');
    }

    return result[0]?.translations?.[0]?.text || text;
  } catch (error) {
    console.error('Azure translation failed:', error);
    throw error;
  }
}

/**
 * Translate using MyMemory Translation API (free fallback)
 */
async function translateWithMyMemory(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
  const detected = sourceLanguage || (await detectLanguage(text));
  const mappedTarget = normalizeForMyMemory(targetLanguage);
  const mappedSource = normalizeForMyMemory(detected);

  // MyMemory requires two distinct language codes; if they're identical after normalization, skip and return original text
  if (mappedSource && mappedTarget && mappedSource.toLowerCase() === mappedTarget.toLowerCase()) {
    console.warn('MyMemory: skipping translation because source and target are identical', mappedSource);
    return text;
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(mappedSource || '')}|${encodeURIComponent(mappedTarget || '')}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.responseStatus !== 200) {
    const details = data.responseDetails || JSON.stringify(data);
    throw new Error(`MyMemory translation failed: ${data.responseStatus} ${details}`);
  }

  return data.responseData?.translatedText || '';
}

/**
 * Translate using Google Cloud Translation API
 */
async function translateWithGoogle(text: string, targetLanguage: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    throw new Error('Google Translate API key not configured.');
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target: targetLanguage }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Google Translation failed');
  }

  return data.data.translations[0].translatedText;
}

/**
 * Detect language using basic heuristics or Azure
 */
async function detectLanguage(text: string): Promise<string> {
  const apiKey = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const region = process.env.AZURE_TRANSLATOR_REGION || 'eastus';

  if (!apiKey) {
    return 'en'; // Default to English if no API key
  }

  try {
    const url = `${endpoint}/detect?api-version=3.0`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    });

    if (response.ok) {
      const result = await response.json();
      // Azure returns an array with detection info
      // e.g. [{ language: 'en', score: 1.0, isTranslationSupported: true }]
      if (Array.isArray(result) && result[0]?.language) return result[0].language;
      return 'en';
    }
  } catch (error) {
    console.error('Language detection error:', error);
  }

  return 'en';
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing text or targetLanguage' },
        { status: 400 }
      );
    }

    if (text.length === 0) {
      return NextResponse.json(
        { original: text, translated: text, targetLanguage, detectedLanguage: 'en' }
      );
    }

    const translationService = process.env.NEXT_PUBLIC_TRANSLATION_SERVICE || 'mymemory';
    let translatedText: string;
    let detectedLanguage: string | undefined;

    try {
      // Always attempt to detect source language where possible to avoid MyMemory errors
      detectedLanguage = await detectLanguage(text);

      // Check if Azure is properly configured before attempting
      const hasAzureConfig = process.env.AZURE_TRANSLATOR_KEY && process.env.AZURE_TRANSLATOR_ENDPOINT;
      const hasGoogleConfig = !!process.env.GOOGLE_TRANSLATE_API_KEY;
      
      if ((translationService === 'google' || hasGoogleConfig) && hasGoogleConfig) {
        translatedText = await translateWithGoogle(text, targetLanguage);
      } else if (translationService === 'azure' && hasAzureConfig) {
        // Try Azure first only if properly configured
        translatedText = await translateWithAzure(text, targetLanguage);
        
        // If caller explicitly requested detection, keep detectedLanguage (already set)
      } else {
        // Use MyMemory for free translation, passing detected source to avoid identical langpair
        translatedText = await translateWithMyMemory(text, targetLanguage, detectedLanguage);
      }
    } catch (primaryError) {
      console.warn('Primary translation service failed, falling back to MyMemory:', primaryError);

      // Fallback to MyMemory; ensure we have a detected language
      detectedLanguage = detectedLanguage || (await detectLanguage(text));
      translatedText = await translateWithMyMemory(text, targetLanguage, detectedLanguage);
    }

    return NextResponse.json({
      original: text,
      translated: translatedText,
      targetLanguage,
      detectedLanguage,
      service: translationService,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Translation failed',
        suggestion: 'Please check your API keys and configuration',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    languages: SUPPORTED_LANGUAGES,
    service: process.env.NEXT_PUBLIC_TRANSLATION_SERVICE || 'mymemory',
  });
}
