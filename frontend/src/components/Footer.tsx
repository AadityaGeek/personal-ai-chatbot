import React from 'react';
import { Heart, ExternalLink, Sparkles } from 'lucide-react';
import botLogo from '../assets/bot-logo.svg';

interface FooterProps {
  onOpenChat: () => void;
  documentCount?: number;
}

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const Footer: React.FC<FooterProps> = ({ onOpenChat, documentCount }) => {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/80 backdrop-blur-xl relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Overview */}
          <div className="sm:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={botLogo}
                alt="AI Chatbot Widget"
                className="w-8 h-8 rounded-xl shadow-md shadow-indigo-500/25 object-cover"
              />
              <span className="font-bold text-base tracking-tight text-white">
                AI Chatbot Widget
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Vector RAG
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              A standalone, embeddable conversational AI widget powered by Google Gemini and local NumPy vector semantic search. Fully private, cost-efficient, and grounded in your documentation.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href="https://github.com/AadityaGeek/personal-ai-chatbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
              <button
                type="button"
                onClick={onOpenChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Test Chatbot</span>
              </button>
            </div>
          </div>

          {/* Architecture & Docs */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3.5">
              Architecture
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('semantic-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                >
                  Vector Semantic Search
                </button>
              </li>
              <li>
                <a
                  href="http://127.0.0.1:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>FastAPI Swagger Docs</span>
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AadityaGeek/personal-ai-chatbot#vector-rag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 transition-colors"
                >
                  Cosine Similarity Index
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AadityaGeek/personal-ai-chatbot#security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 transition-colors"
                >
                  Security Guardrails
                </a>
              </li>
            </ul>
          </div>

          {/* Creator & Inquiries */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3.5">
              Creator & Inquiries
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <a
                  href="https://github.com/AadityaGeek"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>Aaditya Kumar (@AadityaGeek)</span>
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AadityaGeek/personal-ai-chatbot/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 transition-colors"
                >
                  Report an Issue
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AadityaGeek/personal-ai-chatbot#embedding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 transition-colors"
                >
                  Embed Guide
                </a>
              </li>
              <li>
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider & Bottom copyright bar */}
        <div className="pt-6 sm:pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 text-center sm:text-left">
          <div className="flex items-center gap-1">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>by</span>
            <a
              href="https://github.com/AadityaGeek"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white font-medium transition-colors"
            >
              Aaditya Kumar
            </a>
            <span>• MIT Licensed</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-400">
              FastAPI + Gemini 3.5
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-400">
              React + Tailwind CSS
            </span>
            {documentCount !== undefined && (
              <span className="text-emerald-400">
                • {documentCount} docs indexed
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
