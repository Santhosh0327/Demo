import React, { useState } from 'react';
import { ManualEntry } from '../components/entry/ManualEntry';
import { OcrUploadEntry } from '../components/entry/OcrUploadEntry';
import { CopyPasteEntry } from '../components/entry/CopyPasteEntry';
import { ScreenCaptureEntry } from '../components/entry/ScreenCaptureEntry';
import { PlusCircle, FileText, Clipboard, Monitor } from 'lucide-react';

export const EnterResultsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ocr' | 'copypaste' | 'screenshare'>('manual');

  const tabs = [
    { id: 'manual', label: '1. Manual Keypad', icon: PlusCircle },
    { id: 'ocr', label: '2. Screenshot OCR', icon: FileText },
    { id: 'copypaste', label: '3. Copy-Paste Import', icon: Clipboard },
    { id: 'screenshare', label: '4. Screen Share OCR', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-[#232D3F] bg-[#10151F] p-1.5 rounded-2xl gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#161D29] text-[#D4AF37] border border-[#D4AF37]/30 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'manual' && <ManualEntry />}
      {activeTab === 'ocr' && <OcrUploadEntry />}
      {activeTab === 'copypaste' && <CopyPasteEntry />}
      {activeTab === 'screenshare' && <ScreenCaptureEntry />}
    </div>
  );
};
