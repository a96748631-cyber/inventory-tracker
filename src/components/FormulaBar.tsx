import React, { useState } from 'react';
import { HelpCircle, Calculator, Check, Info } from 'lucide-react';

export const FormulaBar: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const formulaCode = `=IF([@[Quantity in Stock]] < [@[Reorder Level]], "Reorder", "OK")`;

  const handleCopy = () => {
    navigator.clipboard.writeText(formulaCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 mb-6 border border-slate-800 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400 shrink-0">
            <span className="italic font-serif text-sm">fx</span>
            <span>Formula</span>
          </div>
          <div className="font-mono text-xs sm:text-sm text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80 overflow-x-auto whitespace-nowrap">
            <span className="text-pink-400 font-bold">=IF</span>
            <span className="text-slate-400">(</span>
            <span className="text-blue-300 font-medium">Quantity_in_Stock</span>
            <span className="text-amber-400 font-bold mx-1.5">&lt;</span>
            <span className="text-blue-300 font-medium">Reorder_Level</span>
            <span className="text-slate-400">, </span>
            <span className="text-red-400 font-semibold">"Reorder"</span>
            <span className="text-slate-400">, </span>
            <span className="text-emerald-400 font-semibold">"OK"</span>
            <span className="text-slate-400">)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Condition evaluates automatically when stock changes</span>
          </span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Copy formula text"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <span>Copy Excel Formula</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
