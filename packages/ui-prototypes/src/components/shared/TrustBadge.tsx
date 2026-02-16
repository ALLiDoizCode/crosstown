import { Badge } from "@/components/ui/badge";
import { trustColor, trustLabel } from "@/data/mock-agents";

export function TrustBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const color = trustColor(score);
  return (
    <Badge
      className={`${size === "lg" ? "px-3 py-1 text-sm" : ""}`}
      style={{ backgroundColor: color, color: score >= 0.4 ? "#000" : "#fff", border: "none" }}
    >
      {score.toFixed(2)} {size === "lg" && `- ${trustLabel(score)}`}
    </Badge>
  );
}
