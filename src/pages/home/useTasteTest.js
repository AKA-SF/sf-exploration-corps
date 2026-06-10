import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getRandomTasteQuestions,
  getTasteProfile,
  getTasteRecommendations,
} from '../../data/tasteTest';

export default function useTasteTest({ onComplete, works }) {
  const [tasteQuestionSet, setTasteQuestionSet] = useState(() => getRandomTasteQuestions());
  const [tasteAnswers, setTasteAnswers] = useState({});
  const completedSignalRef = useRef('');
  const isTasteComplete = Object.keys(tasteAnswers).length === tasteQuestionSet.length;
  const tasteProfile = useMemo(() => (
    isTasteComplete ? getTasteProfile(tasteAnswers, tasteQuestionSet) : null
  ), [isTasteComplete, tasteAnswers, tasteQuestionSet]);
  const tasteRecommendations = useMemo(() => (
    getTasteRecommendations(works, tasteProfile)
  ), [tasteProfile, works]);

  useEffect(() => {
    if (!isTasteComplete || !tasteProfile) return;
    const signalKey = `${tasteProfile.code}:${tasteQuestionSet.map(question => question.id).join(',')}`;
    if (completedSignalRef.current === signalKey) return;
    completedSignalRef.current = signalKey;
    onComplete?.(tasteProfile);
  }, [isTasteComplete, onComplete, tasteProfile, tasteQuestionSet]);

  const updateTasteAnswer = (questionId, optionIndex) => {
    setTasteAnswers(answer => ({ ...answer, [questionId]: optionIndex }));
  };

  const resetTasteTest = () => {
    completedSignalRef.current = '';
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
