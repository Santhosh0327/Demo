import React, { useState } from 'react';
import { CandidatePrediction, WheelType } from '../../types/roulette';
import { getOppositePockets, getPocketColor, getWheelSequence } from '../../utils/rouletteRules';

interface PhysicalWheelViewProps {
  prediction: CandidatePrediction | null;
  wheelType: WheelType;
}

export const PhysicalWheelView: React.FC<PhysicalWheelViewProps> = ({ prediction, wheelType }) => {
  const [selectedNum, setSelectedNum] = useState<string | null>(null);
  const sequence = getWheelSequence(wheelType);
  const candidateSet = new Set(prediction?.candidateNumbers || []);
  const total = sequence.length;

  const oppositePockets = selectedNum ? getOppositePockets(selectedNum, wheelType) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl flex flex-col items-center">
        <div className="w-full flex items-center justify-between border-b border-[#232D3F] pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-100">
            Physical {wheelType} Wheel Layout ({total} Pockets)
          </h3>
          <span className="text-xs text-slate-400">
            Click any pocket to view physical opposite pockets (Offset 18/19)
          </span>
        </div>

        {/* SVG Circular Wheel */}
        <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center p-2">
          <svg viewBox="-250 -250 500 500" className="w-full h-full drop-shadow-2xl">
            {/* Outer Rim */}
            <circle cx="0" cy="0" r="240" fill="#080B12" stroke="#232D3F" strokeWidth="8" />
            <circle cx="0" cy="0" r="230" fill="#10151F" stroke="#D4AF37" strokeWidth="2" opacity="0.4" />

            {/* Pockets */}
            {sequence.map((numStr, i) => {
              const angleDeg = (i * 360) / total - 90;
              const angleRad = (angleDeg * Math.PI) / 180;
              const nextAngleDeg = ((i + 1) * 360) / total - 90;
              const nextAngleRad = (nextAngleDeg * Math.PI) / 180;

              const rInner = 140;
              const rOuter = 225;

              const x1 = rInner * Math.cos(angleRad);
              const y1 = rInner * Math.sin(angleRad);
              const x2 = rOuter * Math.cos(angleRad);
              const y2 = rOuter * Math.sin(angleRad);
              const x3 = rOuter * Math.cos(nextAngleRad);
              const y3 = rOuter * Math.sin(nextAngleRad);
              const x4 = rInner * Math.cos(nextAngleRad);
              const y4 = rInner * Math.sin(nextAngleRad);

              const color = getPocketColor(numStr);
              let fillColor = '#1E293B';
              if (color === 'red') fillColor = '#DC2626';
              if (color === 'green') fillColor = '#15803D';

              const isCandidate = candidateSet.has(numStr);
              const isSelected = selectedNum === numStr;
              const isOpposite = oppositePockets.includes(numStr);

              const midAngleRad = ((angleDeg + 360 / total / 2) * Math.PI) / 180;
              const textR = 185;
              const textX = textR * Math.cos(midAngleRad);
              const textY = textR * Math.sin(midAngleRad);

              return (
                <g key={numStr} onClick={() => setSelectedNum(numStr)} className="cursor-pointer group">
                  <path
                    d={`M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rInner} ${rInner} 0 0 0 ${x1} ${y1} Z`}
                    fill={fillColor}
                    stroke={
                      isSelected
                        ? '#38BDF8'
                        : isOpposite
                        ? '#F43F5E'
                        : isCandidate
                        ? '#D4AF37'
                        : '#080B12'
                    }
                    strokeWidth={isCandidate || isSelected || isOpposite ? '3' : '1'}
                    className="transition-all duration-200 group-hover:opacity-80"
                  />
                  {/* Number Label */}
                  <text
                    x={textX}
                    y={textY}
                    fill="#F8FAFC"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${angleDeg + 90 + 360 / total / 2}, ${textX}, ${textY})`}
                  >
                    {numStr}
                  </text>
                  {/* Candidate Pin Indicator */}
                  {isCandidate && (
                    <circle
                      cx={152 * Math.cos(midAngleRad)}
                      cy={152 * Math.sin(midAngleRad)}
                      r="4"
                      fill="#D4AF37"
                    />
                  )}
                </g>
              );
            })}

            {/* Inner Wheel Hub */}
            <circle cx="0" cy="0" r="130" fill="#161D29" stroke="#232D3F" strokeWidth="4" />
            <circle cx="0" cy="0" r="80" fill="#080B12" stroke="#D4AF37" strokeWidth="2" opacity="0.6" />
          </svg>

          {/* Center Info Overlay */}
          <div className="absolute flex flex-col items-center justify-center text-center p-4 rounded-full bg-[#161D29]/90 backdrop-blur-md border border-[#D4AF37]/30 shadow-2xl w-40 h-40">
            {selectedNum ? (
              <div>
                <span className="text-[10px] text-slate-400">Selected Pocket</span>
                <div className="text-2xl font-black text-[#D4AF37]">{selectedNum}</div>
                <div className="text-[9px] text-rose-400 mt-1 font-semibold">
                  Opposite: {oppositePockets.join(', ')}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase">18 Candidates</span>
                <div className="text-xs text-slate-300 mt-1">Highlighted with Gold Pins</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
