'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Copy, CheckCircle, AlertCircle, Zap, X } from 'lucide-react';

interface TranslationPanelProps {
  messages: Array<{ user: string; text: string; timestamp: string }>;
  onClose?: () => void;
}

export default function TranslationPanel({ messages, onClose }: TranslationPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [languageQuery, setLanguageQuery] = useState('');
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const languages = [
    { code: 'all', name: 'All languages' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ur', name: 'Urdu' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'sv', name: 'Swedish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'da', name: 'Danish' },
    { code: 'he', name: 'Hebrew' },
    { code: 'el', name: 'Greek' },
    { code: 'cs', name: 'Czech' },
    { code: 'ro', name: 'Romanian' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    { code: 'sw', name: 'Swahili' },
    { code: 'fil', name: 'Filipino (Tagalog)' },
    { code: 'ne', name: 'Nepali' },
    { code: 'fa', name: 'Persian (Farsi)' },
    { code: 'ta', name: 'Tamil' },
  ];

  // Auto-translate new messages when auto-translate is enabled
  useEffect(() => {
    if (autoTranslate && messages.length > lastMessageCount) {
      const newMessageIndex = messages.length - 1;
      const translationKey = `${newMessageIndex}-${selectedLanguage}`;
      
      if (!translatedMessages[translationKey] && messages[newMessageIndex]) {
        const message = messages[newMessageIndex];
        if (message && selectedLanguage !== 'all') {
          (async () => {
            try {
              setIsTranslating(true);
              const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message.text, targetLanguage: selectedLanguage }),
              });
              if (!response.ok) return;
              const { translated } = await response.json();
              setTranslatedMessages(prev => ({ ...prev, [translationKey]: translated }));
            } catch (error) {
              console.error('Auto-translate failed:', error);
            } finally {
              setIsTranslating(false);
            }
          })();
        }
      }
      setLastMessageCount(messages.length);
    }
  }, [autoTranslate, messages, selectedLanguage, translatedMessages, lastMessageCount]);

  const translateMessage = async (messageIndex: number) => {
    try {
      setIsTranslating(true);
      setTranslationError(null);
      const message = messages[messageIndex];
      // If "all" is selected, request translations for every language
      if (selectedLanguage === 'all') {
        for (const lang of languages.filter(l => l.code !== 'all')) {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message.text, targetLanguage: lang.code }),
          });

          if (!response.ok) continue;
          const { translated } = await response.json();
          const translationKey = `${messageIndex}-${lang.code}`;
          setTranslatedMessages(prev => ({ ...prev, [translationKey]: translated }));
        }
      } else {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message.text, targetLanguage: selectedLanguage }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Translation failed');
        }

        const { translated } = await response.json();
        const translationKey = `${messageIndex}-${selectedLanguage}`;
        setTranslatedMessages(prev => ({ ...prev, [translationKey]: translated }));
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const translateAll = async () => {
    try {
      setIsTranslating(true);
      setTranslationError(null);
      // If 'all' selected, translate every message into every language
      if (selectedLanguage === 'all') {
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          for (const lang of languages.filter(l => l.code !== 'all')) {
            const translationKey = `${i}-${lang.code}`;
            if (translatedMessages[translationKey]) continue;
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: message.text, targetLanguage: lang.code }),
            });
            if (!response.ok) continue;
            const { translated } = await response.json();
            setTranslatedMessages(prev => ({ ...prev, [translationKey]: translated }));
          }
        }
      } else {
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          const translationKey = `${i}-${selectedLanguage}`;
          if (translatedMessages[translationKey]) continue;
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message.text, targetLanguage: selectedLanguage }),
          });
          if (response.ok) {
            const { translated } = await response.json();
            setTranslatedMessages(prev => ({ ...prev, [translationKey]: translated }));
          }
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            <h3 className="font-bold text-white text-sm">Real-Time Translation</h3>
          </div>
          <div className="flex items-center gap-2">
            {translationError && (
              <div className="flex items-center gap-1 text-red-400 text-xs">
                <AlertCircle size={14} />
                {translationError}
              </div>
            )}
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              setTranslatedMessages({});
            }}
            className="flex-1 min-w-[120px] p-2 bg-gray-700 text-white rounded text-sm border border-gray-600 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-gray-800">
                {lang.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={translateAll}
            disabled={isTranslating || messages.length === 0}
            title="Translate all messages"
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 transition-colors font-medium"
          >
            {isTranslating ? 'Translating...' : 'Translate All'}
          </button>
          
          <button
            onClick={() => setAutoTranslate(!autoTranslate)}
            title="Auto-translate new messages"
            className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
              autoTranslate 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Zap size={14} />
            {autoTranslate ? 'Auto ON' : 'Auto OFF'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No messages to translate yet
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {messages.map((msg, idx) => {
              const translationKey = `${idx}-${selectedLanguage}`;
              const translated = translatedMessages[translationKey];
              const isCopied = copiedId === translationKey;
              
              return (
                <div key={idx} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-650 transition-colors">
                  {/* User & Timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-300 text-sm">{msg.user}</span>
                    <span className="text-gray-400 text-xs">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* Original Text */}
                  <div className="text-gray-200 text-sm mb-2 break-words">{msg.text}</div>
                  
                  {/* Translated Text or Action */}
                  {selectedLanguage === 'all' ? (
                    <div className="space-y-2">
                      <div className="mb-2">
                        <input
                          value={languageQuery}
                          onChange={(e) => setLanguageQuery(e.target.value)}
                          placeholder="Search languages..."
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {languages
                        .filter(l => l.code !== 'all' && (!languageQuery || l.name.toLowerCase().includes(languageQuery.toLowerCase()) || l.code.toLowerCase().includes(languageQuery.toLowerCase())))
                        .map(l => {
                          const key = `${idx}-${l.code}`;
                          const t = translatedMessages[key];
                          return (
                            <div key={l.code} className="bg-gray-800 rounded p-2 flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="text-xs text-gray-400 mb-1">{l.name}</div>
                                <div className="text-green-300 text-sm italic break-words">{t || <em className="text-gray-400">No translation yet</em>}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => t && copyToClipboard(t, key)}
                                  title="Copy translation"
                                  className="text-gray-400 hover:text-green-400 transition-colors mt-0.5"
                                >
                                  {copiedId === key ? <CheckCircle size={16} /> : <Copy size={16} />}
                                </button>
                                {!t && (
                                  <button
                                    onClick={() => translateMessage(idx)}
                                    disabled={isTranslating}
                                    className="text-blue-400 hover:text-blue-300 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    Translate {l.name}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    translated ? (
                      <div className="bg-gray-800 rounded p-2 flex items-start justify-between gap-2">
                        <div className="text-green-300 text-sm italic flex-1 break-words">{translated}</div>
                        <button
                          onClick={() => copyToClipboard(translated, translationKey)}
                          title="Copy translation"
                          className="flex-shrink-0 text-gray-400 hover:text-green-400 transition-colors mt-0.5"
                        >
                          {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => translateMessage(idx)}
                        disabled={isTranslating}
                        className="text-blue-400 hover:text-blue-300 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Translate to {languages.find(l => l.code === selectedLanguage)?.name}
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
