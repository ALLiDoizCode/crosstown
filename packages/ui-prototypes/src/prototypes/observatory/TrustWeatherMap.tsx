import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentNode } from "@/components/shared/AgentNode";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { AGENTS, EDGES, type Agent, trustColor } from "@/data/mock-agents";
import { Cloud, Thermometer, Wind, Droplets, Eye, EyeOff } from "lucide-react";

// Simple Voronoi-like heat regions around each node
function computeHeatRegions() {
  return AGENTS.map((agent) => {
    const trust = agent.trust.composite;
    const radius = 60 + trust * 80;
    // Color from cool (low trust) to warm (high trust)
    const hue = trust >= 0.7 ? 210 : trust >= 0.4 ? 45 : 0;
    const sat = 60 + trust * 30;
    const light = 20 + trust * 15;
    return {
      agent,
      cx: agent.x,
      cy: agent.y,
      radius,
      color: `hsl(${hue}, ${sat}%, ${light}%)`,
      opacity: 0.12 + trust * 0.08,
    };
  });
}

export default function TrustWeatherMap() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showParticles, setShowParticles] = useState(true);

  const heatRegions = useMemo(computeHeatRegions, []);

  // Compute "weather" stats
  const avgTrust = AGENTS.reduce((s, a) => s + a.trust.composite, 0) / AGENTS.length;
  const activeRatio = AGENTS.filter(a => a.isActive).length / AGENTS.length;
  const totalFlow = EDGES.reduce((s, e) => s + e.paymentVolume, 0);

  const weatherCondition = avgTrust >= 0.7 ? "Clear Skies" : avgTrust >= 0.5 ? "Partly Cloudy" : "Stormy";
  const windSpeed = Math.round(totalFlow / 1000);

  return (
    <div className="flex h-screen">
      <div className="flex-1 relative">
        {/* Weather header */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
          <Card className="bg-card/80 backdrop-blur border-border">
            <CardContent className="p-3 flex items-center gap-4">
              <Cloud size={20} className="text-blue-400" />
              <div>
                <p className="text-sm font-semibold">{weatherCondition}</p>
                <p className="text-xs text-muted-foreground">Network Weather</p>
              </div>
              <Separator className="h-8 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Thermometer size={14} className="text-amber-400" />
                <span className="text-sm font-mono">{avgTrust.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground">avg trust</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind size={14} className="text-cyan-400" />
                <span className="text-sm font-mono">{windSpeed}k</span>
                <span className="text-[10px] text-muted-foreground">flow/hr</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets size={14} className="text-green-400" />
                <span className="text-sm font-mono">{Math.round(activeRatio * 100)}%</span>
                <span className="text-[10px] text-muted-foreground">active</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border ${
              showOverlay ? "bg-blue-900/40 border-blue-800/50 text-blue-300" : "bg-card/80 border-border text-muted-foreground"
            }`}
          >
            {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
            Heat Map
          </button>
          <button
            onClick={() => setShowParticles(!showParticles)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border ${
              showParticles ? "bg-purple-900/40 border-purple-800/50 text-purple-300" : "bg-card/80 border-border text-muted-foreground"
            }`}
          >
            {showParticles ? <Eye size={12} /> : <EyeOff size={12} />}
            Payment Flow
          </button>
        </div>

        <svg className="w-full h-full" viewBox="0 0 800 600">
          <defs>
            <radialGradient id="weather-bg">
              <stop offset="0%" stopColor="hsl(240, 15%, 7%)" />
              <stop offset="100%" stopColor="hsl(240, 10%, 3%)" />
            </radialGradient>
            {/* Heat region gradients */}
            {heatRegions.map((region, i) => (
              <radialGradient key={`hg-${i}`} id={`heat-${i}`}>
                <stop offset="0%" stopColor={region.color} stopOpacity={region.opacity} />
                <stop offset="70%" stopColor={region.color} stopOpacity={region.opacity * 0.3} />
                <stop offset="100%" stopColor={region.color} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>

          <rect width="800" height="600" fill="url(#weather-bg)" />

          {/* Heat overlay */}
          {showOverlay && heatRegions.map((region, i) => (
            <circle
              key={`heat-${i}`}
              cx={region.cx}
              cy={region.cy}
              r={region.radius}
              fill={`url(#heat-${i})`}
            >
              <animate attributeName="r" values={`${region.radius};${region.radius + 8};${region.radius}`} dur="4s" repeatCount="indefinite" />
            </circle>
          ))}

          {/* Edges with weather-style rendering */}
          {EDGES.map((edge) => {
            const src = AGENTS.find(a => a.id === edge.source)!;
            const tgt = AGENTS.find(a => a.id === edge.target)!;
            const isSel = selectedAgent && (edge.source === selectedAgent.id || edge.target === selectedAgent.id);
            return (
              <g key={`${edge.source}-${edge.target}`}>
                {/* Wind-like flow path */}
                <line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={trustColor(edge.trustWeight)}
                  strokeWidth={isSel ? 2 : 0.8}
                  opacity={isSel ? 0.7 : 0.2}
                />

                {/* Payment particles (wind) */}
                {showParticles && edge.isActive && (
                  <>
                    {Array.from({ length: Math.ceil(edge.paymentVolume / 1500) }, (_, pi) => (
                      <circle
                        key={pi}
                        r={1.5 + edge.paymentVolume / 3000}
                        fill={trustColor(edge.trustWeight)}
                        opacity="0.7"
                      >
                        <animateMotion
                          dur={`${1.5 + pi * 0.8}s`}
                          repeatCount="indefinite"
                          begin={`${pi * 0.4}s`}
                          path={`M${src.x},${src.y} L${tgt.x},${tgt.y}`}
                        />
                        <animate attributeName="opacity" values="0;0.7;0.7;0" dur={`${1.5 + pi * 0.8}s`} repeatCount="indefinite" begin={`${pi * 0.4}s`} />
                      </circle>
                    ))}
                  </>
                )}

                {/* Settlement "precipitation" effect */}
                {edge.paymentVolume > 2000 && showOverlay && (
                  <>
                    {Array.from({ length: 3 }, (_, di) => {
                      const mx = (src.x + tgt.x) / 2 + (di - 1) * 8;
                      const my = (src.y + tgt.y) / 2;
                      return (
                        <circle key={`drop-${di}`} cx={mx} cy={my} r="2" fill="hsl(150, 80%, 45%)" opacity="0">
                          <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" begin={`${di * 0.5}s`} />
                          <animate attributeName="cy" values={`${my};${my + 12};${my}`} dur="2s" repeatCount="indefinite" begin={`${di * 0.5}s`} />
                        </circle>
                      );
                    })}
                  </>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {AGENTS.map((agent) => (
            <AgentNode
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent?.id === agent.id}
              onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
            />
          ))}
        </svg>

        {/* Temperature legend */}
        {showOverlay && (
          <div className="absolute bottom-4 left-4 z-10 bg-card/80 backdrop-blur rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Trust Temperature</p>
            <div className="flex items-center gap-1">
              <div className="w-24 h-3 rounded-full" style={{
                background: "linear-gradient(to right, hsl(0, 70%, 25%), hsl(45, 80%, 35%), hsl(210, 80%, 35%))"
              }} />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
              <span>Cold (Low)</span>
              <span>Warm (High)</span>
            </div>
          </div>
        )}

        {/* Selected agent card */}
        {selectedAgent && (
          <div className="absolute bottom-4 right-4 z-10 w-72 animate-float-in">
            <Card className="bg-card/80 backdrop-blur-xl border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedAgent.avatarUrl}
                      alt={selectedAgent.name}
                      className="w-8 h-8 rounded-full border-2"
                      style={{ borderColor: selectedAgent.color }}
                    />
                    <CardTitle className="text-sm">{selectedAgent.name}</CardTitle>
                  </div>
                  <TrustBadge score={selectedAgent.trust.composite} />
                </div>
              </CardHeader>
              <CardContent className="pb-3 text-xs space-y-2">
                {selectedAgent.bio && (
                  <p className="text-muted-foreground text-xs leading-snug">{selectedAgent.bio}</p>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-bold">{selectedAgent.peersCount}</p>
                    <p className="text-muted-foreground">Peers</p>
                  </div>
                  <div>
                    <p className="font-bold">{selectedAgent.routedLast24h}</p>
                    <p className="text-muted-foreground">Routed</p>
                  </div>
                  <div>
                    <p className="font-bold">{selectedAgent.balance.toLocaleString()}</p>
                    <p className="text-muted-foreground">Balance</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-[10px]">{selectedAgent.nip05} | {selectedAgent.ilpAddress}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper for JSX
function Separator({ className }: { className?: string }) {
  return <div className={`bg-border ${className || "h-px w-full"}`} />;
}
