import { Crown } from "lucide-react";

export function GameLoading() {
  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center gap-5 bg-[rgb(var(--c1))]" role="status" aria-label="Loading Thaasbai">
      <Crown size={32} className="text-[rgb(var(--gold))]" aria-hidden="true" />
      <p className="text-xl font-extrabold">Thaasbai<span className="text-[rgb(var(--lagoon))]">.</span></p>
      <div className="loading-track" aria-hidden="true"><span /></div>
    </div>
  );
}
