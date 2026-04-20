'use client';

import { Tldraw, TldrawProps, useEditor, Editor, TLShape } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useCall } from '@stream-io/video-react-sdk';
import { useEffect } from 'react';
import { useThrottleCallback } from '@react-hook/throttle';
import { X } from 'lucide-react';

// Custom hook to handle synchronization
function SyncWithStream() {
  const editor = useEditor();
  const call = useCall();

  // Throttle the send event to avoid overwhelming the network
  const sendUpdate = useThrottleCallback((snapshot: any) => {
    if (call) {
      call.sendCustomEvent({
        type: 'whiteboard-update',
        data: JSON.stringify(snapshot),
      });
    }
  }, 50);
  useEffect(() => {
    if (!editor || !call) return;

    const handleChange = (change: any) => {
      // Only sync changes from the user
      if (change.source !== 'user') return;
      const snapshot = editor.getSnapshot();
      sendUpdate(snapshot);
    };

    const handleCustomEvent = (event: any) => {
      // Check if it's a whiteboard update from another user
      if (event.custom.type === 'whiteboard-update') {
        // Ignore events from the current user
        if (event.user.id === call.currentUserId) return;
        try {
          const snapshot = JSON.parse(event.custom.data);
          // Load the received snapshot into the editor
          editor.loadSnapshot(snapshot);
        } catch (e) {
          console.error("Failed to parse or load whiteboard snapshot", e);
        }
      } else if (event.custom.type === 'whiteboard-clear') {
        // When a clear event is received, delete all shapes on the current page.
        // This action is performed by all clients, including the one who initiated it.
        const allShapeIds = editor.getCurrentPageShapes().map((shape: TLShape) => shape.id);
        if (allShapeIds.length > 0) {
            // This triggers a 'change' event, but our handler ignores non-user changes,
            // preventing an unnecessary broadcast loop.
            editor.deleteShapes(allShapeIds);
        }
      }
    };

    // Subscribe to editor changes and custom call events
    editor.on('change', handleChange);
    call.on('custom', handleCustomEvent);

    // Clean up on unmount
    return () => {
      editor.off('change', handleChange);
      call.off('custom', handleCustomEvent);
    };
  }, [editor, call, sendUpdate]);

  return null;
}

// The main Whiteboard component
export const Whiteboard = ({ onClose, ...tldrawProps }: TldrawProps & { onClose?: () => void }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'white' }}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[999] p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors shadow-lg"
          aria-label="Close whiteboard"
        >
          <X size={24} />
        </button>
      )}
      <Tldraw {...tldrawProps}>
        {/* SyncWithStream is a child and can use the useEditor hook */}
        <SyncWithStream />
      </Tldraw>
    </div>
  );
};
