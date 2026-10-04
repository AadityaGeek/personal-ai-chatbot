import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code2, Cpu } from 'lucide-react';
import type { QuickPrompt } from '../types/chat';

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const DEFAULT_PROMPTS: QuickPrompt[] = [
  {
    id: 'how-it-works',
    title: 'How does this chatbot work?',
    prompt: 'How does this chatbot work, what is its architecture, and which AI model powers it?',
  },
  {
    id: 'semantic-search',
    title: 'How does semantic search work?',
    prompt: 'How do vector embeddings and semantic search help the chatbot understand questions with similar meanings?',
  },
  {
    id: 'how-to-embed',
    title: 'How to embed on my website?',
    prompt: 'How can I embed this floating chat widget into my website or React application?',
  },
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelectPrompt }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'how-to-embed':
        return <Code2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'semantic-search':
        return <Cpu className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-3 px-1">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        Ask About This Chatbot
      </div>
      <div className="flex flex-col gap-1.5">
        {DEFAULT_PROMPTS.map((item, idx) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.2 }}
            onClick={() => onSelectPrompt(item.prompt)}
            className="flex items-center gap-2.5 text-left text-xs text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/40 rounded-xl px-3.5 py-2.5 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/10 group cursor-pointer"
          >
            <span className="p-1 rounded-md bg-zinc-900/60 border border-white/5 group-hover:border-indigo-500/20 transition-colors">
              {getIcon(item.id)}
            </span>
            <span className="font-medium flex-1">{item.title}</span>
            <span className="text-zinc-400 group-hover:text-indigo-400 transition-colors">→</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
