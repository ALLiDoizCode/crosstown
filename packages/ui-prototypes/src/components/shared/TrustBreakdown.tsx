import type { TrustScore } from "@/data/mock-agents";
import { Progress } from "@/components/ui/progress";
import { TrustRadar } from "./TrustRadar";

export function TrustBreakdown({ trust, showRadar = true }: { trust: TrustScore; showRadar?: boolean }) {
  return (
    <div className="space-y-4">
      {showRadar && (
        <div className="rounded-lg border border-border/50 bg-card/30 p-2">
          <TrustRadar trust={trust} size={200} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold" style={{ color: "hsl(210, 90%, 55%)" }}>
            Social Trust ({trust.socialTrust.toFixed(2)})
          </h4>
          <TrustBar label="Social Distance" value={trust.socialDistance} color="hsl(210, 90%, 55%)" />
          <TrustBar label="Mutual Follows" value={trust.mutualFollows} color="hsl(210, 70%, 55%)" />
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold" style={{ color: "hsl(45, 90%, 55%)" }}>
            Earned Trust ({trust.earnedTrust.toFixed(2)})
          </h4>
          <TrustBar label="Zap Volume" value={trust.zapVolume} color="hsl(45, 90%, 55%)" />
          <TrustBar label="Zap Diversity" value={trust.zapDiversity} color="hsl(45, 70%, 55%)" />
          <TrustBar label="Settlement" value={trust.settlementSuccess} color="hsl(150, 80%, 45%)" />
          <TrustBar label="Reactions" value={trust.reactionScore} color="hsl(45, 60%, 55%)" />
        </div>
      </div>
      {trust.reportPenalty > 0.05 && (
        <div className="rounded-md bg-red-950/30 border border-red-900/50 p-2 text-xs text-red-400">
          Report Penalty: {trust.reportPenalty.toFixed(2)}
        </div>
      )}
    </div>
  );
}

function TrustBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <Progress value={value * 100} className="h-2" indicatorClassName="transition-all" style={{ ["--tw-progress" as string]: color }} />
    </div>
  );
}
