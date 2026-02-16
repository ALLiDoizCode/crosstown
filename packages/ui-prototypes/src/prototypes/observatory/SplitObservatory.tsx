import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgentNode } from "@/components/shared/AgentNode";
import { EventFeed } from "@/components/shared/EventFeed";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { TrustBreakdown } from "@/components/shared/TrustBreakdown";
import { AGENTS, EDGES, generateEvents, type Agent, trustColor } from "@/data/mock-agents";
import { generateMixedFeed, type MixedFeedItem } from "@/data/mock-social";
import { NoteCard } from "@/components/shared/NoteCard";
import { Activity, TrendingUp, Network, X } from "lucide-react";

const events = generateEvents(15);
const mixedFeed = generateMixedFeed(5, 10);

export default function SplitObservatory() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [highlightedAgent, setHighlightedAgent] = useState<string | null>(null);

  const connectedIds = selectedAgent
    ? EDGES.filter(e => e.source === selectedAgent.id || e.target === selectedAgent.id)
        .map(e => e.source === selectedAgent.id ? e.target : e.source)
    : [];

  return (
    <div className="flex h-screen">
      {/* Left: Graph View */}
      <div className="flex-1 flex flex-col">
        {/* Top stats bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
          <div className="flex items-center gap-3">
            <Network size={16} className="text-blue-400" />
            <span className="text-sm font-medium">Social Graph Observatory</span>
            <Badge variant="outline" className="text-xs">{AGENTS.filter(a => a.isActive).length} active</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Activity size={12} className="text-green-400" /> 47 payments/hr</span>
            <span className="flex items-center gap-1"><TrendingUp size={12} className="text-blue-400" /> Network trust: 0.74</span>
          </div>
        </div>

        {/* Graph */}
        <div className="flex-1 relative">
          <svg className="w-full h-full" viewBox="0 0 800 600">
            <defs>
              <radialGradient id="split-bg">
                <stop offset="0%" stopColor="hsl(240, 20%, 8%)" />
                <stop offset="100%" stopColor="hsl(240, 10%, 4%)" />
              </radialGradient>
              <pattern id="split-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <circle cx="25" cy="25" r="0.5" fill="hsl(240, 5%, 15%)" />
              </pattern>
            </defs>
            <rect width="800" height="600" fill="url(#split-bg)" />
            <rect width="800" height="600" fill="url(#split-grid)" />

            {/* Edges */}
            {EDGES.map((edge) => {
              const src = AGENTS.find(a => a.id === edge.source)!;
              const tgt = AGENTS.find(a => a.id === edge.target)!;
              const isHL = highlightedAgent === edge.source || highlightedAgent === edge.target;
              const isSel = selectedAgent && (edge.source === selectedAgent.id || edge.target === selectedAgent.id);
              return (
                <line
                  key={`${edge.source}-${edge.target}`}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={trustColor(edge.trustWeight)}
                  strokeWidth={isSel ? 2.5 : isHL ? 2 : 1 + edge.trustWeight}
                  opacity={isSel ? 0.9 : isHL ? 0.7 : 0.25}
                  strokeDasharray={edge.isActive ? "none" : "4,4"}
                />
              );
            })}

            {/* Nodes */}
            {AGENTS.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent?.id === agent.id}
                isHighlighted={highlightedAgent === agent.id || connectedIds.includes(agent.id)}
                onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
              />
            ))}
          </svg>

          {/* Agent tooltip overlay */}
          {selectedAgent && (
            <div className="absolute top-4 left-4 w-72 animate-float-in">
              <Card className="bg-card/80 backdrop-blur-xl border-border">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
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
                  <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </CardHeader>
                <CardContent className="pb-4 space-y-3">
                  <div className="flex gap-2">
                    <TrustBadge score={selectedAgent.trust.composite} size="lg" />
                    <Badge variant="outline" className="text-xs capitalize">{selectedAgent.role}</Badge>
                  </div>
                  {selectedAgent.bio && (
                    <p className="text-xs text-muted-foreground leading-snug">{selectedAgent.bio}</p>
                  )}
                  <TrustBreakdown trust={selectedAgent.trust} />
                  <Separator />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{selectedAgent.peersCount}</p>
                      <p className="text-[10px] text-muted-foreground">Peers</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{selectedAgent.routedLast24h}</p>
                      <p className="text-[10px] text-muted-foreground">Routed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{selectedAgent.balance.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Balance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Right: Activity Feed */}
      <div className="w-96 border-l border-border flex flex-col bg-card/20">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Activity Feed</h3>
          <Badge variant="secondary" className="text-xs font-mono">{events.length} events</Badge>
        </div>
        <div className="flex-1 overflow-hidden">
          <EventFeed events={events} onEventHover={setHighlightedAgent} />
        </div>

        {/* Network summary at bottom */}
        <div className="border-t border-border p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Network Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Agents</span>
              <span className="font-mono">{AGENTS.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active</span>
              <span className="font-mono text-green-400">{AGENTS.filter(a => a.isActive).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Trust</span>
              <span className="font-mono text-blue-400">
                {(AGENTS.reduce((sum, a) => sum + a.trust.composite, 0) / AGENTS.length).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Volume</span>
              <span className="font-mono text-purple-400">
                {EDGES.reduce((sum, e) => sum + e.paymentVolume, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
