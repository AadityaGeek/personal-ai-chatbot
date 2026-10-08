import React, { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';

const ChatWindow = lazy(() => import('./ChatWindow').then((m) => ({ default: m.ChatWindow })));

import type { Message } from '../types/chat';
import { INITIAL_GREETING } from '../types/chat';

export interface ChatWidgetProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ defaultOpen = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
  const [useStreaming, setUseStreaming] = useState(true);

  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen);
  if (defaultOpen !== prevDefaultOpen) {
    setPrevDefaultOpen(defaultOpen);
    setIsOpen(defaultOpen);
  }

  const handleOpen = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      {/* Chat Window Panel - Takes full vertical space */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Subtle mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs sm:hidden z-40 pointer-events-auto"
            />
            <div className="fixed inset-0 z-50 pointer-events-none">
              <Suspense fallback={null}>
                <ChatWindow
                  onClose={handleClose}
                  messages={messages}
                  setMessages={setMessages}
                  useStreaming={useStreaming}
                  setUseStreaming={setUseStreaming}
                />
              </Suspense>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Launcher Bubble - Hidden when chat window is open */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 pointer-events-none">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              key="launcher-bubble"
              initial={{ scale: 0, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={handleOpen}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="pointer-events-auto relative group flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/30 border border-white/20 transition-all duration-300 cursor-pointer"
              aria-label="Open chat"
              style={{
                boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4), 0 0 20px 2px rgba(129, 140, 248, 0.2)',
              }}
            >
              {/* Ambient Ring Glow */}
              <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-40 blur-md group-hover:opacity-75 transition duration-500 group-hover:duration-200" />

              <div className="relative flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
                <Sparkles className="w-3 h-3 absolute -top-1.5 -right-1.5 text-amber-300 animate-bounce" />
              </div>

              {/* Status indicator badge */}
              <span className="absolute top-0 right-0 -mt-0.5 -mr-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-900"></span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
