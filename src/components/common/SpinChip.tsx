import React from 'react';
import { getPocketColor } from '../../utils/rouletteRules';

interface SpinChipProps {
  number: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isCandidate?: boolean;
  score?: number;
  rank?: number;
  onClick?: () => void;
  className?: string;
}

export const SpinChip: React.FC<SpinChipProps> = ({
  number,
  size = 'md',
  isCandidate = false,
  score,
  rank,
  onClick,
  className = '',
}) => {
  const color = getPocketColor(number);

  let bgStyle = 'bg-slate-800 text-slate-100 border-slate-700';
  if (color === 'red') {
    bgStyle = 'bg-red-700 text-white border-red-500 hover:bg-red-600';
  } else if (color === 'black') {
    bgStyle = 'bg-slate-900 text-slate-100 border-slate-700 hover:bg-slate-800';
  } else if (color === 'green') {
    bgStyle = 'bg-emerald-700 text-white border-emerald-500 hover:bg-emerald-600';
  }

  let sizeStyle = 'w-9 h-9 text-sm font-bold';
  if (size === 'sm') sizeStyle = 'w-7 h-7 text-xs font-semibold';
  if (size === 'lg') sizeStyle = 'w-12 h-12 text-base font-extrabold';
  if (size === 'xl') sizeStyle = 'w-16 h-16 text-xl font-extrabold';

  const candidateGlow = isCandidate
    ? 'ring-2 ring-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-105'
    : '';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-col items-center justify-center rounded-full border transition-all duration-200 select-none ${bgStyle} ${sizeStyle} ${candidateGlow} ${onClick ? 'cursor-pointer hover:scale-110 active:scale-95' : ''} ${className}`}
    >
      {rank && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-black text-slate-950 shadow-sm">
          #{rank}
        </span>
      )}
      <span>{number}</span>
      {score !== undefined && (
        <span className="text-[9px] font-normal text-amber-300 opacity-90 -mt-1">
          {score}%
        </span>
      )}
    </div>
  );
};
