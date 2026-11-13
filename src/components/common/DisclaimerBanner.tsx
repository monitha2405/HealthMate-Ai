import React from 'react';
import { AlertCircle } from 'lucide-react';

export const DisclaimerBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Educational decision-support platform. Not for diagnostic or emergency use.</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
      <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
        <AlertCircle className="w-4 h-4" />
      </div>
      <div className="text-xs text-amber-900 leading-relaxed">
        <span className="font-semibold text-amber-950">Academic Healthcare Decision Support Notice: </span>
        HealthMate AI demonstrates Large Language Model architectures, persistent RAG, and multi-agent coordination. It is an educational tool and does not provide clinical diagnoses, medical treatment plans, or emergency triage. Always consult certified healthcare professionals for medical advice.
      </div>
    </div>
  );
};
