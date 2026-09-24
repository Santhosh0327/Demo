import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-200/90 backdrop-blur-sm">
      <ShieldAlert className="h-4 w-4 shrink-0 text-[#D4AF37] mt-0.5" />
      <div>
        <span className="font-semibold text-[#D4AF37]">Experimental Pattern Disclaimer:</span>{' '}
        Candidates generated are statistical historical-pattern selections computed deterministically from active session history. Fair roulette spins are independent random events, and past outcomes do not reliably predict future results. Use responsibly for analytical exploration.
      </div>
    </div>
  );
};
