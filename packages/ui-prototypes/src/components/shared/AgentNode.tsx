import type { Agent } from "@/data/mock-agents";
import { trustColor } from "@/data/mock-agents";

interface AgentNodeProps {
  agent: Agent;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  scale?: number;
}

export function AgentNode({ agent, isSelected, isHighlighted, onClick, scale = 1 }: AgentNodeProps) {
  const baseSize = 20 + agent.trust.composite * 30;
  const size = baseSize * scale;
  const glowColor = trustColor(agent.trust.composite);
  const opacity = agent.isActive ? 1 : 0.5;
  const clipId = `clip-${agent.id}`;

  return (
    <g
      transform={`translate(${agent.x}, ${agent.y})`}
      onClick={onClick}
      style={{ cursor: "pointer", opacity }}
      className={agent.isActive ? "animate-breathe" : ""}
    >
      <defs>
        <clipPath id={clipId}>
          <circle r={size} />
        </clipPath>
      </defs>
      {/* Glow ring */}
      <circle
        r={size + 6}
        fill="none"
        stroke={glowColor}
        strokeWidth={isSelected ? 3 : 1.5}
        opacity={isSelected ? 0.8 : isHighlighted ? 0.6 : 0.3}
      />
      {/* Avatar image */}
      <image
        href={agent.avatarUrl}
        x={-size}
        y={-size}
        width={size * 2}
        height={size * 2}
        clipPath={`url(#${clipId})`}
      />
      {/* Border ring */}
      <circle
        r={size}
        fill="none"
        stroke={isSelected ? "#fff" : glowColor}
        strokeWidth={isSelected ? 2.5 : 1}
      />
      {/* Activity pulse */}
      {agent.isActive && (
        <circle
          r={size + 10}
          fill="none"
          stroke={glowColor}
          strokeWidth={0.5}
          opacity={0.4}
        >
          <animate attributeName="r" from={String(size + 4)} to={String(size + 18)} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Label */}
      <text
        y={size + 16}
        textAnchor="middle"
        fill="currentColor"
        fontSize={11}
        fontWeight={isSelected ? 600 : 400}
        className="select-none"
      >
        {agent.name}
      </text>
      {/* Role icon */}
      {agent.role === "hub" && (
        <text y={-size - 6} textAnchor="middle" fontSize={10} fill={glowColor}>
          HUB
        </text>
      )}
    </g>
  );
}
