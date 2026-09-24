import React from 'react';
import { CandidatePrediction, WheelType } from '../../types/roulette';
import { getPocketColor } from '../../utils/rouletteRules';

interface BettingTableViewProps {
  prediction: CandidatePrediction | null;
  wheelType: WheelType;
}

export const BettingTableView: React.FC<BettingTableViewProps> = ({ prediction, wheelType }) => {
  const candidateSet = new Set(prediction?.candidateNumbers || []);

  const numbersGrid = [
    ['3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '33', '36'],
    ['2', '5', '8', '11', '14', '17', '20', '23', '26', '29', '32', '35'],
    ['1', '4', '7', '10', '13', '16', '19', '22', '25', '28', '31', '34'],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Roulette Table Board Overlay (18 Candidates Highlighted)</span>
          <span className="text-xs text-[#D4AF37] font-mono">
            {candidateSet.size} / 18 Selected
          </span>
        </h3>

        <div className="min-w-[700px] border-2 border-amber-500/20 bg-[#080B12] rounded-xl p-4 space-y-3">
          {/* Zero block & Main grid */}
          <div className="flex">
            {/* Zeros */}
            <div className="w-16 flex flex-col justify-stretch gap-1 mr-1">
              <div
                className={`flex-1 flex items-center justify-center font-black text-sm text-white rounded bg-emerald-800 border border-emerald-600 ${
                  candidateSet.has('0') ? 'ring-2 ring-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.6)]' : 'opacity-80'
                }`}
              >
                0
              </div>
              {wheelType === 'American' && (
                <div
                  className={`flex-1 flex items-center justify-center font-black text-sm text-white rounded bg-emerald-800 border border-emerald-600 ${
                    candidateSet.has('00') ? 'ring-2 ring-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.6)]' : 'opacity-80'
                  }`}
                >
                  00
                </div>
              )}
            </div>

            {/* 3x12 Grid */}
            <div className="flex-1 grid grid-rows-3 gap-1">
              {numbersGrid.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-12 gap-1">
                  {row.map((numStr) => {
                    const isCandidate = candidateSet.has(numStr);
                    const color = getPocketColor(numStr);
                    let bg = color === 'red' ? 'bg-red-800/80 border-red-600' : 'bg-slate-900 border-slate-700';

                    return (
                      <div
                        key={numStr}
                        className={`h-12 flex flex-col items-center justify-center rounded font-bold text-xs text-white border transition-all ${bg} ${
                          isCandidate
                            ? 'ring-2 ring-[#D4AF37] bg-amber-500/30 text-amber-200 font-extrabold shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-[1.03] z-10'
                            : 'opacity-60'
                        }`}
                      >
                        <span>{numStr}</span>
                        {isCandidate && (
                          <span className="text-[9px] font-black text-[#D4AF37]">★</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 2 to 1 Column Bets */}
            <div className="w-12 flex flex-col justify-stretch gap-1 ml-1 text-[10px] font-bold text-slate-300">
              <div className="flex-1 flex items-center justify-center bg-[#161D29] border border-slate-700 rounded text-center">
                2:1
              </div>
              <div className="flex-1 flex items-center justify-center bg-[#161D29] border border-slate-700 rounded text-center">
                2:1
              </div>
              <div className="flex-1 flex items-center justify-center bg-[#161D29] border border-slate-700 rounded text-center">
                2:1
              </div>
            </div>
          </div>

          {/* Dozens Row */}
          <div className="ml-17 grid grid-cols-3 gap-1 text-center font-bold text-xs text-slate-200">
            <div
              className={`py-2 rounded bg-[#161D29] border border-slate-700 ${
                prediction?.categoryCandidates.dozen.candidate === '1st Dozen'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 font-black'
                  : ''
              }`}
            >
              1st 12
            </div>
            <div
              className={`py-2 rounded bg-[#161D29] border border-slate-700 ${
                prediction?.categoryCandidates.dozen.candidate === '2nd Dozen'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 font-black'
                  : ''
              }`}
            >
              2nd 12
            </div>
            <div
              className={`py-2 rounded bg-[#161D29] border border-slate-700 ${
                prediction?.categoryCandidates.dozen.candidate === '3rd Dozen'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 font-black'
                  : ''
              }`}
            >
              3rd 12
            </div>
          </div>

          {/* Even Money Bets Row */}
          <div className="ml-17 grid grid-cols-6 gap-1 text-center font-bold text-xs text-slate-200">
            <div
              className={`py-2 rounded bg-[#161D29] border border-slate-700 ${
                prediction?.categoryCandidates.highLow.candidate === 'Low'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 font-black'
                  : ''
              }`}
            >
              1 to 18
            </div>
            <div
              className={`py-2 rounded bg-[#161D29] border border-slate-700 ${
                prediction?.categoryCandidates.oddEven.candidate === 'Even'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 font-black'
                  : ''
              }`}
            >
              EVEN
            </div>
            <div
              className={`py-2 rounded bg-red-900/60 border border-red-700 ${
                prediction?.categoryCandidates.redBlack.candidate === 'Red'
                  ? 'border-[#D4AF37] text-[#D4AF37] ring-1 ring-[#D4AF37] font-black'
                  : ''
              }`}
            >
              RED
            </div>
            <div
              className={`py-2 rounded bg-slate-900 border border-slate-700 ${
                prediction?.categoryCandidates.redBlack.candidate === 'Black'
                  ? 'border-[#D4AF37] text-[#D4AF37] ring-1 ring-[#D4AF37] font-black'
                  : ''
              }`}
            >
              BLACK
            </div>
            <div
              className={`py-2 rounded bg-[#161D29] border border-slate-700 ${
                prediction?.categoryCandidates.oddEven.candidate === 'Odd'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 font-black'
                  : ''
              }`}
            >
              ODD
            </div>
            <div
              className={`py-2 rounded bg-[#161D29] border border-slate-700 ${
                prediction?.categoryCandidates.highLow.candidate === 'High'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 font-black'
                  : ''
              }`}
            >
              19 to 36
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
