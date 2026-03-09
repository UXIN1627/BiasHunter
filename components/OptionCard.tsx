import React from 'react';
import { OptionType, LotteryParams } from '../types';
import { Button } from './Button';

interface OptionCardProps {
  label: string;
  type: OptionType;
  params?: LotteryParams;
  amount?: number;
  onClick: () => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({ 
  label, 
  type, 
  params, 
  amount, 
  onClick 
}) => {
  const formatNumber = (num: number) => Math.abs(num).toLocaleString();
  
  const isLottery = type === OptionType.LOTTERY;
  
  // UNIFIED CONTAINER STYLES - To avoid bias, both cards look visually "Neutral" in container
  // Using Frosted Glass effect
  const containerClasses = "bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1";
  
  // Header Text Color - Uniform
  const headerColor = "text-slate-700";
  const labelBadge = "bg-slate-200 text-slate-600";

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-3xl p-8 transition-all duration-300 cursor-pointer group flex flex-col h-full overflow-hidden ${containerClasses}`}
    >
      {/* Decorative gradient blob in background */}
      <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${isLottery ? 'bg-indigo-300' : 'bg-teal-300'}`}></div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/60 relative z-10">
        <span className={`font-bold text-lg tracking-wide uppercase flex items-center gap-2 ${headerColor}`}>
          {isLottery ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M7 2v5"/><path d="M17 2v5"/><path d="M2 12h20"/><path d="M2 7h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
          )}
          {isLottery ? "機會彩票 (LOTTERY)" : "確定收益 (SURE THING)"}
        </span>
        <span className={`text-xs font-bold font-mono px-3 py-1.5 rounded-full ${labelBadge}`}>
          {label}
        </span>
      </div>

      {/* Content Visualization */}
      <div className="flex-1 flex flex-col justify-center items-center py-2 space-y-6 relative z-10 min-h-[220px]">
        
        {/* LOTTERY VISUALIZATION - ENLARGED */}
        {isLottery && params && (
          <div className="w-full grid grid-cols-2 gap-4 h-full">
            {/* Win Side */}
            <div className="flex flex-col items-center justify-center bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 transition-colors hover:bg-emerald-50">
               <span className="text-emerald-600 font-bold text-4xl mb-1">{Math.round(params.probability * 100)}%</span>
               <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">機率獲勝</span>
               <span className="text-3xl lg:text-4xl font-mono font-bold text-emerald-600 tracking-tight">
                 +{formatNumber(params.gain)}
               </span>
            </div>

            {/* Loss Side */}
            <div className="flex flex-col items-center justify-center bg-rose-50/50 border border-rose-100 rounded-2xl p-4 transition-colors hover:bg-rose-50">
               <span className="text-rose-500 font-bold text-4xl mb-1">{Math.round((1 - params.probability) * 100)}%</span>
               <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">機率損失</span>
               <span className={`text-3xl lg:text-4xl font-mono font-bold tracking-tight ${params.loss > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                 {params.loss > 0 ? `-${formatNumber(params.loss)}` : '0'}
               </span>
            </div>
          </div>
        )}

        {/* SURE THING VISUALIZATION - Updated Layout to match Lottery */}
        {!isLottery && (
          <div className="flex flex-col items-center justify-center py-4 w-full h-full bg-slate-50/50 border border-slate-100 rounded-2xl transition-colors hover:bg-slate-50">
             <span className={`font-bold text-4xl mb-1 ${(amount || 0) >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
               100%
             </span>
             <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">
               確定發生
             </span>
             <span className={`text-3xl lg:text-4xl font-mono font-bold tracking-tight ${(amount || 0) >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
               {(amount || 0) >= 0 ? '+' : '-'}{formatNumber(amount || 0)}
             </span>
          </div>
        )}
      </div>

      {/* Footer / Action Button */}
      <div className="mt-8 pt-6 relative z-10">
        <Button variant="option">
          選擇此方案
        </Button>
      </div>
    </div>
  );
};