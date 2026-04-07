import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | React.ReactNode;
  sub?: string;
  className?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, className, accent }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur",
      accent && "border-indigo-500/30 bg-indigo-500/10",
      className
    )}>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
