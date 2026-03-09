import React from 'react';
import { INTRO_SCRIPT } from '../constants';
import { Button } from './Button';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  // Process the markdown-like bold syntax for display
  const renderText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Very basic parser for **bold**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="mb-4 text-slate-600 leading-relaxed text-lg">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="text-indigo-600 font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
        
        <div className="mb-8">
           <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {/* Finance / Investment Icon (Trending Up) */}
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">行為評估</h2>
           <div className="w-16 h-1 bg-indigo-600 mx-auto rounded-full opacity-20 mb-4"></div>
           <p className="text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">
             在開始與專屬顧問聊天之前，需要先進行一個小測驗，讓顧問了解你的行為偏好，以便給予最適合您的專屬回應。
           </p>
        </div>

        <div className="prose prose-slate prose-lg max-w-none mb-10 text-left bg-white/50 p-6 rounded-2xl border border-white/60">
          {renderText(INTRO_SCRIPT)}
        </div>

        <div className="flex justify-center">
          <Button onClick={onStart} className="w-full sm:w-auto min-w-[240px] text-lg px-8">
            開始
          </Button>
        </div>
      </div>
    </div>
  );
};