import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import type { TrustScore } from "@/data/mock-agents";

interface TrustRadarProps {
  trust: TrustScore;
  size?: number;
}

export function TrustRadar({ trust, size = 220 }: TrustRadarProps) {
  const data = [
    { dimension: "Social Dist.", value: trust.socialDistance * 100 },
    { dimension: "Mutual", value: trust.mutualFollows * 100 },
    { dimension: "Zap Vol.", value: trust.zapVolume * 100 },
    { dimension: "Zap Div.", value: trust.zapDiversity * 100 },
    { dimension: "Settlement", value: trust.settlementSuccess * 100 },
    { dimension: "Reactions", value: trust.reactionScore * 100 },
    { dimension: "No Reports", value: (1 - trust.reportPenalty) * 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="hsl(240, 5%, 20%)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 9, fill: "hsl(240, 5%, 55%)" }}
        />
        <Radar
          name="Trust"
          dataKey="value"
          stroke="hsl(210, 100%, 60%)"
          fill="hsl(210, 100%, 60%)"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
