'use client';

import React, { useState } from 'react';
import { Trash2, Plus, RotateCcw, MoreVertical, MessageSquare } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  messageCount: number;
}

interface ChatManagerProps {
  chats: Chat[];
  onDeleteChat: (chatId: string) => void;
  onClearChat: (chatId: string) => void;
  onAddChat: (chatName: string) => void;
  onSelectChat: (chatId: string) => void;
  selectedChatId?: string;
}

export default function ChatManager({
  chats,
  onDeleteChat,
  onClearChat,
  onAddChat,
  onSelectChat,
  selectedChatId,
}: ChatManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  const handleAddChat = () => {
    if (newChatName.trim()) {
      onAddChat(newChatName);
      setNewChatName('');
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    onDeleteChat(chatId);
    setConfirmDelete(null);
  };

  const handleClearChat = (chatId: string) => {
    onClearChat(chatId);
    setConfirmClear(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-400" />
          <h3 className="font-bold text-white">Chats ({chats.length})</h3>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          title="Add new chat"
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <MessageSquare size={32} opacity={0.5} />
            <p className="text-sm">No chats yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                  selectedChatId === chat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-650'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{chat.name}</h4>
                  {chat.lastMessage && (
                    <p className="text-xs opacity-75 truncate">{chat.lastMessage}</p>
                  )}
                  <p className="text-xs opacity-50">{chat.messageCount} messages</p>
                </div>

                {/* Chat Actions Dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded hover:bg-gray-600 transition-colors flex-shrink-0"
                      title="Chat options"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[150px] bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1 z-50"
                      sideOffset={5}
                    >
                      {/* Clear Chat */}
                      <DropdownMenu.Item asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmClear(chat.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                        >
                          <RotateCcw size={14} />
                          Clear chat
                        </button>
                      </DropdownMenu.Item>

                      {/* Delete Chat */}
                      <DropdownMenu.Item asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(chat.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete chat
                        </button>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Chat Dialog */}
      <Dialog.Root open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-white">
                Create New Chat
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 hover:bg-gray-700 rounded">
                  <X size={18} className="text-gray-400" />
                </button>
              </Dialog.Close>
            </div>

            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChat()}
              placeholder="Enter chat name..."
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />

            <div className="flex gap-2 justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleAddChat}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Chat
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-50">
            <Dialog.Title className="text-lg font-bold text-white mb-2">
              Delete Chat?
            </Dialog.Title>
            <p className="text-gray-300 text-sm mb-6">
              This action cannot be undone. All messages in this chat will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete && handleDeleteChat(confirmDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Clear Chat Confirmation Dialog */}
      <Dialog.Root open={confirmClear !== null} onOpenChange={(open) => !open && setConfirmClear(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 z-50">
            <Dialog.Title className="text-lg font-bold text-white mb-2">
              Clear Chat?
            </Dialog.Title>
            <p className="text-gray-300 text-sm mb-6">
              This will delete all messages in this chat. The chat will remain but be empty.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmClear(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmClear && handleClearChat(confirmClear)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
