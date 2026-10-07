import React, { useEffect, useRef } from 'react';

interface ScoreCounterProps {
  value: number;
  className?: string;
}

const ScoreCounter: React.FC<ScoreCounterProps> = ({ value, className = '' }) => {
  const prevRef = useRef(value);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prevRef.current !== value && spanRef.current) {
      spanRef.current.classList.remove('animate-scorePop');
      void spanRef.current.offsetWidth;
      spanRef.current.classList.add('animate-scorePop');
    }
    prevRef.current = value;
  }, [value]);

  return (
    <span
      ref={spanRef}
      className={`font-mono text-3xl font-bold text-success-500 ${className}`}
    >
      {value}
    </span>
  );
};

export default ScoreCounter;
