'use client';

import { Tldraw, TldrawProps, useEditor, Editor, TLShape } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useCall } from '@stream-io/video-react-sdk';
import { useEffect } from 'react';
import { useThrottleCallback } from '@react-hook/throttle';
import { X, Undo, Redo, Download } from 'lucide-react';

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
  }, 500); // Tumeongeza muda hadi 500ms kuepuka kuzuiliwa na seva za Stream (Rate Limiting)
  useEffect(() => {
    if (!editor || !call) return;

    // Tldraw mpya hutumia editor.store.listen badala ya editor.on('change')
    const cleanup = editor.store.listen((update: any) => {
      if (update.source !== 'user') return;
      const snapshot = editor.getSnapshot();
      sendUpdate(snapshot);
    }, { scope: 'document' });

    const handleCustomEvent = (event: any) => {
      // Check if it's a whiteboard update from another user
      if (event.custom.type === 'whiteboard-update') {
        // Ignore events from the current user
        if (event.user.id === call.currentUserId) return;
        try {
          const snapshot = JSON.parse(event.custom.data);
          // Kuepuka kumkatiza mtu anayechora, pakia mabadiliko ikiwa tu kalamu (pen) haijashushwa
          if (!editor.inputs?.isDragging && !editor.inputs?.isPointing) {
            editor.loadSnapshot(snapshot);
          }
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

    call.on('custom', handleCustomEvent);

    // Clean up on unmount
    return () => {
      cleanup();
      call.off('custom', handleCustomEvent);
    };
  }, [editor, call, sendUpdate]);

  return null;
}

// Custom UI for Undo, Redo, and Save Image
const WhiteboardCustomUI = () => {
  const editor = useEditor();

  const handleExport = async () => {
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) {
        alert('Ubao uko wazi! Chora kitu kwanza kabla ya kusave.');
        return;
      }
      
      const { blob } = await editor.toImage(shapeIds, {
        format: 'png',
        background: true,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mchoro-ubao-${new Date().getTime()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export whiteboard:', error);
      alert('Imeshindwa kusave mchoro kama picha.');
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 bg-gray-800 p-2 rounded-xl shadow-lg border border-gray-700">
      <button onClick={() => editor.undo()} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Undo (Turudishe Nyuma)">
        <Undo size={20} />
      </button>
      <button onClick={() => editor.redo()} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Redo (Peleka Mbele)">
        <Redo size={20} />
      </button>
      <div className="w-px h-6 bg-gray-600 mx-1"></div>
      <button onClick={handleExport} className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2" title="Save as Image (PNG)">
        <Download size={20} />
        <span className="text-sm font-bold hidden sm:inline">Save Image</span>
      </button>
    </div>
  );
};

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
        {/* Custom Toolbar for Undo, Redo, Export */}
        <WhiteboardCustomUI />
      </Tldraw>
    </div>
  );
};
