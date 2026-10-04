import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-2.5 my-2">
      <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
      </div>

      <div className="bg-zinc-800/80 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg flex items-center gap-1.5">
        <span className="text-xs text-zinc-400 mr-1 font-medium">Thinking</span>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            animate={{
              y: ['0px', '-4px', '0px'],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
};
