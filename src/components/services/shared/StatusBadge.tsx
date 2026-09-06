import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ElementType }> = {
    completed: {
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: CheckCircle2,
    },
    pending: {
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: Clock,
    },
    processing: {
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      icon: Loader2,
    },
    failed: {
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      icon: AlertCircle,
    },
  };
  const s = map[status.toLowerCase()] ?? map.pending;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold shadow-sm transition-colors ${s.color}`}
    >
      <Icon
        className={cn(
          'h-3 w-3 shrink-0',
          status.toLowerCase() === 'processing' && 'animate-spin',
        )}
      />
      <span className="capitalize">{status}</span>
    </span>
  );
}
