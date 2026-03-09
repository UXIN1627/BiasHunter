import React from 'react';
import { ClassificationResult } from '../types';
import { Button } from './Button';

interface ResultsScreenProps {
  result: ClassificationResult;
  finalScore: number;
  onContinue: () => void;
  onRestart: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, finalScore, onContinue, onRestart }) => {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
             <div className="w-3 h-8 bg-indigo-500 rounded-full"></div>
             測驗完成
          </h2>
        </div>

        {/* Summary Text Section - Main Focus */}
        <div className="mb-10">
           <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
             您的行為分析摘要
           </h3>
           <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-8 rounded-r-2xl shadow-sm">
             <p className="text-slate-700 leading-relaxed text-lg font-medium">
               {result.summary}
             </p>
           </div>
        </div>

        {/* Final Score Section - Secondary/Fun Info */}
        <div className="mb-12 flex items-center justify-between p-6 bg-white/60 rounded-2xl border border-white/80 shadow-sm">
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">結算點數</span>
            <span className="text-xs text-slate-500 mt-1">基於隨機概率結果</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-bold text-slate-700">
              {finalScore.toLocaleString()}
            </span>
            <span className="text-sm text-slate-400 font-mono font-medium">pts</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
           <Button 
             variant="secondary"
             onClick={onRestart} 
             className="px-6"
           >
              重新開始
           </Button>
           <Button onClick={onContinue} className="px-8 shadow-indigo-200">
              下一步
           </Button>
        </div>
      </div>
    </div>
  );
};