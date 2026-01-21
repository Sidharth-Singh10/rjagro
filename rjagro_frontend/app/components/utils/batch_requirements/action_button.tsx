import React from 'react';
import { Check, XCircle } from 'lucide-react';
import { BatchRequirement } from '@/app/types/interfaces';

interface ActionButtonsProps {
  requirement: BatchRequirement;
  processingId: number | null;
  onApprove: (req: BatchRequirement) => void;
  onReject: (req: BatchRequirement) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  requirement,
  processingId,
  onApprove,
  onReject
}) => {
  const isProcessing = processingId === requirement.requirement_id;
  const statusLower = requirement.status?.toLowerCase() || '';
  const isPending = statusLower === 'pending';

  const isAccepted = statusLower.includes('accept');

  if (!isPending) {
    return (
      <button
        disabled
        className={`
          inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg border cursor-not-allowed opacity-80
          ${isAccepted
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'}
        `}
      >
        <div className="flex items-center gap-1.5">
          {isAccepted ? <Check size={12} /> : <XCircle size={12} />}
          <span>{requirement.status}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onApprove(requirement)}
        disabled={isProcessing}
        className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border border-green-200 hover:border-green-300 disabled:opacity-50 transition-all hover:shadow-sm active:scale-95"
        title="Approve requirement"
      >
        <div className="flex items-center gap-1.5">
          {isProcessing ? (
            <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={12} className="group-hover:scale-110 transition-transform" />
          )}
          <span>Accept</span>
        </div>
      </button>

      <button
        onClick={() => onReject(requirement)}
        disabled={isProcessing}
        className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 disabled:opacity-50 transition-all hover:shadow-sm active:scale-95"
        title="Reject requirement"
      >
        <div className="flex items-center gap-1.5">
          {isProcessing ? (
            <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <XCircle size={12} className="group-hover:scale-110 transition-transform" />
          )}
          <span>Reject</span>
        </div>
      </button>
    </div>
  );
};