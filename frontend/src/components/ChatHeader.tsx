import React from 'react';
import { Bot, Trash2, X, Sparkles, RefreshCw } from 'lucide-react';

interface ChatHeaderProps {
  onClose: () => void;
  onClearHistory: () => void;
  messageCount: number;
  useStreaming: boolean;
  onToggleStreaming: () => void;
  isOnline?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onClose,
  onClearHistory,
  messageCount,
  useStreaming,
  onToggleStreaming,
  isOnline = true,
}) => {
  return (
    <div className="relative px-4 py-3 border-b border-white/10 bg-zinc-900/90 backdrop-blur-md flex items-center justify-between z-10">
      {/* Bot Identity */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Bot className="w-5 h-5" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm text-white tracking-tight">ChatBot AI</h3>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                isOnline
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {isOnline ? 'Vector RAG' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
            <span>{isOnline ? 'Semantic Vector Search' : 'Backend Unreachable'}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Streaming Mode Toggle */}
        <button
          onClick={onToggleStreaming}
          className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer ${
            useStreaming
              ? 'text-indigo-400 hover:bg-indigo-500/20'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
          title={useStreaming ? 'Streaming mode active (Click to disable)' : 'Batch mode active (Click to enable streaming)'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${useStreaming ? 'text-indigo-400' : 'text-zinc-500'}`} />
          <span className="text-[10px] font-mono hidden sm:inline">
            {useStreaming ? 'Stream' : 'Batch'}
          </span>
        </button>

        {/* Clear History */}
        {messageCount > 0 && (
          <button
            onClick={onClearHistory}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Clear chat history"
            aria-label="Clear chat history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Close chat"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
