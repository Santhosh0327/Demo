import React from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useRouletteStore();

  if (!toast) return null;

  let icon = <Info className="h-4 w-4 text-sky-400" />;
  let border = 'border-sky-500/30 bg-sky-950/80 text-sky-200';

  if (toast.type === 'success') {
    icon = <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    border = 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200';
  } else if (toast.type === 'error') {
    icon = <AlertCircle className="h-4 w-4 text-rose-400" />;
    border = 'border-rose-500/30 bg-rose-950/80 text-rose-200';
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md animate-bounce-subtle">
      <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-medium ${border}`}>
        {icon}
        <span>{toast.text}</span>
        <button onClick={clearToast} className="ml-2 text-slate-400 hover:text-slate-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
