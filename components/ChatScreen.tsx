
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { BIAS_HUNTER_SYSTEM_PROMPT } from '../constants';
import { Button } from './Button';
import { AnalyzedTransaction, UserProfileType, ChatMessage, QuizData } from '../types';

interface ChatScreenProps {
  userType: UserProfileType;
  transactions: AnalyzedTransaction[];
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onOpenHistory: () => void;
}

type EmotionalState = 'Balanced (平衡)' | 'Overheated (過熱)' | 'Anxious (焦慮)';

export const ChatScreen: React.FC<ChatScreenProps> = ({ 
  userType, 
  transactions, 
  messages, 
  onUpdateMessages, 
  onOpenHistory
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate "Current State" based on recent transaction tags
  const currentState: EmotionalState = useMemo(() => {
    if (transactions.length === 0) return 'Balanced (平衡)';
    
    // NOTE: App.tsx now ensures transactions are sorted by date DESC (newest first).
    // So slice(0, 5) gives us the 5 most recent transactions chronologically.
    const recent = transactions.slice(0, 5);
    
    let heatScore = 0;
    recent.forEach(t => {
      const tag = t.bias_tag || '';
      if (tag.includes('追高') || tag.includes('衝動') || tag.includes('過度交易') || tag.includes('貪婪')) {
        heatScore += 1;
      } else if (tag.includes('殺低') || tag.includes('恐慌') || tag.includes('恐懼') || tag.includes('不敢')) {
        heatScore -= 1;
      }
    });
    if (heatScore >= 2) return 'Overheated (過熱)';
    if (heatScore <= -2) return 'Anxious (焦慮)';
    return 'Balanced (平衡)';
  }, [transactions]);

  // Initialize Chat Session
  useEffect(() => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key not found");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const historyStr = transactions.length > 0 
        ? JSON.stringify(transactions.map(t => ({
            date: t.date,
            symbol: t.symbol,
            action: t.action,
            bias: t.bias_tag
          }))) 
        : "No history available.";

      let systemInstruction = BIAS_HUNTER_SYSTEM_PROMPT.replace(/{{USER_TYPE}}/g, userType);
      systemInstruction = systemInstruction.replace(/{{CURRENT_STATE}}/g, currentState);
      systemInstruction = systemInstruction.replace('{{HISTORY_DATA}}', historyStr);
      
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }]
        },
      });
      
      setChatSession(chat);
      
      // Initial greeting logic - only if no messages exist
      if (messages.length === 0) {
        const userRoleName = userType === 'The Sentinel' ? '「哨兵 (The Sentinel)」' : '「冒險家 (The Adventurer)」';
        
        let greeting = `### 🟢 投資審計程序已啟動\n我是您的專屬投資審計員 (Bias Hunter)。\n\n**核心人格：** ${userRoleName}\n**當前狀態：** ${currentState}`;
        
        if (transactions.length > 0) {
           greeting += `\n\n已載入 **${transactions.length} 筆**歷史交易紀錄。系統偵測到您的心理狀態目前為 **${currentState}**，我將據此動態調整風險控管的強度與建議語氣。`;
        } else {
           greeting += `\n\n目前尚未載入歷史數據，我將以標準模式為您服務。`;
        }

        greeting += `\n\n**您可以試著告訴我您的交易計劃，例如：**\n` +
                    `*   「我想在 130 買進 NVDA，因為財報預期很好...」\n` +
                    `*   「TSLA 跌破支撐了，我該現在認賠賣出嗎？」\n` +
                    `*   「現在市場是否過熱？請幫我檢查。」\n\n` +
                    `或者，點擊下方 **「新聞過濾」** 按鈕，讓我幫您過濾市場雜訊，避免決策受情緒干擾。`;

        onUpdateMessages([{
          role: 'model',
          text: greeting
        }]);
      }

    } catch (error) {
      console.error("Failed to init chat", error);
      if (messages.length === 0) {
         onUpdateMessages([{ role: 'model', text: '系統初始化失敗：缺少 API 金鑰。', isError: true }]);
      }
    }
  }, [userType, transactions, currentState, onUpdateMessages, messages.length]); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent, overrideMsg?: string) => {
    if (e) e.preventDefault();
    const msgToSend = overrideMsg || input.trim();
    
    if (!msgToSend || !chatSession || isLoading) return;

    if (!overrideMsg) setInput('');
    
    const newUserMsg: ChatMessage = { role: 'user', text: msgToSend };
    onUpdateMessages([...messages, newUserMsg]);
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: msgToSend });
      let responseText = result.text || "無法生成回應。";
      let quizData: QuizData | undefined;

      const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
      const match = responseText.match(jsonBlockRegex);
      
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.module === "News_Quiz") {
             quizData = parsed as QuizData;
             responseText = responseText.replace(match[0], '').trim();
          } else {
             responseText = responseText.replace(match[0], '').trim();
          }
        } catch (e) {
          console.warn("Failed to parse JSON response", e);
        }
      }
      
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: Array<{ uri: string; title: string }> = [];
      if (groundingChunks) {
        groundingChunks.forEach(chunk => {
          if (chunk.web?.uri && chunk.web?.title) {
            sources.push({ uri: chunk.web.uri, title: chunk.web.title });
          }
        });
      }

      const newModelMsg: ChatMessage = { 
        role: 'model', 
        text: responseText,
        groundingSources: sources.length > 0 ? sources : undefined,
        quizData: quizData
      };
      
      onUpdateMessages([...messages, newUserMsg, newModelMsg]);

    } catch (error) {
      console.error("Chat error", error);
      onUpdateMessages([...messages, newUserMsg, { role: 'model', text: "連線錯誤，請稍後再試。", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewsFilterClick = () => {
    setInput('[新聞過濾] 請幫我分析這則新聞：');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleDailyPushClick = () => {
    handleSend({ preventDefault: () => {} } as React.FormEvent, '[智能推播] 請提供今日適合我的 3 則新聞');
  };

  const handleQuizOptionClick = (label: string, text: string) => {
     handleSend({ preventDefault: () => {} } as React.FormEvent, `我選擇答案 ${label}：${text}`);
  };

  const renderContent = (text: string) => {
    const processBold = (content: string) => {
      const parts = content.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`b-${index}`} className="text-indigo-600 font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={`t-${index}`}>{part}</span>;
      });
    };

    return text.split('\n').map((line, i) => {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        const [_, linkText, linkUrl] = match;
        const index = match.index;
        if (index > lastIndex) elements.push(...processBold(line.slice(lastIndex, index)));
        elements.push(
          <a key={`link-${i}-${index}`} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors">
            {linkText}
          </a>
        );
        lastIndex = linkRegex.lastIndex;
      }
      if (lastIndex < line.length) elements.push(...processBold(line.slice(lastIndex)));
      if (elements.length === 0 && line.length === 0) return <div key={i} className="h-4" />;
      
      return <p key={i} className="mb-2 leading-relaxed whitespace-pre-wrap break-words">{elements.length > 0 ? elements : <span className="invisible">.</span>}</p>;
    });
  };

  const getStateColor = (state: EmotionalState) => {
    if (state.includes('過熱')) return 'bg-rose-100 text-rose-600 border-rose-200';
    if (state.includes('焦慮')) return 'bg-amber-100 text-amber-600 border-amber-200';
    return 'bg-emerald-100 text-emerald-600 border-emerald-200';
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-[600px] flex flex-col bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-500 relative z-0">
      
      <div className="bg-white/50 p-4 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">BH</div>
          <div>
            <span className="font-bold text-slate-800 block leading-tight">BIAS HUNTER</span>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                 {userType === 'The Sentinel' ? '哨兵' : '冒險家'}
               </span>
               <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getStateColor(currentState)}`}>
                 {currentState}
               </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
          >
            <span>📜</span>
            <span>資料庫</span>
            <span className="bg-slate-100 text-slate-500 px-1.5 rounded-md">{transactions.length}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-slate-800 text-white rounded-tr-none' 
                : 'bg-white border border-white/80 text-slate-700 rounded-tl-none'
            } ${msg.isError ? 'border-rose-200 bg-rose-50 text-rose-700' : ''}`}>
              <div className={`text-base ${msg.role === 'user' ? 'text-slate-100' : ''}`}>
                {renderContent(msg.text)}
              </div>
              
              {msg.quizData && (
                 <div className="mt-6 pt-4 border-t border-slate-100 animate-in fade-in duration-700">
                    <div className="flex items-center gap-2 mb-3">
                       <span className="bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                         🎯 現實檢測 (Reality Check)
                       </span>
                    </div>
                    <p className="font-bold text-slate-800 mb-4">{msg.quizData.question}</p>
                    <div className="space-y-3">
                       {msg.quizData.options.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => handleQuizOptionClick(opt.label, opt.text)}
                            className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-start gap-3 group"
                          >
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                               {opt.label}
                             </span>
                             <span className="text-sm text-slate-600 group-hover:text-slate-800 font-medium">
                               {opt.text}
                             </span>
                          </button>
                       ))}
                    </div>
                 </div>
              )}

              {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">資料來源：</div>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingSources.slice(0, 3).map((source, sIdx) => (
                      <a key={sIdx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-100 hover:bg-slate-200 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors truncate max-w-[200px] border border-slate-200">
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-white/80 shadow-sm rounded-2xl rounded-tl-none p-4 flex items-center space-x-2">
               <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
               <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
               <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pt-2 bg-white/60 backdrop-blur-md flex gap-2">
         <button 
           onClick={handleNewsFilterClick}
           className="text-xs font-bold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
         >
            <span>📰</span>
            新聞過濾
         </button>
         <button 
           onClick={handleDailyPushClick}
           className="text-xs font-bold text-slate-500 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-300 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
         >
            <span>🔔</span>
            智能推播
         </button>
      </div>

      <form onSubmit={(e) => handleSend(e)} className="p-4 bg-white/60 border-t border-slate-100 backdrop-blur-md flex gap-4">
        <input 
          ref={inputRef}
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入您的交易想法，或貼上新聞連結..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
          disabled={isLoading}
        />
        <Button type="submit" disabled={!input || isLoading} className="px-6 rounded-xl">
          發送
        </Button>
      </form>
    </div>
  );
};
