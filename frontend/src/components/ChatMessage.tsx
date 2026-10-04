import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Bot, User, RotateCcw, ExternalLink, Copy, Check, AlertCircle, WifiOff } from 'lucide-react';
import type { Message } from '../types/chat';

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-2.5 my-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/20'
            : message.isOffline
            ? 'bg-amber-950/60 border border-amber-500/30 text-amber-400'
            : 'bg-zinc-800 border border-white/10 text-indigo-400 shadow-black/40'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : message.isOffline ? (
          <WifiOff className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Message Body */}
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed transition-all ${
            isUser
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
              : message.isOffline
              ? 'bg-amber-950/40 border border-amber-500/30 text-amber-200 rounded-tl-sm'
              : message.isError
              ? 'bg-red-950/40 border border-red-500/30 text-red-200 rounded-tl-sm'
              : 'bg-zinc-800/80 backdrop-blur-md border border-white/10 text-zinc-200 rounded-tl-sm shadow-lg'
          }`}
        >
          {message.isError && (
            <div
              className={`flex items-center gap-1.5 font-semibold mb-1 text-xs ${
                message.isOffline ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {message.isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Assistant Offline</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Request Error</span>
                </>
              )}
            </div>
          )}

          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <div className="markdown-content break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/40 underline-offset-2"
                    >
                      {props.children}
                      <ExternalLink className="w-2.5 h-2.5 inline shrink-0 opacity-70" />
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer Actions (Timestamp, Retry, Copy) */}
        <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-zinc-400">
          <span>{formatTime(message.timestamp)}</span>

          {!isUser && !message.isError && (
            <button
              onClick={handleCopy}
              className="hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy answer"
            >
              {copied ? (
                <>
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-2.5 h-2.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}

          {message.isError && onRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                message.isOffline ? 'text-amber-400 hover:text-amber-300' : 'text-red-400 hover:text-red-300'
              }`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
