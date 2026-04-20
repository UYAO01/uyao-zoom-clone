# Environment Configuration Examples

## Minimal Setup (Free MyMemory Only)

```env
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_STREAM_API_KEY=...
STREAM_SECRET_KEY=...

NEXT_PUBLIC_BASE_URL=http://localhost:3001

NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Translation Configuration (Using Free MyMemory - No Setup Required!)
NEXT_PUBLIC_TRANSLATION_SERVICE=mymemory
NEXT_PUBLIC_AUTO_DETECT_LANGUAGE=disabled
```

**Result**: Translation works immediately with free MyMemory service ✅

---

## Production Setup (Azure Translator)

```env
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_STREAM_API_KEY=...
STREAM_SECRET_KEY=...

NEXT_PUBLIC_BASE_URL=https://yourdomain.com

NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# ============================================
# Translation Configuration (Azure Translator)
# ============================================

# Get these from Azure Portal:
# 1. Go to https://portal.azure.com
# 2. Create Translator resource
# 3. Navigate to Keys and Endpoint
# 4. Copy the following values:

AZURE_TRANSLATOR_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_TRANSLATOR_REGION=eastus

# Select primary translation service
NEXT_PUBLIC_TRANSLATION_SERVICE=azure

# Enable language detection (requires Azure API key)
NEXT_PUBLIC_AUTO_DETECT_LANGUAGE=enabled
```

**Features**:
- ✅ Professional-grade translations
- ✅ Language detection
- ✅ 99.9% uptime guarantee
- ✅ Free tier: 2M characters/month

---

## Development Setup (Testing Both Services)

```env
# .env.local (for testing with MyMemory)
NEXT_PUBLIC_TRANSLATION_SERVICE=mymemory
NEXT_PUBLIC_AUTO_DETECT_LANGUAGE=disabled

# Later, to test Azure:
AZURE_TRANSLATOR_KEY=test_key_here
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_TRANSLATOR_REGION=eastus
NEXT_PUBLIC_TRANSLATION_SERVICE=azure
NEXT_PUBLIC_AUTO_DETECT_LANGUAGE=enabled
```

---

## Environment Variable Reference

### Required for Translation to Work

| Variable | Required | Default | Example |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_TRANSLATION_SERVICE` | No | `mymemory` | `azure` or `mymemory` |
| `NEXT_PUBLIC_AUTO_DETECT_LANGUAGE` | No | `disabled` | `enabled` or `disabled` |

### Required if Using Azure

| Variable | Required | Default | Example |
|----------|----------|---------|---------|
| `AZURE_TRANSLATOR_KEY` | Yes (for Azure) | - | `a1b2c3d4...` |
| `AZURE_TRANSLATOR_ENDPOINT` | No | `https://api.cognitive.microsofttranslator.com` | Azure portal value |
| `AZURE_TRANSLATOR_REGION` | No | `eastus` | `eastus`, `westus`, `southcentralus` |

---

## Step-by-Step Configuration

### For MyMemory (Recommended for Getting Started)

1. ✅ No setup required! It works out of the box
2. Your `.env.local` can have minimal translation config:
   ```env
   NEXT_PUBLIC_TRANSLATION_SERVICE=mymemory
   ```
3. Run `npm run dev`
4. Click "🌐 Translate" in any meeting
5. Done! Start translating

**Pros**: Free, no setup, unlimited  
**Cons**: Slower, less accurate than Azure

---

### For Azure Translator (Recommended for Production)

**Phase 1: Create Azure Account (5 min)**
1. Go to https://azure.microsoft.com/en-us/free/
2. Click "Start free"
3. Sign in with Microsoft account (or create new)
4. Verify with credit card
5. Accept terms

**Phase 2: Create Translator Resource (5 min)**
1. Go to https://portal.azure.com
2. Click "Create a resource"
3. Search "Translator"
4. Click "Create"
5. Choose resource group (create new: `translation-rg`)
6. Region: Choose closest (e.g., `East US` for USA)
7. Pricing: Select `Free F0` (free tier)
8. Click "Create"

**Phase 3: Get API Keys (2 min)**
1. Wait for "Deployment complete"
2. Click "Go to resource"
3. Left sidebar → "Keys and Endpoint"
4. Copy:
   - `Key 1` → `AZURE_TRANSLATOR_KEY`
   - `Endpoint` → `AZURE_TRANSLATOR_ENDPOINT`
   - `Region` → `AZURE_TRANSLATOR_REGION`

**Phase 4: Update .env.local (1 min)**
```env
AZURE_TRANSLATOR_KEY=paste_your_key_here
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_TRANSLATOR_REGION=eastus
NEXT_PUBLIC_TRANSLATION_SERVICE=azure
NEXT_PUBLIC_AUTO_DETECT_LANGUAGE=enabled
```

**Phase 5: Test (1 min)**
1. Restart dev server: `npm run dev`
2. Create a meeting
3. Click "🌐 Translate"
4. Translate a message
5. Should see professional translation ✅

---

## Switching Between Services

### Fallback Behavior (Automatic)

```
User sends message
        ↓
    Try Primary Service (Azure)
        ↓
   Success? ──→ Return translation
    ↓ No
    ↓
  Try Fallback (MyMemory)
    ↓
Success? ──→ Return translation
    ↓ No
    ↓
 Return Error
```

### Manual Service Selection

Edit `.env.local`:

```env
# To use Azure
NEXT_PUBLIC_TRANSLATION_SERVICE=azure

# To use MyMemory
NEXT_PUBLIC_TRANSLATION_SERVICE=mymemory
```

Then restart: `npm run dev`

---

## Common Configuration Mistakes

### ❌ Mistake 1: Key in Frontend Code
```typescript
// WRONG! Do not do this:
const API_KEY = "a1b2c3d4e5f6..."; // Exposed to client!
```

### ✅ Solution: Use .env.local
```env
# .env.local (server-side only)
AZURE_TRANSLATOR_KEY=a1b2c3d4e5f6...
```

---

### ❌ Mistake 2: Wrong Region Code
```env
# WRONG
AZURE_TRANSLATOR_REGION=East US  # Should not have space

# CORRECT
AZURE_TRANSLATOR_REGION=eastus  # lowercase, no space
```

---

### ❌ Mistake 3: Typo in Service Name
```env
# WRONG
NEXT_PUBLIC_TRANSLATION_SERVICE=azur  # Typo!

# CORRECT
NEXT_PUBLIC_TRANSLATION_SERVICE=azure
```

---

### ❌ Mistake 4: Forgetting to Restart Server
After updating `.env.local`:
```bash
# Stop current server (Ctrl+C)
# Restart it:
npm run dev
```

---

## Troubleshooting Configuration

### Test if Configuration Works

**Check 1: Environment Variables Loaded**
```bash
# Open browser console (F12 → Console)
# Run this in your terminal:
node -e "console.log(process.env.NEXT_PUBLIC_TRANSLATION_SERVICE)"

# Should output: azure or mymemory
```

**Check 2: API Endpoint Responds**
```bash
curl -X GET http://localhost:3001/api/translate

# Should return list of supported languages
```

**Check 3: Translation Works**
```bash
# This requires Clerk authentication, so test in-app instead

# In meeting → Click "🌐 Translate" → Select language → Translate a message
```

---

## Azure Regions (Choose Closest)

| Region | Endpoint | Best For |
|--------|----------|----------|
| East US | `https://eastus.api.cognitive.microsoft.com` | North America East |
| West US | `https://westus.api.cognitive.microsoft.com` | North America West |
| West Europe | `https://westeurope.api.cognitive.microsoft.com` | Europe |
| Southeast Asia | `https://southeastasia.api.cognitive.microsoft.com` | Asia |
| East Asia | `https://eastasia.api.cognitive.microsoft.com` | East Asia |
| Australia East | `https://australiaeast.api.cognitive.microsoft.com` | Australia |

**Note**: Region code is lowercase and without spaces:
- `East US` → `eastus`
- `West Europe` → `westeurope`
- `Southeast Asia` → `southeastasia`

---

## Monitoring & Debugging

### Enable Debug Logs

Add this to browser console to see translation requests:
```javascript
// In browser DevTools console
localStorage.setItem('translation_debug', 'true');

// Refresh page
// Now check console for detailed translation logs
```

### Check API Response

In browser DevTools:
1. Open Network tab (F12 → Network)
2. Click "🌐 Translate" and translate a message
3. Look for `/api/translate` request
4. Click it and view Response tab

---

## Performance Tuning

### For Best Performance with Azure

```env
# Use same region as your server
AZURE_TRANSLATOR_REGION=eastus  # Match your server location

# Enable all features
NEXT_PUBLIC_AUTO_DETECT_LANGUAGE=enabled
NEXT_PUBLIC_TRANSLATION_SERVICE=azure
```

### For Budget-Conscious Setup

```env
# Use free MyMemory tier
NEXT_PUBLIC_TRANSLATION_SERVICE=mymemory

# Disable language detection (saves API calls)
NEXT_PUBLIC_AUTO_DETECT_LANGUAGE=disabled
```

---

## Summary

| Aspect | MyMemory | Azure |
|--------|----------|-------|
| Setup Time | 0 minutes ✅ | 15 minutes |
| Cost | Free | Free tier (2M chars/mo) |
| Speed | 200-1000ms | 100-500ms |
| Accuracy | 70-85% | 85-95% |
| Uptime | Best effort | 99.9% SLA |
| Start | Now! | Need Azure account |

**Recommendation**: Start with MyMemory, upgrade to Azure when you need better performance! 🚀
