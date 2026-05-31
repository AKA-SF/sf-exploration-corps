import { useRef, useState } from 'react';

export default function useConceptDictionary({
  activeConceptCode,
  concepts,
  onConceptRead,
  randomConceptCodes,
  setActiveConceptCode,
}) {
  const [showAllConcepts, setShowAllConcepts] = useState(false);
  const [conceptReadingMode, setConceptReadingMode] = useState(false);
  const conceptFeatureRef = useRef(null);
  const orderedConcepts = [
    ...randomConceptCodes.map(code => concepts.find(concept => concept.code === code)).filter(Boolean),
    ...concepts.filter(concept => !randomConceptCodes.includes(concept.code)),
  ];
  const selectedConcept = orderedConcepts.find(concept => concept.code === activeConceptCode) ?? orderedConcepts[0];
  const visibleConcepts = showAllConcepts ? orderedConcepts : orderedConcepts.slice(0, 6);

  const selectConcept = code => {
    setActiveConceptCode(code);
    const concept = concepts.find(entry => entry.code === code);
    onConceptRead?.(code, concept);

    if (showAllConcepts) {
      requestAnimationFrame(() => {
        conceptFeatureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  return {
    conceptFeatureRef,
    conceptReadingMode,
    selectConcept,
    selectedConcept,
    setConceptReadingMode,
    setShowAllConcepts,
    showAllConcepts,
    visibleConcepts,
  };
}
