# Chat Manager Feature - WhatsApp-like Functionality

## Overview
The Chat Manager component (`components/ChatManager.tsx`) provides WhatsApp-like chat management capabilities within the meeting interface. It allows users to:

- **Create New Chats**: Add new chat groups/conversations
- **Clear Chat**: Delete all messages in a specific chat while keeping the chat itself
- **Delete Chat**: Completely remove a chat from the list

## Features

### 1. Add Chat (Create New)
- Click the **"+"** button in the Chat Manager header
- Enter a chat name in the dialog
- Press Enter or click "Create Chat"
- New chat is automatically added to the list and selected

### 2. Clear Chat
- Click the **"⋮"** (three dots) menu next to any chat
- Select "Clear chat"
- Confirm the action in the confirmation dialog
- All messages in that chat are deleted, but the chat remains

### 3. Delete Chat
- Click the **"⋮"** (three dots) menu next to any chat
- Select "Delete chat"
- Confirm the action in the confirmation dialog
- The entire chat is removed from the list
- If the deleted chat was selected, the first available chat is auto-selected

## Component Props

```typescript
interface ChatManagerProps {
  chats: Chat[];                              // List of all chats
  onDeleteChat: (chatId: string) => void;     // Callback to delete a chat
  onClearChat: (chatId: string) => void;      // Callback to clear messages
  onAddChat: (chatName: string) => void;      // Callback to create new chat
  onSelectChat: (chatId: string) => void;     // Callback when chat is selected
  selectedChatId?: string;                    // ID of currently selected chat
}
```

## Integration with MeetingRoom

The Chat Manager is integrated into `MeetingRoom.tsx`:

1. **State Management**: 
   - `chats`: Array of chat objects
   - `selectedChatId`: Currently active chat ID
   - `showChatManager`: Toggle visibility

2. **Handlers**:
   - `handleAddChat()`: Creates new chat
   - `handleDeleteChat()`: Removes chat
   - `handleClearChat()`: Clears messages
   - `handleSelectChat()`: Activates chat

3. **UI Toggle**: "Chat Mgr" button in the footer toolbar

## Chat Data Structure

```typescript
interface Chat {
  id: string;              // Unique identifier (timestamp-based for new chats)
  name: string;            // Display name
  lastMessage?: string;    // Preview of last message
  timestamp?: string;      // Timestamp of last message
  messageCount: number;    // Total messages in chat
}
```

## Default Chats

The component initializes with two default chats:
- **General** (ID: '1')
- **Announcements** (ID: '2')

## Styling

- **Active Chat**: Blue background (`bg-blue-600`)
- **Inactive Chat**: Dark gray background (`bg-gray-700`)
- **Hover State**: Slightly lighter gray
- **Delete Action**: Red theme
- **Clear Action**: Orange theme

## Confirmation Dialogs

Both delete and clear actions show confirmation dialogs with:
- Clear explanation of what will happen
- Cancel and Confirm buttons
- Visual emphasis on destructive actions (red/orange)

## Future Enhancements

Potential improvements:
- Archive chats instead of delete
- Search/filter chats
- Chat pinning
- Sync messages with Stream Chat API
- Message persistence to database
- Chat notifications
- Unread message badges
- Typing indicators
