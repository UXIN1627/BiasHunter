
export enum ExperimentPhase {
  INTRO = 'INTRO',
  EXPERIMENT = 'EXPERIMENT',
  RESULTS = 'RESULTS',
  HISTORY_SCAN = 'HISTORY_SCAN',
  CHAT = 'CHAT'
}

export enum OptionType {
  LOTTERY = 'LOTTERY',
  SURE_THING = 'SURE_THING'
}

export interface LotteryParams {
  gain: number;
  loss: number;
  probability: number; // 0.0 to 1.0 (e.g. 0.05 for 5%)
}

export interface Question {
  id: number;
  text: string;
  optionA: {
    type: OptionType;
    params?: LotteryParams; // If Lottery
    amount?: number; // If Sure Thing
  };
  optionB: {
    type: OptionType;
    params?: LotteryParams; 
    amount: number; // Usually 0 or a sure gain/loss
  };
}

export interface UserChoice {
  questionId: number;
  chosenOption: 'A' | 'B';
  wasLottery: boolean;
  lotteryParams?: LotteryParams;
  sureAmount: number;
}

// Updated User Types
export type UserProfileType = 'The Sentinel' | 'The Adventurer';

export interface ClassificationResult {
  module: string;
  total_questions: number;
  user_type: UserProfileType;
  traits: {
    loss_aversion: 'High' | 'Low';
    probability_weighting: 'Overweights Small Prob' | 'Underweights High Prob' | 'Rational';
  };
  summary: string;
}

export interface AnalyzedTransaction {
  date: string;
  symbol: string;
  action: 'Buy' | 'Sell';
  price: number;
  market_context: string;
  behavior_diagnosis: string;
  bias_tag: string;
}

export interface HistoryAnalysisResult {
  module: string;
  data_source: string;
  transactions: AnalyzedTransaction[];
  behavioral_summary: {
    win_loss_tilt: string;
    risk_appetite: string;
  };
  dominant_biases: string[];
}

// New Chat related types
export interface QuizData {
  module: string;
  question: string;
  options: { label: string; text: string }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  groundingSources?: Array<{ uri: string; title: string }>;
  quizData?: QuizData;
}
