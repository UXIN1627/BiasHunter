
import { Question, OptionType, UserChoice, ClassificationResult, UserProfileType } from '../types';

/**
 * GENERATE NEXT QUESTION
 * Implements the Hybrid Behavioral Assessment (12 Questions)
 * Q1-Q6: Loss Aversion (50/50)
 * Q7-Q9: Probability Weighting (Low Prob)
 * Q10-Q12: Certainty Effect (High Prob)
 */
export const generateQuestion = (
  questionNumber: number,
  history: UserChoice[]
): Question => {
  const lastChoice = history[history.length - 1];

  // --- Q1 - Q6: CORE LOSS AVERSION TEST ---
  if (questionNumber <= 6) {
    if (questionNumber === 1) {
      return {
        id: 1,
        text: `第 1 題 / 共 12 題\n您傾向哪一個選項？`,
        optionA: {
          type: OptionType.LOTTERY,
          params: { gain: 5000, loss: 5000, probability: 0.5 }
        },
        optionB: {
          type: OptionType.SURE_THING,
          amount: 0
        }
      };
    }

    // Adaptive Logic for Q2-Q6
    let prevGain = 5000;
    let prevLoss = 5000;
    
    if (lastChoice && lastChoice.lotteryParams) {
      prevGain = lastChoice.lotteryParams.gain;
      prevLoss = lastChoice.lotteryParams.loss;
    }

    let nextGain = prevGain;
    let nextLoss = prevLoss;
    const step = 4000 / (questionNumber * 1.2); 

    if (lastChoice.chosenOption === 'A') {
      // Risk Seeking: Increase Loss to find breaking point
      nextLoss = Math.min(10000, prevLoss + step);
    } else {
      // Risk Averse: Decrease Loss to tempt them
      nextLoss = Math.max(0, prevLoss - step);
    }

    nextGain = Math.round(nextGain / 50) * 50;
    nextLoss = Math.round(nextLoss / 50) * 50;

    return {
      id: questionNumber,
      text: `第 ${questionNumber} 題 / 共 12 題\n您傾向哪一個選項？`,
      optionA: {
        type: OptionType.LOTTERY,
        params: { gain: nextGain, loss: nextLoss, probability: 0.5 }
      },
      optionB: {
        type: OptionType.SURE_THING,
        amount: 0
      }
    };
  }

  // --- Q7 - Q9: THE "LOTTERY" TEST (Low Probability) ---
  if (questionNumber <= 9) {
    if (questionNumber === 7) {
      return {
        id: 7,
        text: `第 7 題 / 共 12 題 (概率變更)\n現在概率發生了變化。您傾向哪一個選項？`,
        optionA: {
          type: OptionType.LOTTERY,
          params: { gain: 20000, loss: 0, probability: 0.05 } // EV = 1000
        },
        optionB: {
          type: OptionType.SURE_THING,
          amount: 800 // Sure 800
        }
      };
    }

    // Q8 logic based on Q7
    if (questionNumber === 8) {
       const q7Choice = history.find(h => h.questionId === 7);
       if (q7Choice?.chosenOption === 'A') {
          // Gambler path: Offer extreme longshot
          return {
             id: 8,
             text: `第 8 題 / 共 12 題\n您傾向哪一個選項？`,
             optionA: { type: OptionType.LOTTERY, params: { gain: 50000, loss: 0, probability: 0.01 } }, // EV 500
             optionB: { type: OptionType.SURE_THING, amount: 600 }
          };
       } else {
          // Safe path: Make lottery more likely
          return {
             id: 8,
             text: `第 8 題 / 共 12 題\n您傾向哪一個選項？`,
             optionA: { type: OptionType.LOTTERY, params: { gain: 10000, loss: 0, probability: 0.10 } }, // EV 1000
             optionB: { type: OptionType.SURE_THING, amount: 900 }
          };
       }
    }

    // Q9 logic - Triangulation
    return {
      id: 9,
      text: `第 9 題 / 共 12 題\n您傾向哪一個選項？`,
      optionA: { type: OptionType.LOTTERY, params: { gain: 25000, loss: 0, probability: 0.04 } }, // EV 1000
      optionB: { type: OptionType.SURE_THING, amount: 950 }
    };
  }

  // --- Q10 - Q12: THE "CERTAINTY" TEST (High Probability) ---
  if (questionNumber <= 12) {
    if (questionNumber === 10) {
      return {
        id: 10,
        text: `第 10 題 / 共 12 題\n您傾向哪一個選項？`,
        optionA: {
          type: OptionType.LOTTERY,
          params: { gain: 10000, loss: 0, probability: 0.95 } // EV 9500
        },
        optionB: {
          type: OptionType.SURE_THING,
          amount: 8500
        }
      };
    }

    // Q11 based on Q10
    if (questionNumber === 11) {
       const q10Choice = history.find(h => h.questionId === 10);
       if (q10Choice?.chosenOption === 'B') {
          // Certainty Bias: Offer practically free money to break them
          return {
             id: 11,
             text: `第 11 題 / 共 12 題\n您傾向哪一個選項？`,
             optionA: { type: OptionType.LOTTERY, params: { gain: 10000, loss: 0, probability: 0.98 } }, // EV 9800
             optionB: { type: OptionType.SURE_THING, amount: 8000 }
          };
       } else {
          // Rational: Test their limits
          return {
             id: 11,
             text: `第 11 題 / 共 12 題\n您傾向哪一個選項？`,
             optionA: { type: OptionType.LOTTERY, params: { gain: 10000, loss: 0, probability: 0.90 } }, // EV 9000
             optionB: { type: OptionType.SURE_THING, amount: 8800 }
          };
       }
    }

    // Q12 Final
    return {
      id: 12,
      text: `第 12 題 / 共 12 題\n您傾向哪一個選項？`,
      optionA: { type: OptionType.LOTTERY, params: { gain: 10000, loss: 0, probability: 0.99 } }, // EV 9900
      optionB: { type: OptionType.SURE_THING, amount: 7500 }
    };
  }

  throw new Error("Experiment out of bounds");
};

/**
 * CALCULATE CUMULATIVE SCORE
 * Simulates outcomes for lotteries and adds sure amounts
 */
export const calculateCumulativeScore = (history: UserChoice[], initialEndowment: number): number => {
  let score = initialEndowment;
  
  history.forEach(choice => {
    if (choice.wasLottery && choice.lotteryParams) {
      // Simulate lottery outcome
      const roll = Math.random();
      if (roll <= choice.lotteryParams.probability) {
        score += choice.lotteryParams.gain;
      } else {
        score -= choice.lotteryParams.loss;
      }
    } else {
      score += choice.sureAmount;
    }
  });
  
  return score;
};

/**
 * CLASSIFY USER
 * Hybrid scoring based on 3 dimensions
 */
export const classifyUser = (history: UserChoice[]): ClassificationResult => {
  // 1. Loss Tolerance (Q1-Q6)
  const lossQuestions = history.filter(h => h.questionId <= 6);
  const gamblesAccepted = lossQuestions.filter(h => h.chosenOption === 'A').length;
  const lossTolerance = gamblesAccepted >= 3 ? 'Low' : 'High'; 
  const isLossTolerant = gamblesAccepted >= 3;

  // 2. Lottery Seeking (Q7-Q9) - Do they overweight small probs?
  const lotteryQuestions = history.filter(h => h.questionId >= 7 && h.questionId <= 9);
  const lotteriesPicked = lotteryQuestions.filter(h => h.chosenOption === 'A').length;
  const isLotterySeeker = lotteriesPicked >= 2;

  // 3. Certainty Bias (Q10-Q12) - Do they underweight high probs (fear the 1% fail)?
  const certaintyQuestions = history.filter(h => h.questionId >= 10 && h.questionId <= 12);
  const sureThingsPicked = certaintyQuestions.filter(h => h.chosenOption === 'B').length;
  const hasCertaintyBias = sureThingsPicked >= 2;

  // Determine Type
  // Adventurer (Maverick): High Loss Tolerance OR High Lottery Seeking (loves risk/longshots)
  // Sentinel: Low Loss Tolerance OR High Certainty Bias (fears loss/failure)
  let type: UserProfileType = 'The Sentinel';
  
  // Scoring Algorithm
  let maverickScore = 0;
  if (isLossTolerant) maverickScore++;
  if (isLotterySeeker) maverickScore += 1.5; // Strong indicator
  if (!hasCertaintyBias) maverickScore++;

  if (maverickScore >= 2) {
    type = 'The Adventurer';
  } else {
    type = 'The Sentinel';
  }

  // Text Generation
  let summary = '';
  if (type === 'The Adventurer') {
    summary = '您是「冒險家 (The Adventurer)」。您表現出對損失的高承受能力，並傾向於追求「長線 (Long shot)」機會。您對不確定性感到自在，專注於潛在的上行空間，而不是保護下行風險。';
  } else {
    summary = '您是「哨兵 (The Sentinel)」。您優先考慮確定性和安全性。您傾向於付出溢價來消除風險並避免後悔。您更喜歡穩定、可預測的結果，而不是波動的機會。';
  }

  return {
    module: "Hybrid_DOSE_Assessment",
    total_questions: 12,
    user_type: type,
    traits: {
      loss_aversion: isLossTolerant ? 'Low' : 'High',
      probability_weighting: isLotterySeeker ? 'Overweights Small Prob' : (hasCertaintyBias ? 'Underweights High Prob' : 'Rational')
    },
    summary
  };
};
