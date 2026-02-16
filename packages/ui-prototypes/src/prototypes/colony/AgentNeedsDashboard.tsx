import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { TrustBreakdown } from "@/components/shared/TrustBreakdown";
import { AGENTS, EDGES, generateEvents, type Agent, trustColor } from "@/data/mock-agents";
import {
  Droplets, Activity, Shield, AlertTriangle, CheckCircle2,
  Heart, Brain, Route, Users, Minus, MessageSquare
} from "lucide-react";
import { generateMixedFeed } from "@/data/mock-social";
import { NoteCard } from "@/components/shared/NoteCard";

const events = generateEvents(8);
const mixedFeed = generateMixedFeed(5, 8);

interface Need {
  name: string;
  value: number;
  max: number;
  icon: typeof Droplets;
  color: string;
  critical: number;
  description: string;
}

function getAgentNeeds(agent: Agent): Need[] {
  return [
    {
      name: "Liquidity",
      value: agent.balance,
      max: 15000,
      icon: Droplets,
      color: "hsl(280, 80%, 60%)",
      critical: 0.2,
      description: `${agent.balance.toLocaleString()} / 15,000 units available`,
    },
    {
      name: "Peer Diversity",
      value: agent.peersCount,
      max: 10,
      icon: Users,
      color: "hsl(210, 90%, 55%)",
      critical: 0.3,
      description: `${agent.peersCount} unique peers connected`,
    },
    {
      name: "Route Redundancy",
      value: EDGES.filter(e => (e.source === agent.id || e.target === agent.id) && e.isActive).length,
      max: 6,
      icon: Route,
      color: "hsl(150, 80%, 45%)",
      critical: 0.2,
      description: `${EDGES.filter(e => (e.source === agent.id || e.target === agent.id) && e.isActive).length} active routes`,
    },
    {
      name: "Trust Health",
      value: agent.trust.composite * 100,
      max: 100,
      icon: Heart,
      color: agent.trust.composite >= 0.7 ? "hsl(210, 100%, 60%)" : agent.trust.composite >= 0.4 ? "hsl(45, 100%, 55%)" : "hsl(0, 85%, 55%)",
      critical: 0.4,
      description: `Composite trust: ${agent.trust.composite.toFixed(2)}`,
    },
    {
      name: "Settlement Rate",
      value: agent.trust.settlementSuccess * 100,
      max: 100,
      icon: Shield,
      color: "hsl(150, 80%, 45%)",
      critical: 0.6,
      description: `${Math.round(agent.trust.settlementSuccess * 100)}% success rate`,
    },
    {
      name: "Activity Level",
      value: agent.routedLast24h,
      max: 50,
      icon: Activity,
      color: "hsl(45, 90%, 55%)",
      critical: 0.1,
      description: `${agent.routedLast24h} payments routed in 24h`,
    },
    {
      name: "Social Engagement",
      value: agent.postCount,
      max: 60,
      icon: MessageSquare,
      color: "hsl(250, 80%, 60%)",
      critical: 0.1,
      description: `${agent.postCount} notes posted, ${agent.followerCount} followers`,
    },
  ];
}

function needStatus(need: Need): "critical" | "warning" | "good" {
  const ratio = need.value / need.max;
  if (ratio <= need.critical) return "critical";
  if (ratio <= need.critical * 2) return "warning";
  return "good";
}

export default function AgentNeedsDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AGENTS[0]);

  return (
    <div className="flex h-screen">
      {/* Agent selector sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-card/20">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Colony Members</h2>
          <p className="text-[10px] text-muted-foreground">{AGENTS.length} agents</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {AGENTS.map((agent) => {
              const needs = getAgentNeeds(agent);
              const criticalCount = needs.filter(n => needStatus(n) === "critical").length;
              const warningCount = needs.filter(n => needStatus(n) === "warning").length;
              const isSelected = selectedAgent.id === agent.id;

              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
                    isSelected ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    className={`w-9 h-9 rounded-full border-2 shrink-0 ${
                      !agent.isActive ? "opacity-40" : ""
                    }`}
                    style={{
                      borderColor: agent.color,
                      boxShadow: agent.isActive ? `0 0 6px ${trustColor(agent.trust.composite)}` : "none",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <div className="flex items-center gap-1.5">
                      <TrustBadge score={agent.trust.composite} />
                      {criticalCount > 0 && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">{criticalCount}</Badge>
                      )}
                      {warningCount > 0 && (
                        <Badge className="text-[9px] px-1 py-0 bg-amber-900/40 text-amber-300 border-amber-800/50">{warningCount}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Agent header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/30">
          <div className="flex items-center gap-4">
            <img
              src={selectedAgent.avatarUrl}
              alt={selectedAgent.name}
              className={`w-14 h-14 rounded-full border-2 ${
                selectedAgent.isActive ? "animate-breathe" : ""
              }`}
              style={{
                borderColor: selectedAgent.color,
                boxShadow: selectedAgent.isActive ? `0 0 16px ${trustColor(selectedAgent.trust.composite)}` : "none",
              }}
            />
            <div>
              <h2 className="text-xl font-semibold">{selectedAgent.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedAgent.nip05} | {selectedAgent.ilpAddress}</p>
              {selectedAgent.bio && (
                <p className="text-xs text-muted-foreground mt-0.5">{selectedAgent.bio}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrustBadge score={selectedAgent.trust.composite} size="lg" />
            <Badge variant="outline" className="capitalize">{selectedAgent.role}</Badge>
            {selectedAgent.isActive ? (
              <Badge className="bg-green-900/40 text-green-300 border-green-800/50">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Offline</Badge>
            )}
          </div>
        </div>

        {/* Needs panel */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="needs">
            <TabsList className="mb-4">
              <TabsTrigger value="needs">Needs</TabsTrigger>
              <TabsTrigger value="trust">Trust Details</TabsTrigger>
              <TabsTrigger value="history">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="needs">
              {/* RimWorld-style needs bars */}
              <div className="grid grid-cols-2 gap-4 max-w-4xl">
                {getAgentNeeds(selectedAgent).map((need) => {
                  const status = needStatus(need);
                  const ratio = Math.min(1, need.value / need.max);
                  const Icon = need.icon;
                  const StatusIcon = status === "critical" ? AlertTriangle :
                    status === "warning" ? Minus : CheckCircle2;

                  return (
                    <Card key={need.name} className={`bg-card/50 ${
                      status === "critical" ? "border-red-900/50" :
                      status === "warning" ? "border-amber-900/50" : "border-border"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon size={16} style={{ color: need.color }} />
                            <span className="text-sm font-medium">{need.name}</span>
                          </div>
                          <StatusIcon
                            size={14}
                            className={
                              status === "critical" ? "text-red-400" :
                              status === "warning" ? "text-amber-400" : "text-green-400"
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${ratio * 100}%`,
                                  backgroundColor: need.color,
                                  opacity: status === "critical" ? 1 : 0.8,
                                }}
                              />
                            </div>
                            <span className="text-sm font-mono w-12 text-right">
                              {Math.round(ratio * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{need.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Summary card */}
              <Card className="mt-4 bg-card/30 max-w-4xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain size={14} className="text-purple-400" />
                    Colony Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedAgent.name} is{" "}
                    {selectedAgent.isActive ? "actively routing payments" : "currently offline"}.
                    {selectedAgent.trust.composite >= 0.7
                      ? ` With a high trust score of ${selectedAgent.trust.composite.toFixed(2)}, ${selectedAgent.name} is a valuable member of the colony.`
                      : selectedAgent.trust.composite >= 0.4
                      ? ` Trust score of ${selectedAgent.trust.composite.toFixed(2)} is moderate — settlement reliability could improve.`
                      : ` Trust score is low at ${selectedAgent.trust.composite.toFixed(2)} — consider investigating settlement failures.`}
                    {" "}{selectedAgent.peersCount < 4
                      ? "Peer diversity is below optimal — recommend expanding the follow list."
                      : `Peer diversity is healthy with ${selectedAgent.peersCount} connections.`}
                    {" "}{selectedAgent.postCount >= 20
                      ? `Social engagement is strong with ${selectedAgent.postCount} notes and ${selectedAgent.followerCount} followers.`
                      : `Social engagement could improve — only ${selectedAgent.postCount} notes posted so far.`}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trust">
              <Card className="bg-card/50 max-w-2xl">
                <CardHeader>
                  <CardTitle className="text-base">7-Component Trust Breakdown</CardTitle>
                  <CardDescription>Social trust vs. earned trust dimensions</CardDescription>
                </CardHeader>
                <CardContent>
                  <TrustBreakdown trust={selectedAgent.trust} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <div className="max-w-2xl space-y-3">
                {mixedFeed.map((item, i) => {
                  if (item.kind === "note") {
                    return <NoteCard key={`note-${item.data.id}`} note={item.data} compact onAgentClick={(id) => {
                      const a = AGENTS.find(a => a.id === id);
                      if (a) setSelectedAgent(a);
                    }} />;
                  }
                  const event = item.data;
                  return (
                    <Card key={event.id} className="bg-card/30">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          event.type === "settlement" ? "bg-green-400" :
                          event.type === "zap" ? "bg-purple-400" :
                          event.type === "trust_update" ? "bg-yellow-400" :
                          event.type === "note" ? "bg-indigo-400" :
                          event.type === "follow" ? "bg-sky-400" : "bg-blue-400"
                        }`} />
                        <p className="text-sm flex-1">{event.description}</p>
                        {event.amount && (
                          <span className="text-xs font-mono text-purple-400">{event.amount} units</span>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
