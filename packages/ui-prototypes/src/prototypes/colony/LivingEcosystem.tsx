import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { AGENTS, EDGES, type Agent, trustColor } from "@/data/mock-agents";
import { Leaf, Sparkles } from "lucide-react";

// Organic layout positions (arranged in a natural-looking cluster)
const ORGANIC_POSITIONS: Record<string, { x: number; y: number }> = {
  alice: { x: 400, y: 280 },
  bob: { x: 280, y: 200 },
  carol: { x: 520, y: 220 },
  dave: { x: 180, y: 340 },
  eve: { x: 580, y: 360 },
  frank: { x: 300, y: 430 },
  grace: { x: 460, y: 140 },
  heidi: { x: 640, y: 260 },
  ivan: { x: 240, y: 270 },
  judy: { x: 380, y: 160 },
  karl: { x: 130, y: 420 },
  lily: { x: 600, y: 160 },
};

const TIMELINE_NARRATIVES = [
  { text: "The colony wakes. Alice and Carol begin their morning trade route — particles of value flowing like nutrients through the network.", mood: "dawn" },
  { text: "Carol posts a question about settlement timeouts. Within minutes, Alice, Bob, and Dave respond — the social fabric carries signals faster than any relay.", mood: "growth" },
  { text: "Grace sends out tendrils of discovery, seeking new peers. Three possibilities emerge from Judy's social web.", mood: "growth" },
  { text: "A settlement completes between Bob and Ivan. Their connection thickens, trust building like rings in a tree.", mood: "bloom" },
  { text: "Ivan's note about mutual follows inspires 3 new peer connections. Social content shapes the network's topology.", mood: "bloom" },
  { text: "Dave's connection withers — settlement failures cause the colony to route around him. Natural selection at work.", mood: "decay" },
  { text: "Heidi posts a glowing review of Grace's DVM. Social proof spreads through the colony like pollen.", mood: "bloom" },
  { text: "Evening settles. The day's trust scores update across the colony. Successful agents glow brighter.", mood: "dusk" },
];

export default function LivingEcosystem() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<"dawn" | "day" | "dusk" | "night">("day");
  const [narrativeIndex, setNarrativeIndex] = useState(0);

  // Cycle narrative
  useEffect(() => {
    const timer = setInterval(() => {
      setNarrativeIndex((i) => (i + 1) % TIMELINE_NARRATIVES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const bgGradient = {
    dawn: "from-amber-950/20 via-blue-950/30 to-purple-950/20",
    day: "from-blue-950/20 via-cyan-950/15 to-blue-950/20",
    dusk: "from-orange-950/25 via-purple-950/30 to-blue-950/25",
    night: "from-blue-950/40 via-indigo-950/40 to-blue-950/40",
  };

  return (
    <div className={`flex flex-col h-screen bg-gradient-to-br ${bgGradient[timeOfDay]} transition-all duration-1000`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Leaf size={18} className="text-green-400" />
          <span className="font-semibold">Living Ecosystem</span>
          <Badge variant="outline" className="text-xs">
            {AGENTS.filter(a => a.isActive).length} alive
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">Time of Day</span>
          {(["dawn", "day", "dusk", "night"] as const).map((tod) => (
            <button
              key={tod}
              onClick={() => setTimeOfDay(tod)}
              className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                timeOfDay === tod ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tod}
            </button>
          ))}
        </div>
      </div>

      {/* Main ecosystem view */}
      <div className="flex-1 relative overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 800 550">
          <defs>
            {/* Organic-looking edge filter */}
            <filter id="organic-blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
            </filter>
            {/* Glow filter for active agents */}
            <filter id="agent-glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ambient background particles */}
          {Array.from({ length: 20 }, (_, i) => (
            <circle
              key={`ambient-${i}`}
              r={1 + Math.random() * 2}
              fill="hsl(210, 50%, 40%)"
              opacity={0.15}
            >
              <animateMotion
                dur={`${10 + Math.random() * 20}s`}
                repeatCount="indefinite"
                path={`M${Math.random() * 800},${Math.random() * 550} Q${Math.random() * 800},${Math.random() * 550} ${Math.random() * 800},${Math.random() * 550}`}
              />
            </circle>
          ))}

          {/* Organic connection tendrils */}
          {EDGES.map((edge) => {
            const src = ORGANIC_POSITIONS[edge.source];
            const tgt = ORGANIC_POSITIONS[edge.target];
            // Create a bezier curve for organic feel
            const mx = (src.x + tgt.x) / 2 + (Math.random() - 0.5) * 40;
            const my = (src.y + tgt.y) / 2 + (Math.random() - 0.5) * 40;
            const color = trustColor(edge.trustWeight);
            const isSel = selectedAgent && (edge.source === selectedAgent.id || edge.target === selectedAgent.id);

            return (
              <g key={`${edge.source}-${edge.target}`}>
                <path
                  d={`M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSel ? 2.5 : 0.5 + edge.trustWeight * 2}
                  opacity={isSel ? 0.7 : edge.isActive ? 0.2 : 0.08}
                  filter={edge.isActive ? undefined : "url(#organic-blur)"}
                />

                {/* Nutrient flow particles */}
                {edge.isActive && (
                  <circle r={1.5 + edge.paymentVolume / 3000} fill={color} opacity="0.6">
                    <animateMotion
                      dur={`${3 + Math.random() * 3}s`}
                      repeatCount="indefinite"
                      path={`M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`}
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Agent organisms */}
          {AGENTS.map((agent) => {
            const pos = ORGANIC_POSITIONS[agent.id];
            const trust = agent.trust.composite;
            const baseSize = 12 + trust * 22;
            const isSelected = selectedAgent?.id === agent.id;
            const color = trustColor(trust);

            // Organism complexity based on trust (more "petals"/rings = higher trust)
            const rings = Math.floor(trust * 5) + 1;

            return (
              <g
                key={agent.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedAgent(isSelected ? null : agent)}
                style={{ cursor: "pointer" }}
                className={agent.isActive ? "animate-breathe" : ""}
                opacity={agent.isActive ? 1 : 0.35}
              >
                {/* Ambient glow */}
                {agent.isActive && (
                  <circle r={baseSize + 20} fill={color} opacity={0.06}>
                    <animate attributeName="r" values={`${baseSize + 15};${baseSize + 25};${baseSize + 15}`} dur="4s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Organism rings (complexity = trust) */}
                {Array.from({ length: rings }, (_, ri) => (
                  <circle
                    key={ri}
                    r={baseSize - ri * 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.5}
                    opacity={0.2 + ri * 0.1}
                    transform={`rotate(${ri * 30})`}
                  />
                ))}

                {/* Core body with avatar */}
                <defs>
                  <clipPath id={`eco-clip-${agent.id}`}>
                    <circle r={baseSize * 0.6} />
                  </clipPath>
                </defs>
                <image
                  href={agent.avatarUrl}
                  x={-baseSize * 0.6}
                  y={-baseSize * 0.6}
                  width={baseSize * 1.2}
                  height={baseSize * 1.2}
                  clipPath={`url(#eco-clip-${agent.id})`}
                  filter={agent.isActive ? "url(#agent-glow)" : undefined}
                />
                <circle
                  r={baseSize * 0.6}
                  fill="none"
                  stroke={isSelected ? "#fff" : color}
                  strokeWidth={isSelected ? 2 : 0.5}
                />

                {/* Inner glow */}
                <circle
                  r={baseSize * 0.3}
                  fill={color}
                  opacity={0.3}
                />

                {/* Name */}
                <text
                  y={baseSize + 14}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize={10}
                  fontWeight={isSelected ? 600 : 400}
                  opacity={0.8}
                  className="select-none"
                >
                  {agent.name}
                </text>

                {/* Hub crown */}
                {agent.role === "hub" && (
                  <circle r={3} cy={-baseSize - 6} fill="hsl(45, 100%, 55%)" opacity={0.8}>
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected agent floating card */}
        {selectedAgent && (
          <div className="absolute top-4 right-4 w-64 animate-float-in">
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={selectedAgent.avatarUrl}
                    alt={selectedAgent.name}
                    className="w-8 h-8 rounded-full border-2"
                    style={{ borderColor: selectedAgent.color }}
                  />
                  <div>
                    <CardTitle className="text-sm">{selectedAgent.name}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">{selectedAgent.nip05}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <TrustBadge score={selectedAgent.trust.composite} />
                  <Badge variant="outline" className="text-[10px] capitalize">{selectedAgent.role}</Badge>
                </div>
                {selectedAgent.bio && (
                  <p className="text-muted-foreground text-[11px] leading-snug">{selectedAgent.bio}</p>
                )}
                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div className="rounded-md bg-secondary/50 p-2">
                    <p className="font-bold">{selectedAgent.peersCount}</p>
                    <p className="text-[10px] text-muted-foreground">Peers</p>
                  </div>
                  <div className="rounded-md bg-secondary/50 p-2">
                    <p className="font-bold">{selectedAgent.postCount}</p>
                    <p className="text-[10px] text-muted-foreground">Notes</p>
                  </div>
                  <div className="rounded-md bg-secondary/50 p-2">
                    <p className="font-bold">{selectedAgent.balance.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Balance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Narrative timeline bar */}
      <div className="border-t border-border/30 bg-card/20 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-foreground/80 transition-all">
              {TIMELINE_NARRATIVES[narrativeIndex].text}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {TIMELINE_NARRATIVES.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === narrativeIndex ? "bg-amber-400" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
