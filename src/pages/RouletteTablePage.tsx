import React, { useState } from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { BettingTableView } from '../components/views/BettingTableView';
import { PhysicalWheelView } from '../components/views/PhysicalWheelView';
import { Grid6x3View } from '../components/views/Grid6x3View';
import { DozenView } from '../components/views/DozenView';
import { ColumnView } from '../components/views/ColumnView';
import { ColorView } from '../components/views/ColorView';
import { ParityView } from '../components/views/ParityView';
import { RangeView } from '../components/views/RangeView';
import { StatisticalTableView } from '../components/views/StatisticalTableView';
import { Grid, Disc, LayoutGrid, Columns, Palette, Scale, Hash, Table } from 'lucide-react';

export const RouletteTablePage: React.FC = () => {
  const { currentPrediction, wheelType } = useRouletteStore();
  const [activeTab, setActiveTab] = useState<
    'table' | 'wheel' | 'grid' | 'dozen' | 'column' | 'color' | 'parity' | 'range' | 'statstable'
  >('table');

  const tabs = [
    { id: 'table', label: '1. Betting Table', icon: Grid },
    { id: 'wheel', label: '2. Physical Wheel', icon: Disc },
    { id: 'grid', label: '3. 6x3 Grid', icon: LayoutGrid },
    { id: 'dozen', label: '4. Dozens', icon: Columns },
    { id: 'column', label: '5. Columns', icon: Columns },
    { id: 'color', label: '6. Colors', icon: Palette },
    { id: 'parity', label: '7. Parity', icon: Scale },
    { id: 'range', label: '8. Range', icon: Hash },
    { id: 'statstable', label: '9. Detailed Table', icon: Table },
  ];

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      {/* 9 Tab Switches Bar */}
      <div className="flex border-b border-[#232D3F] bg-[#10151F] p-1.5 rounded-2xl gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#161D29] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render selected view */}
      {activeTab === 'table' && <BettingTableView prediction={currentPrediction} wheelType={wheelType} />}
      {activeTab === 'wheel' && <PhysicalWheelView prediction={currentPrediction} wheelType={wheelType} />}
      {activeTab === 'grid' && <Grid6x3View prediction={currentPrediction} />}
      {activeTab === 'dozen' && <DozenView prediction={currentPrediction} />}
      {activeTab === 'column' && <ColumnView prediction={currentPrediction} />}
      {activeTab === 'color' && <ColorView prediction={currentPrediction} />}
      {activeTab === 'parity' && <ParityView prediction={currentPrediction} />}
      {activeTab === 'range' && <RangeView prediction={currentPrediction} />}
      {activeTab === 'statstable' && <StatisticalTableView prediction={currentPrediction} />}
    </div>
  );
};
