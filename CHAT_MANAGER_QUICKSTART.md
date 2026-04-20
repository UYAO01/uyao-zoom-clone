# Chat Manager - Quick Start Guide 🚀

## In 30 Seconds

The Chat Manager lets you **create**, **clear**, and **delete** chats like WhatsApp—all built into your video meeting!

## What You Can Do

| Action | Steps | Icon |
|--------|-------|------|
| **Create Chat** | Click `+` → Type name → Press Enter | ➕ |
| **Clear Chat** | Click `⋮` → Select "Clear chat" → Confirm | 🔄 |
| **Delete Chat** | Click `⋮` → Select "Delete chat" → Confirm | 🗑️ |
| **Switch Chat** | Click on any chat name | 📱 |

## Button Location

Look for the **"Chat Mgr"** button in the bottom toolbar during a meeting:

```
[Layout] [Participants] [Chat] [Translate] [Raise Hand] [Screen] [Voting] [Chat Mgr] [Record]
                                                                                    ↑ Click here
```

## Visual Guide

### Chat Manager Panel
```
┌─────────────────────────┐
│ 💬 Chats (3)        [+] │  ← Add new chat
├─────────────────────────┤
│ • General           [⋮]  │  ← View options
│   5 messages            │
├─────────────────────────┤
│ • Announcements     [⋮]  │
│   2 messages            │
├─────────────────────────┤
│ • New Project       [⋮]  │
│   8 messages            │
└─────────────────────────┘
```

### Context Menu
```
Click [⋮] to see:
  ─────────────────────
  🔄 Clear chat
  🗑️ Delete chat
  ─────────────────────
```

## Quick Tips

💡 **Default Chats**: You start with "General" and "Announcements"

💡 **Select Active Chat**: Your selected chat appears in blue

💡 **Message Count**: Each chat shows how many messages it contains

💡 **No Undo**: Clearing or deleting chats is permanent—confirmation required

💡 **No Sync Needed**: All actions are instant (no API calls)

## Common Scenarios

### Scenario 1: Clean up after a meeting
1. Click "Chat Mgr" button
2. Click ⋮ on old chats
3. Select "Clear chat"
4. Your chat stays, messages are gone

### Scenario 2: Create a topic-specific chat
1. Click the + button
2. Type "Questions & Answers"
3. Press Enter
4. New chat appears and is selected

### Scenario 3: Remove a chat completely
1. Click ⋮ on the chat
2. Select "Delete chat"
3. Confirm deletion
4. Chat is permanently removed

## Confirmation Dialogs

### ✅ Clear Chat Dialog
```
┌──────────────────────────────┐
│ Clear Chat?                  │
│ This will delete all messages │
│ in this chat. The chat will   │
│ remain but be empty.          │
│                              │
│  [Cancel]      [Clear]       │
└──────────────────────────────┘
```

### ✅ Delete Chat Dialog
```
┌──────────────────────────────┐
│ Delete Chat?                 │
│ This action cannot be undone. │
│ All messages will be deleted. │
│                              │
│  [Cancel]     [Delete]       │
└──────────────────────────────┘
```

## Troubleshooting

**Q: Where's the Chat Manager?**
A: Look for "Chat Mgr" button in the bottom toolbar. If you don't see it, the meeting might not have started.

**Q: Can I undo a delete?**
A: No. Deletes are permanent. Always confirm before deleting!

**Q: How many chats can I have?**
A: Unlimited! Create as many as you need.

**Q: Do chats save to a database?**
A: Currently they're stored in-memory. They'll clear when the meeting ends (Future: persistence coming soon!)

## Keyboard Shortcuts

- When creating a new chat: **Enter** = Create, **Esc** = Cancel
- When in confirmation: **Tab** to switch buttons, **Enter** to confirm

## UI Colors

🟦 **Blue** = Active/selected chat
⬜ **Gray** = Inactive chat
🔴 **Red** = Delete action
🟠 **Orange** = Clear action
🟢 **Green** = Chat Manager active

---

**Ready to use?** Click the "Chat Mgr" button and start creating chats! 🎉
