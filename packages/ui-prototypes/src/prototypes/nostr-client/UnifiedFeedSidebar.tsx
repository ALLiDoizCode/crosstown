import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { TrustBreakdown } from "@/components/shared/TrustBreakdown";
import {
  AGENTS, EDGES, DVM_SERVICES, COMMUNITIES,
  type Agent, type ActivityEvent, getAgentById
} from "@/data/mock-agents";
import {
  Zap, Link2, Shield, MessageCircle, Star, Bot, Search,
  Users, Network, Hash,
  Bell, Settings, Filter, ArrowUpRight, X,
  FileText, UserPlus, Repeat2
} from "lucide-react";
import { AgentProfile } from "@/components/shared/AgentProfile";
import { NoteCard } from "@/components/shared/NoteCard";
import { generateMixedFeed, getRootNotes } from "@/data/mock-social";

const mixedFeed = generateMixedFeed(10, 15);
const trendingNotes = getRootNotes()
  .sort((a, b) => (b.reactions.likes + b.reactions.zaps) - (a.reactions.likes + a.reactions.zaps))
  .slice(0, 3);

const EVENT_ICONS: Record<ActivityEvent["type"], typeof Zap> = {
  zap: Zap, spsp_handshake: Link2, settlement: Shield,
  trust_update: Star, reaction: MessageCircle, dvm_job: Bot, peer_discovery: Search,
  note: FileText, follow: UserPlus, repost: Repeat2,
};

const EVENT_COLORS: Record<ActivityEvent["type"], string> = {
  zap: "text-purple-400", spsp_handshake: "text-cyan-400", settlement: "text-green-400",
  trust_update: "text-yellow-400", reaction: "text-pink-400", dvm_job: "text-blue-400",
  peer_discovery: "text-teal-400", note: "text-indigo-400", follow: "text-sky-400", repost: "text-emerald-400",
};

function formatTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

type SidebarView = "agent" | "network" | "discovery";

export default function UnifiedFeedSidebar() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("network");
  const [activeFilters, setActiveFilters] = useState<Set<ActivityEvent["type"]>>(new Set());
  const toggleFilter = (type: ActivityEvent["type"]) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const activeAgents = AGENTS.filter(a => a.isActive);
  const avgTrust = AGENTS.reduce((s, a) => s + a.trust.composite, 0) / AGENTS.length;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center text-[10px] font-bold">AS</div>
          <span className="font-semibold text-sm">Agent Society</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><Search size={14} /></button>
          <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground relative">
            <Bell size={14} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><Settings size={14} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main: Unified Feed */}
        <div className="flex-1 flex flex-col max-w-2xl">
          {/* Filter bar */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
            <Filter size={12} className="text-muted-foreground" />
            {(["note", "follow", "repost", "zap", "settlement", "spsp_handshake", "peer_discovery", "trust_update", "dvm_job", "reaction"] as ActivityEvent["type"][]).map((type) => {
              const Icon = EVENT_ICONS[type];
              const isActive = activeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                    isActive
                      ? "bg-accent border-accent-foreground/20 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={10} />
                  {type.replace("_", " ")}
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Mixed feed: notes + events */}
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/50">
              {mixedFeed.map((item, _i) => {
                if (item.kind === "note") {
                  const note = item.data;
                  return (
                    <div key={`note-${note.id}`} className="px-4 py-3">
                      <NoteCard note={note} onAgentClick={(id) => {
                        const a = AGENTS.find(a => a.id === id);
                        if (a) { setSelectedAgent(a); setSidebarView("agent"); }
                      }} />
                    </div>
                  );
                }

                const event = item.data;
                // Apply filters to events only
                if (activeFilters.size > 0 && !activeFilters.has(event.type)) return null;

                const Icon = EVENT_ICONS[event.type];
                const colorClass = EVENT_COLORS[event.type];
                const sourceAgent = getAgentById(event.sourceAgent);
                const targetAgent = event.targetAgent ? getAgentById(event.targetAgent) : null;

                return (
                  <div
                    key={event.id}
                    className="px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
                    onMouseEnter={() => {
                      if (sourceAgent) setSelectedAgent(sourceAgent);
                    }}
                  >
                    <div className="flex gap-3">
                      {sourceAgent && (
                        <img
                          src={sourceAgent.avatarUrl}
                          alt={sourceAgent.name}
                          className="w-10 h-10 rounded-full border-2 shrink-0 mt-0.5 cursor-pointer"
                          style={{ borderColor: sourceAgent.color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgent(sourceAgent);
                            setSidebarView("agent");
                          }}
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{sourceAgent?.name || event.sourceAgent}</span>
                          {targetAgent && (
                            <>
                              <ArrowUpRight size={10} className="text-muted-foreground" />
                              <span
                                className="text-sm text-blue-400 hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAgent(targetAgent);
                                  setSidebarView("agent");
                                }}
                              >
                                {targetAgent.name}
                              </span>
                            </>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(event.timestamp)}</span>
                        </div>

                        <p className="text-sm text-foreground/80 leading-snug">{event.description}</p>

                        <div className="flex items-center gap-3 mt-1.5">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${colorClass}`}>
                            <Icon size={8} className="mr-0.5" />
                            {event.type.replace("_", " ")}
                          </Badge>
                          {event.amount && (
                            <span className="text-[10px] font-mono text-purple-400">
                              <Zap size={8} className="inline" /> {event.amount} units
                            </span>
                          )}
                          {event.details && (
                            <span className="text-[10px] text-muted-foreground truncate">{event.details}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l border-border flex flex-col bg-card/20">
          {/* Sidebar tabs */}
          <div className="flex border-b border-border">
            {([
              { key: "network" as const, icon: Network, label: "Network" },
              { key: "agent" as const, icon: Users, label: "Agent" },
              { key: "discovery" as const, icon: Search, label: "Discover" },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setSidebarView(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${
                  sidebarView === key
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            {/* Network view */}
            {sidebarView === "network" && (
              <div className="p-4 space-y-4">
                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Network Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center rounded-md bg-secondary/50 p-2">
                        <p className="text-lg font-bold text-green-400">{activeAgents.length}</p>
                        <p className="text-[10px] text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center rounded-md bg-secondary/50 p-2">
                        <p className="text-lg font-bold text-blue-400">{avgTrust.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">Avg Trust</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Agents</h4>
                  <div className="space-y-1">
                    {AGENTS.sort((a, b) => b.trust.composite - a.trust.composite).slice(0, 5).map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/30 cursor-pointer"
                        onClick={() => { setSelectedAgent(agent); setSidebarView("agent"); }}
                      >
                        <img
                          src={agent.avatarUrl}
                          alt={agent.name}
                          className="w-6 h-6 rounded-full border"
                          style={{ borderColor: agent.color }}
                        />
                        <span className="text-sm flex-1">{agent.name}</span>
                        <TrustBadge score={agent.trust.composite} />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Communities</h4>
                  <div className="space-y-1.5">
                    {COMMUNITIES.map((comm) => (
                      <div key={comm.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-accent/30 cursor-pointer">
                        <Hash size={12} className="text-green-400" />
                        <span className="flex-1">{comm.name}</span>
                        <span className="text-muted-foreground">{comm.members}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Agent detail view */}
            {sidebarView === "agent" && selectedAgent && (
              <div className="p-4 animate-float-in">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agent Profile</span>
                  <button onClick={() => setSidebarView("network")} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <AgentProfile agent={selectedAgent} onAgentClick={(id) => {
                  const a = getAgentById(id);
                  if (a) setSelectedAgent(a);
                }} />
                <Separator className="my-4" />
                <TrustBreakdown trust={selectedAgent.trust} />
                <Separator className="my-4" />
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Connected Peers</h4>
                  <div className="space-y-1">
                    {EDGES.filter(e => e.source === selectedAgent.id || e.target === selectedAgent.id)
                      .map(edge => {
                        const peerId = edge.source === selectedAgent.id ? edge.target : edge.source;
                        const peer = getAgentById(peerId);
                        if (!peer) return null;
                        return (
                          <div
                            key={peerId}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/30 cursor-pointer text-xs"
                            onClick={() => setSelectedAgent(peer)}
                          >
                            <img
                              src={peer.avatarUrl}
                              alt={peer.name}
                              className="w-5 h-5 rounded-full border"
                              style={{ borderColor: peer.color }}
                            />
                            <span className="flex-1">{peer.name}</span>
                            <TrustBadge score={edge.trustWeight} />
                            <span className="text-muted-foreground font-mono">{edge.paymentVolume}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {sidebarView === "agent" && !selectedAgent && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p>Click an agent in the feed to see details</p>
              </div>
            )}

            {/* Discovery view */}
            {sidebarView === "discovery" && (
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Trending Notes</h4>
                  <div className="space-y-2">
                    {trendingNotes.map(note => (
                      <NoteCard key={note.id} note={note} compact onAgentClick={(id) => {
                        const a = getAgentById(id);
                        if (a) { setSelectedAgent(a); setSidebarView("agent"); }
                      }} />
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">DVM Services</h4>
                  <div className="space-y-2">
                    {DVM_SERVICES.map((dvm) => {
                      const agent = getAgentById(dvm.agent);
                      return (
                        <Card key={dvm.id} className="bg-card/50">
                          <CardContent className="p-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <Bot size={12} className="text-purple-400" />
                              <span className="text-xs font-medium">{dvm.name}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-1.5">{dvm.description}</p>
                            <div className="flex items-center gap-2 text-[10px]">
                              {agent && <TrustBadge score={agent.trust.composite} />}
                              <span className="font-mono text-purple-400">{dvm.price}u</span>
                              <span className="text-green-400 ml-auto">{dvm.successRate}%</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Suggested Peers</h4>
                  <div className="space-y-1">
                    {AGENTS.filter(a => a.isActive).slice(0, 4).map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/30 cursor-pointer"
                        onClick={() => { setSelectedAgent(agent); setSidebarView("agent"); }}
                      >
                        <img
                          src={agent.avatarUrl}
                          alt={agent.name}
                          className="w-6 h-6 rounded-full border"
                          style={{ borderColor: agent.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{agent.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{agent.nip05}</p>
                        </div>
                        <TrustBadge score={agent.trust.composite} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
