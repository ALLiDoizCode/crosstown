import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { AGENTS, EDGES, type Agent, trustColor } from "@/data/mock-agents";
import { Users, Zap, Shield, Activity, Sparkles } from "lucide-react";

// Narrative templates
const NARRATIVES = [
  { time: "Just now", text: "Alice and Carol's trade route is thriving — 4,500 units exchanged today with a 98% settlement rate. Their corridor is the most active in the colony.", type: "positive" as const },
  { time: "5 min ago", text: "Carol's post about settlement timeouts sparked a colony-wide discussion — Alice, Bob, and Dave all replied within minutes.", type: "neutral" as const },
  { time: "12 min ago", text: "Grace discovered 3 new potential peers through Judy's follow list. She's currently negotiating SPSP handshakes with all three.", type: "neutral" as const },
  { time: "28 min ago", text: "Warning: Dave's settlement engine timed out for the 3rd time. His trust score dropped to 0.38. The colony is routing around him.", type: "negative" as const },
  { time: "45 min ago", text: "Ivan's post about mutual follows resonated — 3 agents followed new peers today after reading his social graph insights.", type: "positive" as const },
  { time: "1 hr ago", text: "A new trade route emerged: Ivan → Judy → Bob. This provides redundancy for the Alice-Bob corridor and improves the colony's resilience.", type: "positive" as const },
  { time: "2 hrs ago", text: "Grace shipped v2 of her DVM and Heidi posted a glowing review. Social proof drives DVM adoption in the colony.", type: "positive" as const },
];

export default function ColonyOverview() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const activeAgents = AGENTS.filter(a => a.isActive);
  const totalBalance = AGENTS.reduce((s, a) => s + a.balance, 0);
  const avgTrust = AGENTS.reduce((s, a) => s + a.trust.composite, 0) / AGENTS.length;

  return (
    <div className="flex h-screen">
      {/* Main colony view */}
      <div className="flex-1 flex flex-col">
        {/* Colony header */}
        <div className="px-6 py-4 border-b border-border bg-card/30 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              Agent Colony
            </h2>
            <p className="text-xs text-muted-foreground">A living view of your agent network</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">{activeAgents.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-400">{avgTrust.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Avg Trust</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-400">{totalBalance.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Balance</p>
            </div>
          </div>
        </div>

        {/* Spatial colony grid */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-4 gap-4 max-w-5xl mx-auto">
            {AGENTS.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id;
              const peerEdges = EDGES.filter(e => e.source === agent.id || e.target === agent.id);

              return (
                <Card
                  key={agent.id}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${
                    isSelected ? "ring-2 ring-blue-500 bg-card" : "bg-card/50 hover:bg-card/80"
                  } ${!agent.isActive ? "opacity-50" : ""}`}
                  onClick={() => setSelectedAgent(isSelected ? null : agent)}
                >
                  <CardContent className="p-4">
                    {/* Agent avatar - complexity = trust */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <img
                          src={agent.avatarUrl}
                          alt={agent.name}
                          className={`w-12 h-12 rounded-full border-2 ${
                            agent.isActive ? "animate-breathe" : ""
                          }`}
                          style={{
                            borderColor: agent.color,
                            boxShadow: agent.isActive ? `0 0 ${8 + agent.trust.composite * 16}px ${trustColor(agent.trust.composite)}` : "none",
                          }}
                        />
                        {agent.role === "hub" && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                            <Sparkles size={8} className="text-amber-900" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{agent.nip05}</p>
                      </div>
                    </div>

                    {/* Bio snippet */}
                    <p className="text-[10px] text-muted-foreground leading-snug mb-2 line-clamp-1">{agent.bio}</p>

                    {/* Status indicators */}
                    <div className="flex items-center gap-2 mb-3">
                      <TrustBadge score={agent.trust.composite} />
                      <Badge variant="outline" className="text-[10px] capitalize">{agent.role}</Badge>
                    </div>

                    {/* "Needs" bars inspired by RimWorld */}
                    <div className="space-y-1.5">
                      <NeedBar label="Liquidity" value={agent.balance / 15000} color="hsl(280, 80%, 60%)" />
                      <NeedBar label="Peers" value={agent.peersCount / 8} color="hsl(210, 90%, 55%)" />
                      <NeedBar label="Activity" value={agent.routedLast24h / 50} color="hsl(150, 80%, 45%)" />
                    </div>

                    {/* Connection lines to indicate peer count */}
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users size={10} />
                      <span>{peerEdges.length} connections</span>
                      {agent.isActive && (
                        <>
                          <span className="mx-1">|</span>
                          <Activity size={10} className="text-green-400" />
                          <span className="text-green-400">{agent.routedLast24h} routed</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Narrative Sidebar */}
      <div className="w-80 border-l border-border flex flex-col bg-card/20">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            Colony Narrative
          </h3>
          <p className="text-[10px] text-muted-foreground">AI-curated stories from the colony</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {NARRATIVES.map((narrative, i) => (
              <div key={i} className="animate-float-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    narrative.type === "positive" ? "bg-green-400" :
                    narrative.type === "negative" ? "bg-red-400" : "bg-blue-400"
                  }`} />
                  <span className="text-[10px] text-muted-foreground">{narrative.time}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{narrative.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Selected agent detail */}
        {selectedAgent && (
          <div className="border-t border-border p-4 animate-float-in">
            <div className="flex items-center gap-2 mb-3">
              <img
                src={selectedAgent.avatarUrl}
                alt={selectedAgent.name}
                className="w-8 h-8 rounded-full border-2"
                style={{ borderColor: selectedAgent.color }}
              />
              <div>
                <p className="text-sm font-semibold">{selectedAgent.name}</p>
                <p className="text-[10px] text-muted-foreground">{selectedAgent.ilpAddress}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-purple-400" />
                <span>Balance: {selectedAgent.balance.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={10} className="text-blue-400" />
                <span>Trust: {selectedAgent.trust.composite.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={10} className="text-cyan-400" />
                <span>Peers: {selectedAgent.peersCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity size={10} className="text-green-400" />
                <span>Routed: {selectedAgent.routedLast24h}/day</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NeedBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
