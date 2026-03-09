
import React, { useState, useEffect } from 'react';
import { ExperimentPhase, UserChoice, Question, ClassificationResult, AnalyzedTransaction, ChatMessage } from './types';
import { INITIAL_ENDOWMENT, APP_TITLE, APP_MODULE, TOTAL_QUESTIONS } from './constants';
import { generateQuestion, classifyUser, calculateCumulativeScore } from './services/doseService';
import { IntroScreen } from './components/IntroScreen';
import { OptionCard } from './components/OptionCard';
import { ResultsScreen } from './components/ResultsScreen';
import { ChatScreen } from './components/ChatScreen';
import { HistoryUploadScreen } from './components/HistoryUploadScreen';

const STORAGE_KEY = 'bias_hunter_v1_data';

const App: React.FC = () => {
  // --- States ---
  const [phase, setPhase] = useState<ExperimentPhase>(ExperimentPhase.INTRO);
  const [currentQNum, setCurrentQNum] = useState(1);
  const [history, setHistory] = useState<UserChoice[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [finalScore, setFinalScore] = useState<number>(INITIAL_ENDOWMENT);
  const [transactions, setTransactions] = useState<AnalyzedTransaction[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Persistence Logic: Load ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPhase(parsed.phase || ExperimentPhase.INTRO);
        setCurrentQNum(parsed.currentQNum || 1);
        setHistory(parsed.history || []);
        setResult(parsed.result || null);
        setFinalScore(parsed.finalScore || INITIAL_ENDOWMENT);
        // Ensure loaded transactions are also sorted (for safety/migration)
        const loadedTxs = parsed.transactions || [];
        setTransactions([...loadedTxs].sort((a, b) => b.date.localeCompare(a.date)));
        setChatHistory(parsed.chatHistory || []);
      } catch (e) {
        console.error("Failed to load persistence data", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // --- Persistence Logic: Save ---
  useEffect(() => {
    if (!isInitialized) return;

    const dataToSave = {
      phase,
      currentQNum,
      history,
      result,
      finalScore,
      transactions,
      chatHistory
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [phase, currentQNum, history, result, finalScore, transactions, chatHistory, isInitialized]);

  // --- Question Management ---
  useEffect(() => {
    if (phase === ExperimentPhase.EXPERIMENT && isInitialized) {
      const q = generateQuestion(currentQNum, history);
      setCurrentQuestion(q);
    }
  }, [phase, currentQNum, isInitialized]);

  const handleChoice = (option: 'A' | 'B') => {
    if (!currentQuestion) return;

    const chosenObj = option === 'A' ? currentQuestion.optionA : currentQuestion.optionB;
    
    const choice: UserChoice = {
      questionId: currentQNum,
      chosenOption: option,
      wasLottery: chosenObj.type === 'LOTTERY',
      lotteryParams: chosenObj.params,
      sureAmount: chosenObj.amount || 0
    };

    const newHistory = [...history, choice];
    setHistory(newHistory);

    if (currentQNum >= TOTAL_QUESTIONS) {
      const classification = classifyUser(newHistory);
      const score = calculateCumulativeScore(newHistory, INITIAL_ENDOWMENT);
      
      setResult(classification);
      setFinalScore(score);
      setPhase(ExperimentPhase.RESULTS);
    } else {
      const nextQNum = currentQNum + 1;
      setCurrentQNum(nextQNum);
    }
  };

  const handleRestart = () => {
    if (window.confirm("確定要重設所有資料嗎？這將會清空您的測驗結果、交易資料庫以及聊天內容。")) {
      localStorage.removeItem(STORAGE_KEY);
      setPhase(ExperimentPhase.INTRO);
      setCurrentQNum(1);
      setHistory([]);
      setCurrentQuestion(null);
      setResult(null);
      setFinalScore(INITIAL_ENDOWMENT);
      setTransactions([]);
      setChatHistory([]);
    }
  };

  const handleAddTransactions = (newTxs: AnalyzedTransaction[]) => {
    setTransactions(prev => {
      const merged = [...prev, ...newTxs];
      // Automatically sort by date DESC (newest date first)
      return merged.sort((a, b) => b.date.localeCompare(a.date));
    });
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const progressPercent = ((currentQNum - 1) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-indigo-200">
      
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
            <h1 className="font-bold text-slate-800 tracking-tight">{APP_TITLE}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-slate-500 bg-slate-100/80 px-2 py-1 rounded">
              {APP_MODULE}
            </div>
            <button 
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-100 bg-white/50 hover:bg-rose-50/30 rounded-md transition-all duration-200 group"
              title="重設所有資料與進度"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              <span>重置進度</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative">
        
        {phase === ExperimentPhase.INTRO && (
          <IntroScreen onStart={() => setPhase(ExperimentPhase.EXPERIMENT)} />
        )}

        {phase === ExperimentPhase.EXPERIMENT && currentQuestion && (
          <div className="w-full max-w-5xl">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6 animate-in fade-in duration-700">
              <div className="bg-white/40 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/60 shadow-sm min-w-[220px]">
                <div className="flex items-baseline gap-3 mb-1">
                   <span className="text-xs text-slate-500 font-bold tracking-wider uppercase">起始點數</span>
                   <span className="text-2xl font-mono text-slate-700 font-bold tracking-tight">
                     {INITIAL_ENDOWMENT.toLocaleString()}
                   </span>
                   <span className="text-xs text-slate-400 font-normal">pts</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">
                  最終點數會在所有決策題目結束後一併計算
                </div>
              </div>

              <div className="flex flex-col justify-end w-full md:w-1/3 pb-1">
                <div className="flex justify-between text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                  <span>決策進度</span>
                  <span>{currentQNum} / {TOTAL_QUESTIONS}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-700 ease-out shadow-sm"
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div key={currentQNum} className="animate-fade-slide-up">
              <div className="text-center mb-10">
                 <h2 className="text-3xl md:text-4xl text-slate-800 font-bold leading-relaxed tracking-tight">
                  您更偏好以下哪個選項？
                 </h2>
                 <p className="text-slate-500 mt-3 text-base">請依照您的直覺進行選擇，無須過度分析。</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                  <OptionCard 
                    label="選項 A"
                    type={currentQuestion.optionA.type}
                    params={currentQuestion.optionA.params}
                    amount={currentQuestion.optionA.amount}
                    onClick={() => handleChoice('A')}
                  />
                  <OptionCard 
                    label="選項 B"
                    type={currentQuestion.optionB.type}
                    params={currentQuestion.optionB.params}
                    amount={currentQuestion.optionB.amount}
                    onClick={() => handleChoice('B')}
                  />
              </div>
            </div>
          </div>
        )}

        {phase === ExperimentPhase.RESULTS && result && (
          <ResultsScreen 
            result={result} 
            finalScore={finalScore}
            onContinue={() => setPhase(ExperimentPhase.HISTORY_SCAN)}
            onRestart={handleRestart}
          />
        )}

        {phase === ExperimentPhase.HISTORY_SCAN && (
          <HistoryUploadScreen 
            existingTransactions={transactions}
            onAddTransactions={handleAddTransactions}
            onNext={() => setPhase(ExperimentPhase.CHAT)}
          />
        )}

        {phase === ExperimentPhase.CHAT && result && (
          <ChatScreen 
            userType={result.user_type}
            transactions={transactions}
            messages={chatHistory}
            onUpdateMessages={setChatHistory}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
          />
        )}

      </main>

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
              <HistoryUploadScreen 
                existingTransactions={transactions}
                onAddTransactions={handleAddTransactions}
                onClose={() => setIsHistoryModalOpen(false)}
                isModal={true}
              />
           </div>
        </div>
      )}

    </div>
  );
};

export default App;
