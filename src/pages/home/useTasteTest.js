import { useEffect, useState } from 'react';
import {
  getRandomTasteQuestions,
  getTasteProfile,
  getTasteRecommendations,
} from '../../data/tasteTest';

export default function useTasteTest({ onComplete, works }) {
  const [tasteQuestionSet, setTasteQuestionSet] = useState(() => getRandomTasteQuestions());
  const [tasteAnswers, setTasteAnswers] = useState({});
  const isTasteComplete = Object.keys(tasteAnswers).length === tasteQuestionSet.length;
  const tasteProfile = isTasteComplete ? getTasteProfile(tasteAnswers, tasteQuestionSet) : null;
  const tasteRecommendations = getTasteRecommendations(works, tasteProfile);

  useEffect(() => {
    if (!isTasteComplete || !tasteProfile) return;
    onComplete?.(tasteProfile);
  }, [isTasteComplete, onComplete, tasteProfile]);

  const updateTasteAnswer = (questionId, optionIndex) => {
    setTasteAnswers(answer => ({ ...answer, [questionId]: optionIndex }));
  };

  const resetTasteTest = () => {
    setTasteAnswers({});
    setTasteQuestionSet(getRandomTasteQuestions());
  };

  return {
    resetTasteTest,
    tasteAnswers,
    tasteProfile,
    tasteQuestionSet,
    tasteRecommendations,
    updateTasteAnswer,
  };
}
