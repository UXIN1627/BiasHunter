import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './Button';
import { analyzeBrokerageStatement } from '../services/historyService';
import { HistoryAnalysisResult, AnalyzedTransaction } from '../types';

interface HistoryUploadScreenProps {
  existingTransactions: AnalyzedTransaction[];
  onAddTransactions: (newTransactions: AnalyzedTransaction[]) => void;
  onNext?: () => void; // Optional: only used during onboarding
  onClose?: () => void; // Optional: only used during modal mode
  isModal?: boolean;
}

// Investment Tips Map
const BIAS_TIPS: Record<string, string> = {
  'FOMO': '錯失恐懼 (FOMO) 常導致追高。建議：耐心等待回調，寧可錯過也不要買在山頂。',
  'Panic': '恐慌 (Panic) 常導致殺低。建議：下跌時請回歸基本面，不要因為情緒而拋售。',
  'Greed': '貪婪 (Greed) 讓人忘記風險。建議：適時分批獲利了結，落袋為安。',
  'Fear': '恐懼 (Fear) 會讓你不敢進場。建議：依據數據與策略交易，而非恐懼感。',
  'Hype': '炒作 (Hype) 往往短暫。建議：遠離市場喧囂，專注於真實的價格行為。',
  'Rumor': '謠言 (Rumor) 不可盡信。建議：投資應建立在查證過的事實上。',
  'Impulse': '衝動 (Impulse) 代價高昂。建議：下單前深呼吸三秒，確認是否符合交易計畫。',
  'Risk': '風險 (Risk) 需被管理。建議：進場前先想好停損點，永遠將風險置於獲利之前。',
  'Noise': '雜訊 (Noise) 干擾判斷。建議：減少查看盤面的頻率，專注長線趨勢。',
  'Bias': '偏差 (Bias) 是人性的弱點。建議：保持客觀紀錄，定期審視自己的交易日記。',
};

// Map Chinese tags from API to English Keys in BIAS_TIPS
const TAG_MAP: Record<string, string> = {
  '追高': 'FOMO',
  '殺低': 'Panic',
  '貪婪': 'Greed',
  '過早獲利': 'Greed',
  '恐懼': 'Fear',
  '炒作': 'Hype',
  '跟風': 'Hype',
  '謠言': 'Rumor',
  '衝動': 'Impulse',
  '過度交易': 'Impulse',
  '賭徒謬誤': 'Risk',
  '錨定': 'Bias',
  '錨定效應': 'Bias',
  '處置效應': 'Bias',
};

// Shared Modal Container Style - Moved outside to fix TS error
const ModalContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-slate-800 border border-slate-600 rounded-3xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
       {children}
    </div>
  </div>
);

// Mini-Game Component for Loading State (Now a Modal)
const LoadingGame = ({ 
  onAnalysisDone, 
  loading 
}: { 
  onAnalysisDone: () => void, 
  loading: boolean 
}) => {
  const [bubbles, setBubbles] = useState<{id: number, x: number, text: string, speed: number, type: 'bad' | 'good'}[]>([]);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [duration, setDuration] = useState(0);
  const [topBias, setTopBias] = useState<string | null>(null);
  
  const startTimeRef = useRef<number>(Date.now());
  const biasCountsRef = useRef<Record<string, number>>({});
  const intervalRef = useRef<number | null>(null);

  // Stop game when loading finishes
  useEffect(() => {
    if (!loading && !showSummary) {
      const endTime = Date.now();
      const totalSeconds = Math.max(1, Math.floor((endTime - startTimeRef.current) / 1000));
      setDuration(totalSeconds);
      
      // Determine top bias
      let maxCount = 0;
      let maxBias = 'Bias';
      Object.entries(biasCountsRef.current).forEach(([key, val]) => {
        const count = val as number;
        if (count > maxCount) {
          maxCount = count;
          maxBias = key;
        }
      });
      setTopBias(maxBias);
      setShowSummary(true);
      
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [loading]);

  // Game Loop
  useEffect(() => {
    if (showSummary) return;

    intervalRef.current = window.setInterval(() => {
      const id = Date.now();
      
      // 70% chance to spawn a "Bad" bias bubble (Target), 30% chance for "Good" trait (Trap)
      const isBad = Math.random() > 0.3;
      
      let text = '';
      if (isBad) {
        const badTexts = Object.keys(BIAS_TIPS);
        text = badTexts[Math.floor(Math.random() * badTexts.length)];
      } else {
        const goodTexts = ['Logic', 'Plan', 'Data', 'Calm', 'Hold', 'Value', 'Patience'];
        text = goodTexts[Math.floor(Math.random() * goodTexts.length)];
      }

      const x = Math.random() * 70 + 15; // Keep away from extreme edges
      const speed = Math.random() * 0.4 + 0.3; 
      
      setBubbles(prev => [...prev, { id, x, text, speed, type: isBad ? 'bad' : 'good' }]);
    }, 1000); 
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [showSummary]);

  const handleBubbleClick = (id: number, type: 'bad' | 'good', text: string) => {
    if (showSummary) return;

    setBubbles(prev => prev.filter(b => b.id !== id));
    
    if (type === 'bad') {
      setScore(s => s + 1);
      // Track specific bias count
      biasCountsRef.current[text] = (biasCountsRef.current[text] || 0) + 1;
    } else {
      setScore(s => s - 1);
    }
  };

  // --- SUMMARY VIEW ---
  if (showSummary) {
    return (
      <ModalContainer>
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h3 className="text-2xl font-bold text-white">分析完成！</h3>
          <p className="text-slate-400 text-sm">數據已成功提取並存入資料庫</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
          <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">消除耗時</div>
            <div className="text-xl font-mono text-white font-bold">{duration}s</div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">淨化分數</div>
            <div className={`text-xl font-mono font-bold ${score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {score > 0 ? '+' : ''}{score}
            </div>
          </div>
        </div>

        {topBias && score > 0 && (
          <div className="bg-indigo-500/20 border border-indigo-500/30 p-4 rounded-xl max-w-sm mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-300 uppercase bg-indigo-900/50 px-2 py-0.5 rounded">
                  消除最多的干擾源：{topBias}
                </span>
              </div>
              <p className="text-sm text-indigo-100 font-medium leading-relaxed">
                {BIAS_TIPS[topBias]}
              </p>
          </div>
        )}

        <Button onClick={onAnalysisDone} className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 border-none shadow-lg shadow-emerald-900/20">
          關閉小遊戲
        </Button>
      </ModalContainer>
    );
  }

  // --- GAME VIEW ---
  return (
    <ModalContainer>
        {/* Header Text requested by user */}
        <div className="mb-4">
           <h3 className="text-white font-bold text-lg mb-1">分析需要一段時間</h3>
           <p className="text-indigo-300 text-sm">先玩玩小遊戲消磨時間吧！</p>
        </div>

        {/* Game Area */}
        <div className="w-full h-[320px] relative overflow-hidden bg-slate-900/50 rounded-xl border border-slate-700 shadow-inner">
            <style>{`
              @keyframes floatUp {
                0% { transform: translateY(200px); opacity: 0; }
                10% { opacity: 1; }
                100% { transform: translateY(-350px); opacity: 0; }
              }
            `}</style>
            
            <div className="z-20 flex flex-col items-center pointer-events-none absolute inset-0 justify-center">
                {/* Score Display */}
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col items-center min-w-[120px]">
                    <span className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold mb-1">已消除偏差</span>
                    <span className={`text-3xl font-mono font-bold tabular-nums transition-colors duration-300 ${score < 0 ? 'text-rose-400' : 'text-white'}`}>
                      {score}
                    </span>
                </div>
                
                {/* Instruction Text */}
                <p className="absolute bottom-4 text-[10px] font-bold text-amber-300 animate-pulse bg-slate-900/60 px-3 py-1 rounded-full border border-amber-500/30">
                   消除紅色的偏差氣泡 (+1)，保留綠色的優良特質 (-1)
                </p>
            </div>

            {/* Bubble Layer */}
            {bubbles.map(b => (
               <div 
                 key={b.id}
                 onMouseDown={() => handleBubbleClick(b.id, b.type, b.text)} 
                 className="absolute bottom-0 cursor-pointer select-none z-10 hover:scale-110 active:scale-95 transition-transform"
                 style={{ 
                   left: `${b.x}%`, 
                   animation: `floatUp ${5 / b.speed}s linear forwards` 
                 }}
                 onAnimationEnd={() => setBubbles(prev => prev.filter(item => item.id !== b.id))}
               >
                 <div className={`
                   backdrop-blur-md shadow-lg border px-5 py-2.5 rounded-full text-sm font-bold tracking-wide
                   ${b.type === 'bad' 
                     ? 'bg-rose-500/40 hover:bg-rose-500/80 border-rose-400 text-rose-50' 
                     : 'bg-emerald-500/40 hover:bg-emerald-500/80 border-emerald-400 text-emerald-50'}
                 `}>
                   {b.text}
                 </div>
               </div>
            ))}
        </div>
    </ModalContainer>
  );
};

export const HistoryUploadScreen: React.FC<HistoryUploadScreenProps> = ({ 
  existingTransactions, 
  onAddTransactions, 
  onNext, 
  onClose, 
  isModal = false 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Controls the Game View (Game + Summary)
  const [apiLoading, setApiLoading] = useState(false); // Controls the actual API state
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAnalysis = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setApiLoading(true);
    setError(null);

    try {
      const result = await analyzeBrokerageStatement(file);
      onAddTransactions(result.transactions);
      setFile(null); // Reset file input
      // Automatically expand the first new item if list was empty
      if (existingTransactions.length === 0 && result.transactions.length > 0) {
        setExpandedId(0);
      }
    } catch (err) {
      setError("無法讀取圖片或分析失敗，請確認圖片清晰度或網路連線。");
      // If error, force exit game mode immediately
      setIsAnalyzing(false); 
    } finally {
      setApiLoading(false); // API done, notify game to show summary
    }
  };

  const handleGameDone = () => {
    setIsAnalyzing(false); // Close game component, show list
  };

  const toggleExpand = (idx: number) => {
    setExpandedId(expandedId === idx ? null : idx);
  };

  // Logic for Statistics Panel
  const stats = useMemo(() => {
    if (!existingTransactions || existingTransactions.length === 0) return null;

    const counts: Record<string, number> = {};
    let totalBiases = 0;

    existingTransactions.forEach(tx => {
       if (tx.bias_tag && tx.bias_tag !== '無明顯偏差' && tx.bias_tag !== 'None') {
         counts[tx.bias_tag] = (counts[tx.bias_tag] || 0) + 1;
         totalBiases++;
       }
    });

    if (totalBiases === 0) return null;

    // Sort by count desc
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topBias = sorted.length > 0 ? sorted[0][0] : null;
    
    // Find matching advice
    let advice = "";
    if (topBias) {
       // Try direct match or mapped match
       let key = BIAS_TIPS[topBias] ? topBias : TAG_MAP[topBias];
       
       // Fallback for partial matches (e.g. "嚴重追高" -> contains "追高")
       if (!key) {
         for (const k in TAG_MAP) {
           if (topBias.includes(k)) {
             key = TAG_MAP[k];
             break;
           }
         }
       }
       
       if (key && BIAS_TIPS[key]) {
         advice = BIAS_TIPS[key];
       } else {
         advice = "保持紀律是克服心魔的關鍵。";
       }
    }

    return { counts: sorted, total: totalBiases, topBias, advice };
  }, [existingTransactions]);

  return (
    <div className={`w-full ${isModal ? 'h-full flex flex-col' : 'max-w-4xl mx-auto'}`}>
      <div className={`bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${isModal ? 'rounded-none h-full overflow-hidden flex flex-col' : 'rounded-3xl p-8 animate-in fade-in zoom-in-95 duration-500'}`}>
        
        {/* Header */}
        <div className={`${isModal ? 'p-6 border-b border-slate-100 flex justify-between items-center' : 'mb-8 text-center'}`}>
           {isModal ? (
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               📂 歷史交易資料庫 ({existingTransactions.length})
             </h2>
           ) : (
             <>
               <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                 <span className="text-2xl">🧬</span> 歷史行為分析
               </h2>
               <p className="text-slate-500 max-w-md mx-auto text-sm">
                 上傳交割單，系統將建立您的專屬行為資料庫。
               </p>
             </>
           )}
           
           {isModal && onClose && (
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
           )}
        </div>

        <div className={`flex-1 ${isModal ? 'overflow-hidden flex flex-col md:flex-row' : ''}`}>
          
          {/* LEFT/TOP: Upload Section */}
          <div className={`${isModal ? 'w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 overflow-y-auto' : 'mb-10'}`}>
             
             {isAnalyzing ? (
               // Placeholder when analyzing (Game is in Modal)
               <div className="h-[200px] border-2 border-dashed border-indigo-100 rounded-2xl flex flex-col items-center justify-center bg-white/50 text-slate-400">
                  <div className="animate-pulse flex flex-col items-center gap-3">
                     <div className="w-12 h-12 bg-indigo-100 rounded-full"></div>
                     <div className="h-4 w-32 bg-indigo-50 rounded"></div>
                     <p className="text-xs">正在分析...</p>
                  </div>
               </div>
             ) : (
               <>
                 {/* Upload Box */}
                 <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 bg-white hover:bg-indigo-50/30 transition-colors cursor-pointer relative text-center group min-h-[200px] flex flex-col items-center justify-center">
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center py-4">
                      <div className="bg-indigo-50 p-3 rounded-full mb-3 text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <span className={`text-sm font-medium ${file ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {file ? file.name : "點擊上傳交易明細檔案"}
                      </span>
                      {!file && <span className="text-xs text-slate-400 mt-1">支援 .jpg, .png, .pdf</span>}
                    </div>
                 </div>

                 {error && (
                   <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs">
                     {error}
                   </div>
                 )}

                 <Button 
                   onClick={handleAnalysis} 
                   disabled={!file}
                   className="w-full mt-4"
                   variant={file ? 'primary' : 'secondary'}
                 >
                   新增至資料庫
                 </Button>

                 {!isModal && onNext && existingTransactions.length > 0 && (
                   <div className="mt-8 pt-6 border-t border-slate-200">
                      <Button onClick={onNext} className="w-full" variant="primary">
                        完成並進入聊天
                      </Button>
                   </div>
                 )}

                 {!isModal && onNext && existingTransactions.length === 0 && (
                    <button 
                      onClick={onNext}
                      className="w-full mt-4 text-slate-400 text-sm hover:text-slate-600 transition-colors py-2"
                    >
                      暫時略過
                    </button>
                 )}

                 {/* Statistics Panel (Bottom Left) */}
                 {stats && (
                   <div className="mt-8 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                         偏差統計
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {stats.counts.map(([tag, count], idx) => (
                           <span key={tag} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                              idx === 0 
                              ? 'bg-rose-50 border-rose-200 text-rose-600' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                           }`}>
                              {tag} ({count})
                           </span>
                        ))}
                      </div>

                      {stats.advice && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 relative overflow-hidden">
                           <div className="absolute -right-2 -top-2 text-indigo-100 opacity-50 transform rotate-12">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                           </div>
                           <div className="relative z-10">
                              <span className="text-[10px] font-bold text-indigo-500 bg-white/50 px-2 py-0.5 rounded-full mb-2 inline-block">
                                 💡 獵人建議
                              </span>
                              <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                                 {stats.advice}
                              </p>
                           </div>
                        </div>
                      )}
                   </div>
                 )}
               </>
             )}
          </div>

          {/* RIGHT/BOTTOM: Database List */}
          <div className={`${isModal ? 'w-full md:w-2/3 p-0 bg-white overflow-y-auto' : ''}`}>
             
             {/* List Header */}
             <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-3 border-b border-slate-100 flex text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="w-1/4">日期/股號</div>
                <div className="w-1/4 text-right">交易行為</div>
                <div className="w-1/4 text-right">價格</div>
                <div className="w-1/4 text-right">診斷標籤</div>
             </div>

             {existingTransactions.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  <p>尚無交易資料</p>
                  <p className="text-xs mt-1">請從左側上傳圖片進行分析</p>
               </div>
             ) : (
               <div className="divide-y divide-slate-50">
                 {existingTransactions.map((tx, idx) => {
                   const isExpanded = expandedId === idx;
                   return (
                     <div key={idx} className="group bg-white transition-colors hover:bg-slate-50/50">
                        {/* Summary Row - Clickable */}
                        <div 
                          onClick={() => toggleExpand(idx)}
                          className="px-6 py-4 flex items-center cursor-pointer select-none"
                        >
                          <div className="w-1/4 flex flex-col">
                             <span className="font-mono text-xs text-slate-400">{tx.date}</span>
                             <span className="font-bold text-slate-700">{tx.symbol}</span>
                          </div>
                          
                          <div className="w-1/4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${tx.action === 'Buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                               {tx.action === 'Buy' ? '買入' : '賣出'}
                            </span>
                          </div>

                          <div className="w-1/4 text-right font-mono text-sm text-slate-600">
                             {tx.price.toLocaleString()}
                          </div>

                          <div className="w-1/4 flex justify-end gap-2 items-center">
                             {tx.bias_tag && (
                               <span className="hidden sm:inline-block text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 truncate max-w-[80px]">
                                 {tx.bias_tag}
                               </span>
                             )}
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                               <polyline points="6 9 12 15 18 9"></polyline>
                             </svg>
                          </div>
                        </div>

                        {/* Accordion Content */}
                        <div 
                           className={`overflow-hidden transition-all duration-300 ease-in-out bg-slate-50/80 ${isExpanded ? 'max-h-[500px] opacity-100 border-b border-indigo-100' : 'max-h-0 opacity-0'}`}
                        >
                           <div className="p-6 grid gap-4 text-sm">
                              <div className="flex gap-4">
                                 <div className="w-1/2">
                                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">當時市場背景</span>
                                   <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                     {tx.market_context}
                                   </p>
                                 </div>
                                 <div className="w-1/2">
                                   <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">行為診斷</span>
                                   <p className="text-indigo-900 leading-relaxed bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 font-medium">
                                     {tx.behavior_diagnosis}
                                   </p>
                                 </div>
                              </div>
                              {tx.bias_tag && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                   <span className="text-xs text-slate-400">偵測偏差：</span>
                                   <span className="text-rose-600 font-bold text-sm flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                      {tx.bias_tag}
                                   </span>
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>

        </div>

      </div>

      {/* Render Game Modal Separately */}
      {isAnalyzing && (
        <LoadingGame 
          loading={apiLoading}
          onAnalysisDone={handleGameDone}
        />
      )}
    </div>
  );
};