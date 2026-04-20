# Quick Reference - Real-Time Translation

## 🚀 Quick Start (30 seconds)

```bash
# 1. Start your app
npm run dev

# 2. Open http://localhost:3001
# 3. Create/join a meeting
# 4. Click "🌐 Translate" button
# 5. Select language and translate!
```

## 📋 Useful Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run linting
npm run lint

# Test translation API (requires auth)
# Use in browser Console:
fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello',
    targetLanguage: 'es'
  })
}).then(r => r.json()).then(console.log)
```

## 🔑 Configuration Shortcuts

### Use Free MyMemory (Default)
```env
# .env.local
NEXT_PUBLIC_TRANSLATION_SERVICE=mymemory
```

### Switch to Azure
```env
# .env.local
AZURE_TRANSLATOR_KEY=your_key
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_TRANSLATOR_REGION=eastus
NEXT_PUBLIC_TRANSLATION_SERVICE=azure
```

## 📂 File Locations

| File | Purpose |
|------|---------|
| `.env.local` | Configuration |
| `components/TranslationPanel.tsx` | UI Component |
| `app/api/translate/route.ts` | Backend API |
| `components/MeetingRoom.tsx` | Integration |
| `REAL_TIME_TRANSLATION_SETUP.md` | Setup guide |
| `REAL_TIME_TRANSLATION_GUIDE.md` | Full docs |
| `ENV_CONFIGURATION_GUIDE.md` | Config reference |

## 🎯 Translation Flow

```
User clicks "🌐 Translate"
         ↓
Translation Panel Opens
         ↓
User selects language
         ↓
User clicks translate button
         ↓
Request sent to /api/translate
         ↓
Backend tries Azure first
         ↓
If fails → Falls back to MyMemory
         ↓
Response returned to frontend
         ↓
Translation displayed in panel
         ↓
User can copy to clipboard
```

## 🌍 Supported Languages

```
en-English         es-Spanish         fr-French
de-German          it-Italian         pt-Portuguese
ru-Russian         ja-Japanese        zh-Chinese
ko-Korean          ar-Arabic          hi-Hindi
nl-Dutch           pl-Polish          tr-Turkish
vi-Vietnamese
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Button not visible | Reload page / Check if in meeting |
| No translation | Restart server after changing `.env.local` |
| Slow translation | Setup Azure for faster speed |
| Wrong translations | Try providing more context |
| API errors | Check browser console (F12) |

## 🔐 Security Checklist

- ✅ API keys in `.env.local` (server-side only)
- ✅ Never expose keys in frontend code
- ✅ Clerk authentication required
- ✅ All requests validated
- ✅ CORS handled via Next.js backend

## 📊 Performance Tips

```
For Best Speed:
1. Setup Azure (professional tier)
2. Use same region as server
3. Enable caching
4. Batch translate when possible

For Best Cost:
1. Use MyMemory (free)
2. Disable auto-detect language
3. Disable auto-translate
4. Translate only when needed
```

## 🔄 API Endpoints

### Translate Text
```
POST /api/translate
{
  "text": "string",
  "targetLanguage": "string",
  "detectSource": boolean (optional)
}
```

### Get Supported Languages
```
GET /api/translate
```

## 🎛️ Configuration Options

| Option | Values | Effect |
|--------|--------|--------|
| `NEXT_PUBLIC_TRANSLATION_SERVICE` | `azure`, `mymemory` | Primary service |
| `NEXT_PUBLIC_AUTO_DETECT_LANGUAGE` | `enabled`, `disabled` | Auto language detection |
| `AZURE_TRANSLATOR_KEY` | string | Azure API key |
| `AZURE_TRANSLATOR_REGION` | string | Azure region code |

## 💻 Code Examples

### Translate a Single Message
```typescript
const response = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Good morning',
    targetLanguage: 'fr'
  }),
});

const { translated } = await response.json();
console.log(translated); // "Bonjour"
```

### Detect Language
```typescript
const response = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Guten Tag',
    targetLanguage: 'en',
    detectSource: true
  }),
});

const { detectedLanguage } = await response.json();
console.log(detectedLanguage); // "de"
```

### Get Languages
```typescript
const response = await fetch('/api/translate');
const { languages } = await response.json();
// Returns: [{ code: 'en', name: 'English' }, ...]
```

## 📱 Features Matrix

| Feature | MyMemory | Azure |
|---------|----------|-------|
| Real-time translation | ✅ | ✅ |
| 16 languages | ✅ | ✅ |
| Language detection | ❌ | ✅ |
| Auto-translate | ✅ | ✅ |
| Copy to clipboard | ✅ | ✅ |
| Error handling | ✅ | ✅ |
| Setup required | ❌ | ✅ |

## 🎓 Learning Resources

### Official Docs
- [Azure Translator Docs](https://learn.microsoft.com/en-us/azure/cognitive-services/translator/)
- [MyMemory API](https://mymemory.translated.net/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

### Project Docs
- `REAL_TIME_TRANSLATION_SETUP.md` - Setup guide
- `REAL_TIME_TRANSLATION_GUIDE.md` - Full documentation
- `ENV_CONFIGURATION_GUIDE.md` - Configuration reference

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Start using MyMemory | Immediate ⚡ |
| Setup Azure | 15 minutes |
| Full integration | 30 minutes |
| Production deployment | 1 hour |

## ✨ Pro Tips

1. **Cache hits**: Translating same text multiple times uses cache
2. **Batch efficiency**: Translate all at once faster than one-by-one
3. **Error recovery**: System automatically tries fallback service
4. **Performance**: Azure is 3-5x faster than MyMemory
5. **Monitoring**: Check browser Network tab to monitor requests

## 🆘 Emergency Debug

```javascript
// In browser console (F12):

// Check if API is responding
fetch('/api/translate').then(r => r.json()).then(console.log)

// Check environment
console.log('Service:', window.ENV?.NEXT_PUBLIC_TRANSLATION_SERVICE)

// Enable debug mode
localStorage.setItem('translation_debug', 'true')

// Clear cache
localStorage.clear()
```

## 📞 Contact & Support

- **Azure Support**: https://azure.microsoft.com/en-us/support/
- **MyMemory Support**: https://mymemory.translated.net/
- **Project Docs**: See files in project root

---

## 📝 Changelog

**v1.0.0** (January 2026)
- Initial release
- Azure integration
- MyMemory fallback
- 16 languages
- Auto-translate
- Full documentation

---

**Last Updated**: January 2026  
**Status**: Production Ready ✅  
**Support**: See documentation files
