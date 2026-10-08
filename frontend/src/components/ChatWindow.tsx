import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import type { Message, MessageRole } from '../types/chat';
import { INITIAL_GREETING } from '../types/chat';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { QuickPrompts } from './QuickPrompts';
import { TypingIndicator } from './TypingIndicator';
import { sendChatMessage, streamChatMessage, checkBackendHealth, FALLBACK_OFFLINE_MESSAGE } from '../services/api';

interface ChatWindowProps {
  onClose: () => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  useStreaming: boolean;
  setUseStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  onClose,
  messages,
  setMessages,
  useStreaming,
  setUseStreaming,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeModel, setActiveModel] = useState('Gemini 3.5 Flash Lite');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    // Focus input on load
    inputRef.current?.focus();

    // Check initial health status and retrieve active model name
    checkBackendHealth().then((health) => {
      setIsOnline(health !== null);
      if (health?.model) {
        if (health.model.includes('3.5-flash-lite')) {
          setActiveModel('Gemini 3.5 Flash Lite');
        } else if (health.model.includes('3.6-flash')) {
          setActiveModel('Gemini 3.6 Flash');
        } else {
          setActiveModel(health.model);
        }
      }
    });
  }, []);

  const handleClearHistory = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setMessages([
      {
        ...INITIAL_GREETING,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputValue).trim();
    if (!textToSend || isLoading) return;

    setInputValue('');

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    // Prepare API history
    const apiHistory = newMessages
      .filter((m) => !m.isError && m.id !== 'greeting')
      .slice(-6)
      .map((m) => ({
        role: m.role as MessageRole,
        content: m.content,
      }));

    if (useStreaming) {
      // Streaming mode via Server-Sent Events
      const botMessageId = `bot-${Date.now()}`;
      let accumulatedText = '';

      abortControllerRef.current = new AbortController();

      try {
        await streamChatMessage(
          {
            message: textToSend,
            history: apiHistory,
          },
          (token) => {
            accumulatedText += token;
            setMessages((prev) => {
              const existingIdx = prev.findIndex((m) => m.id === botMessageId);
              if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  content: accumulatedText,
                };
                return updated;
              } else {
                return [
                  ...prev,
                  {
                    id: botMessageId,
                    role: 'assistant',
                    content: accumulatedText,
                    timestamp: new Date(),
                  },
                ];
              }
            });
          },
          undefined,
          abortControllerRef.current.signal
        );
        setIsOnline(true);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Chat error:', err);
          const isOfflineErr = err.isOffline || !window.navigator.onLine;
          if (isOfflineErr) {
            setIsOnline(false);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: isOfflineErr ? FALLBACK_OFFLINE_MESSAGE : (err.message || 'An error occurred while connecting to the assistant. Please retry.'),
              timestamp: new Date(),
              isError: true,
              isOffline: isOfflineErr,
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    } else {
      // Standard JSON batch mode
      try {
        const response = await sendChatMessage({
          message: textToSend,
          history: apiHistory,
        });

        setIsOnline(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'assistant',
            content: response.response,
            timestamp: new Date(),
          },
        ]);
      } catch (err: any) {
        console.error('Chat error:', err);
        const isOfflineErr = err.isOffline || !window.navigator.onLine;
        if (isOfflineErr) {
          setIsOnline(false);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: isOfflineErr ? FALLBACK_OFFLINE_MESSAGE : (err.message || 'An error occurred while connecting to the assistant. Please retry.'),
            timestamp: new Date(),
            isError: true,
            isOffline: isOfflineErr,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRetryLastMessage = () => {
    // Find last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove last error message
      setMessages((prev) => prev.filter((m) => !m.isError));
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto fixed top-0 bottom-0 right-0 w-full sm:w-[480px] md:w-[500px] h-full h-[100dvh] rounded-none sm:rounded-l-2xl flex flex-col overflow-hidden shadow-2xl glass-panel z-50 border-y-0 border-r-0 sm:border-l border-white/10"
      style={{
        boxShadow:
          '-10px 0 50px -10px rgba(0, 0, 0, 0.8), -5px 0 25px -5px rgba(99, 102, 241, 0.2)',
      }}
    >
      {/* Header */}
      <ChatHeader
        onClose={onClose}
        onClearHistory={handleClearHistory}
        messageCount={messages.length}
        useStreaming={useStreaming}
        onToggleStreaming={() => setUseStreaming(!useStreaming)}
        isOnline={isOnline}
      />

      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col justify-start">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onRetry={msg.isError ? handleRetryLastMessage : undefined}
          />
        ))}

        {/* Thinking Indicator (if loading and assistant hasn't started generating content) */}
        {isLoading && (!useStreaming || messages[messages.length - 1]?.role !== 'assistant' || !messages[messages.length - 1]?.content) && (
          <TypingIndicator />
        )}

        {/* Quick prompt suggestions (shown when chat is at initial state) */}
        {messages.length === 1 && !isLoading && (
          <QuickPrompts onSelectPrompt={(prompt) => handleSendMessage(prompt)} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input container */}
      <div className="p-3 border-t border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this chatbot..."
              rows={1}
              className="w-full glass-input text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm rounded-xl pl-3.5 pr-8 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all custom-scrollbar max-h-24"
              style={{ minHeight: '40px' }}
            />
            <div className="absolute right-2.5 bottom-2.5 hidden sm:flex items-center gap-0.5 text-[10px] text-zinc-600 pointer-events-none">
              <span>↵</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
            title="Send message"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </motion.button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-indigo-400/80" />
            <span className="truncate max-w-[200px] sm:max-w-none">Powered by {activeModel}</span>
          </span>
          <span className="hidden sm:inline">Shift + Enter for new line</span>
        </div>
      </div>
    </motion.div>
  );
};
