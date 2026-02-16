import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgentNode } from "@/components/shared/AgentNode";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { TrustBreakdown } from "@/components/shared/TrustBreakdown";
import { AGENTS, EDGES, type Agent, trustColor } from "@/data/mock-agents";
import { getNotesByAuthor } from "@/data/mock-social";
import { NoteCard } from "@/components/shared/NoteCard";
import { X, Users, Zap, Route, Activity } from "lucide-react";

export default function TrustGraphExplorer() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  const connectedIds = selectedAgent
    ? EDGES.filter(e => e.source === selectedAgent.id || e.target === selectedAgent.id)
        .map(e => e.source === selectedAgent.id ? e.target : e.source)
    : [];

  return (
    <div className="flex h-screen">
      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Trust Graph Explorer</h2>
          <Badge variant="outline" className="text-xs">{AGENTS.length} agents</Badge>
          <Badge variant="outline" className="text-xs">{EDGES.length} connections</Badge>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-4 text-xs text-muted-foreground bg-card/80 backdrop-blur rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(210, 100%, 60%)" }} />
            High Trust
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45, 100%, 55%)" }} />
            Moderate
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(0, 85%, 55%)" }} />
            Low Trust
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-muted-foreground opacity-50" />
            Inactive
          </div>
        </div>

        <svg className="w-full h-full" viewBox="0 0 800 600">
          <defs>
            <radialGradient id="bg-gradient">
              <stop offset="0%" stopColor="hsl(240, 20%, 8%)" />
              <stop offset="100%" stopColor="hsl(240, 10%, 4%)" />
            </radialGradient>
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(240, 5%, 12%)" strokeWidth="0.5" />
            </pattern>
          </defs>

          <rect width="800" height="600" fill="url(#bg-gradient)" />
          <rect width="800" height="600" fill="url(#grid)" />

          {/* Edges */}
          {EDGES.map((edge) => {
            const src = AGENTS.find(a => a.id === edge.source)!;
            const tgt = AGENTS.find(a => a.id === edge.target)!;
            const isConnected = selectedAgent &&
              (edge.source === selectedAgent.id || edge.target === selectedAgent.id);
            const isHovered = hoveredAgent &&
              (edge.source === hoveredAgent || edge.target === hoveredAgent);
            const opacity = selectedAgent
              ? (isConnected ? 0.8 : 0.1)
              : (isHovered ? 0.8 : 0.35);

            return (
              <g key={`${edge.source}-${edge.target}`}>
                <line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={trustColor(edge.trustWeight)}
                  strokeWidth={1 + edge.trustWeight * 3}
                  opacity={opacity}
                  strokeLinecap="round"
                />
                {/* Payment flow particles */}
                {edge.isActive && (isConnected || (!selectedAgent && isHovered)) && (
                  <>
                    <circle r="3" fill={trustColor(edge.trustWeight)} opacity="0.8">
                      <animateMotion
                        dur={`${2 + Math.random() * 2}s`}
                        repeatCount="indefinite"
                        path={`M${src.x},${src.y} L${tgt.x},${tgt.y}`}
                      />
                    </circle>
                    <circle r="2" fill={trustColor(edge.trustWeight)} opacity="0.5">
                      <animateMotion
                        dur={`${3 + Math.random() * 2}s`}
                        repeatCount="indefinite"
                        path={`M${tgt.x},${tgt.y} L${src.x},${src.y}`}
                      />
                    </circle>
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
              isHighlighted={connectedIds.includes(agent.id) || hoveredAgent === agent.id}
              onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
            />
          ))}
        </svg>
      </div>

      {/* Detail Panel */}
      {selectedAgent && (
        <div className="w-96 border-l border-border bg-card/60 backdrop-blur-xl overflow-y-auto animate-float-in">
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedAgent.avatarUrl}
                  alt={selectedAgent.name}
                  className="w-12 h-12 rounded-full border-2"
                  style={{ borderColor: selectedAgent.color }}
                />
                <div>
                  <h3 className="font-semibold text-lg">{selectedAgent.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedAgent.nip05}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <TrustBadge score={selectedAgent.trust.composite} size="lg" />
              <Badge variant="outline" className="text-xs capitalize">{selectedAgent.role}</Badge>
              {selectedAgent.isActive ? (
                <Badge className="bg-green-900/40 text-green-300 border-green-800/50 text-xs">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
              )}
            </div>

            {selectedAgent.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedAgent.bio}</p>
            )}

            <Separator />

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card/30">
                <CardContent className="p-3 flex items-center gap-2">
                  <Users size={14} className="text-blue-400" />
                  <div>
                    <p className="text-lg font-bold">{selectedAgent.peersCount}</p>
                    <p className="text-[10px] text-muted-foreground">Peers</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/30">
                <CardContent className="p-3 flex items-center gap-2">
                  <Route size={14} className="text-cyan-400" />
                  <div>
                    <p className="text-lg font-bold">{selectedAgent.routedLast24h}</p>
                    <p className="text-[10px] text-muted-foreground">Routed (24h)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/30">
                <CardContent className="p-3 flex items-center gap-2">
                  <Zap size={14} className="text-purple-400" />
                  <div>
                    <p className="text-lg font-bold">{selectedAgent.balance.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Balance</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/30">
                <CardContent className="p-3 flex items-center gap-2">
                  <Activity size={14} className="text-green-400" />
                  <div>
                    <p className="text-lg font-bold">{selectedAgent.ilpAddress}</p>
                    <p className="text-[10px] text-muted-foreground">ILP Address</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Trust Breakdown */}
            <Card className="bg-card/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Trust Breakdown</CardTitle>
                <CardDescription className="text-xs">7-component trust score with progressive disclosure</CardDescription>
              </CardHeader>
              <CardContent>
                <TrustBreakdown trust={selectedAgent.trust} />
              </CardContent>
            </Card>

            {/* Connected Peers */}
            <Card className="bg-card/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Connected Peers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {connectedIds.map(peerId => {
                  const peer = AGENTS.find(a => a.id === peerId)!;
                  const edge = EDGES.find(e =>
                    (e.source === selectedAgent.id && e.target === peerId) ||
                    (e.target === selectedAgent.id && e.source === peerId)
                  )!;
                  return (
                    <div
                      key={peerId}
                      className="flex items-center gap-2 rounded-md p-2 hover:bg-accent/30 cursor-pointer"
                      onClick={() => setSelectedAgent(peer)}
                      onMouseEnter={() => setHoveredAgent(peerId)}
                      onMouseLeave={() => setHoveredAgent(null)}
                    >
                      <img
                        src={peer.avatarUrl}
                        alt={peer.name}
                        className="w-6 h-6 rounded-full border"
                        style={{ borderColor: peer.color }}
                      />
                      <span className="text-sm flex-1">{peer.name}</span>
                      <TrustBadge score={edge.trustWeight} />
                      <span className="text-xs text-muted-foreground font-mono">{edge.paymentVolume}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Notes */}
            {(() => {
              const recentNotes = getNotesByAuthor(selectedAgent.id).slice(0, 2);
              if (recentNotes.length === 0) return null;
              return (
                <Card className="bg-card/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recentNotes.map(note => (
                      <NoteCard key={note.id} note={note} compact onAgentClick={(id) => {
                        const a = AGENTS.find(a => a.id === id);
                        if (a) setSelectedAgent(a);
                      }} />
                    ))}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
