# Chat Manager Architecture & Flow Diagram

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Meeting Room Component                    │
│                  (MeetingRoom.tsx)                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  State Management                                            │
│  ┌────────────────────────────────────────┐                 │
│  │ • chats[]                              │                 │
│  │ • selectedChatId                       │                 │
│  │ • showChatManager                      │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  Handlers                                                    │
│  ┌────────────────────────────────────────┐                 │
│  │ • handleAddChat()                      │                 │
│  │ • handleDeleteChat()                   │                 │
│  │ • handleClearChat()                    │                 │
│  │ • handleSelectChat()                   │                 │
│  └────────────────────────────────────────┘                 │
│           │                                                 │
│           ├──────────────────────┐                          │
│           │                      │                          │
│           ▼                      ▼                          │
│    ┌─────────────────┐    ┌──────────────────┐             │
│    │  Chat Manager   │    │  Other Components│             │
│    │  Component      │    │  (unchanged)     │             │
│    └─────────────────┘    └──────────────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## User Interaction Flow

```
START
  │
  ▼
┌─────────────────────────────────┐
│  User clicks "Chat Mgr" button  │
└──────────────┬──────────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ ChatManager Panel    │
        │ Appears on Screen    │
        └──────────┬───────────┘
                   │
         ┌─────────┼─────────┐
         │         │         │
         ▼         ▼         ▼
    ┌────────┐ ┌────────┐ ┌──────────┐
    │ Click  │ │ Click  │ │Click Chat│
    │   +    │ │   ⋮    │ │ (select) │
    └───┬────┘ └───┬────┘ └────┬─────┘
        │          │           │
        ▼          ▼           ▼
    ┌────────┐ ┌───────────┐ ┌──────────┐
    │ Create │ │  Options: │ │ Selected │
    │ Dialog │ │  • Clear  │ │  Chat    │
    │        │ │  • Delete │ │ (blue bg)│
    └───┬────┘ └────┬──────┘ └──────────┘
        │           │
        ▼           ├─────────┐
    ┌────────┐      │         │
    │Type    │      ▼         ▼
    │Name &  │  ┌─────────┐┌──────────┐
    │Confirm │  │ Confirm ││ Confirm  │
    └───┬────┘  │ Clear   ││ Delete   │
        │       │ Dialog  ││ Dialog   │
        ▼       └────┬────┘└────┬─────┘
    ┌────────┐      │          │
    │ Chat   │      ▼          ▼
    │ Added  │  ┌────────┐ ┌────────┐
    │ + List │  │ Clear  │ │ Delete │
    │Updated │  │ Chat   │ │ Chat   │
    └────────┘  └────────┘ └────────┘
                    │          │
                    └────┬─────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ Update Display  │
                    │ (state refresh) │
                    └────────┬────────┘
                             │
                             ▼
                          END
```

## State Management Flow

```
Initial State
└─ chats: [
     { id: '1', name: 'General', messageCount: 0 },
     { id: '2', name: 'Announcements', messageCount: 0 }
   ]
└─ selectedChatId: '1'
└─ showChatManager: false


User Clicks "+" Button
└─ showChatManager: true
└─ ChatManager component renders
└─ Dialog opens


User Types "Team Meeting" & Confirms
└─ handleAddChat('Team Meeting')
└─ newChat = { id: '1707...' name: 'Team Meeting', ... }
└─ chats = [...prev, newChat]
└─ selectedChatId = '1707...'
└─ Display updates immediately


User Clicks "Clear" on a Chat
└─ handleClearChat(chatId)
└─ chats[index].messageCount = 0
└─ chats[index].lastMessage = undefined
└─ messages = [] (for that chat)
└─ Display updates


User Clicks "Delete" on a Chat
└─ handleDeleteChat(chatId)
└─ chats = chats.filter(c => c.id !== chatId)
└─ If deleted chat was selected:
   └─ selectedChatId = chats[0]?.id || '1'
└─ Display updates with one fewer chat
```

## Component Props & Data Flow

```
MeetingRoom Component
│
├─ State ──────────────────────────────────────────┐
│  chats: Chat[]                                   │
│  selectedChatId: string                          │
│  showChatManager: boolean                        │
│                                                  │
├─ Handlers ───────────────────────────────────────┤
│  handleAddChat: (string) => void                 │
│  handleDeleteChat: (string) => void              │
│  handleClearChat: (string) => void               │
│  handleSelectChat: (string) => void              │
│                                                  │
└─ Props ──────────────────────────────────────────┤
        │
        └──▶ ChatManager Component
              │
              ├─ Props Received:
              │  ├─ chats: Chat[]
              │  ├─ selectedChatId: string
              │  ├─ onAddChat: (name) => void
              │  ├─ onDeleteChat: (id) => void
              │  ├─ onClearChat: (id) => void
              │  └─ onSelectChat: (id) => void
              │
              ├─ Internal State:
              │  ├─ isAddDialogOpen: boolean
              │  ├─ newChatName: string
              │  ├─ confirmDelete: string | null
              │  └─ confirmClear: string | null
              │
              ├─ Callbacks:
              │  └─ When user acts
              │     └─ Calls parent handler
              │        └─ Parent updates state
              │           └─ Props updated
              │              └─ ChatManager re-renders
              │
              └─ Renders:
                 ├─ Header with chat count
                 ├─ Chat list with count
                 ├─ Dropdown menus (⋮)
                 └─ Confirmation dialogs
```

## Lifecycle Events

```
1. Component Mount
   └─ Initialize state with default chats
   └─ Show Chat Manager hidden

2. User Opens Chat Manager
   └─ showChatManager = true
   └─ ChatManager component renders

3. User Creates Chat
   └─ Open dialog
   └─ Enter name
   └─ handleAddChat() called
   └─ State updated
   └─ Component re-renders with new chat

4. User Clears/Deletes Chat
   └─ Open confirmation dialog
   └─ User confirms
   └─ Handler called
   └─ State updated
   └─ Component re-renders

5. User Closes Chat Manager
   └─ showChatManager = false
   └─ ChatManager hidden (not destroyed)
   └─ State persists in memory
```

## Data Persistence Timeline

```
Meeting Starts
│
├─ 📱 Default chats loaded
│  └─ "General", "Announcements"
│
├─ 👤 User creates "Project Discussion"
│  └─ Added to state
│  └─ Exists in memory
│
├─ 🗑️ User deletes "Announcements"
│  └─ Removed from state
│  └─ Updates immediately
│
└─ Meeting Ends
   └─ ⚠️ All chats cleared from memory
   └─ 📝 Next session: fresh chats

   [FUTURE: Add persistence]
   └─ Save to localStorage
   └─ Save to database
   └─ Retrieve on next meeting
```

## Error Handling Flow

```
User Action
│
├─ Validation
│  ├─ Chat name empty? ──▶ Disable confirm button
│  ├─ Chat ID exists? ───▶ Handle gracefully
│  └─ No chats to delete? ─▶ Keep at least one
│
├─ Confirmation
│  └─ User must confirm destructive actions
│
└─ Execution
   └─ Update state
   └─ Re-render
   └─ Done
```

## UI Component Hierarchy

```
ChatManager
├─ Header
│  ├─ Icon + Title
│  └─ Add Button (+)
│
├─ Chat List
│  └─ ChatItem (repeated)
│     ├─ Chat Name
│     ├─ Message Count
│     ├─ Last Message (optional)
│     └─ Options Menu (⋮)
│        ├─ Clear Chat
│        └─ Delete Chat
│
├─ Create Chat Dialog
│  ├─ Title
│  ├─ Input Field
│  └─ Buttons: [Cancel] [Create]
│
├─ Clear Chat Dialog
│  ├─ Title
│  ├─ Warning Message
│  └─ Buttons: [Cancel] [Clear]
│
└─ Delete Chat Dialog
   ├─ Title
   ├─ Warning Message
   └─ Buttons: [Cancel] [Delete]
```

---

**This architecture ensures clean, maintainable, and scalable chat management!**
