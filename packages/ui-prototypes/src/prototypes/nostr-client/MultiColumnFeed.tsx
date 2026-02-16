import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { EventFeed } from "@/components/shared/EventFeed";
import { SocialFeed } from "@/components/shared/SocialFeed";
import { AgentProfile } from "@/components/shared/AgentProfile";
import {
  AGENTS, EDGES, generateEvents, DVM_SERVICES, COMMUNITIES,
  type Agent, getAgentById
} from "@/data/mock-agents";
import {
  MessageSquare, Network, Bot, Users, Hash, Zap, Star,
  Plus, Settings, Bell, Search, Activity
} from "lucide-react";

const events = generateEvents(15);

export default function MultiColumnFeed() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [feedMode, setFeedMode] = useState<"social" | "activity">("social");

  return (
    <div className="flex flex-col h-screen">
      {/* Top navigation bar - Nostr-style */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">AS</div>
          <span className="font-semibold text-sm">Agent Society</span>
          <Badge variant="outline" className="text-[10px]">Nostr Client</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-md hover:bg-accent text-muted-foreground"><Search size={14} /></button>
          <button className="p-2 rounded-md hover:bg-accent text-muted-foreground"><Bell size={14} /></button>
          <button className="p-2 rounded-md hover:bg-accent text-muted-foreground"><Settings size={14} /></button>
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold ml-2">
            ME
          </div>
        </div>
      </div>

      {/* Multi-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Agent Social Feed */}
        <div className="w-80 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card/30">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-blue-400" />
              <span className="text-sm font-semibold">Feed</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFeedMode("social")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  feedMode === "social" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Social
              </button>
              <button
                onClick={() => setFeedMode("activity")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  feedMode === "activity" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Activity
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {feedMode === "social" ? (
              <SocialFeed showThreads onAgentClick={(id) => {
                const a = AGENTS.find(a => a.id === id);
                if (a) setSelectedAgent(a);
              }} />
            ) : (
              <EventFeed events={events} onEventHover={() => {}} compact />
            )}
          </div>
        </div>

        {/* Column 2: Trust Graph */}
        <div className="w-80 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card/30">
            <div className="flex items-center gap-2">
              <Network size={14} className="text-cyan-400" />
              <span className="text-sm font-semibold">Trust Graph</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">{AGENTS.length} agents</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {AGENTS.sort((a, b) => b.trust.composite - a.trust.composite).map((agent) => {
                const isSelected = selectedAgent?.id === agent.id;
                const peerCount = EDGES.filter(e => e.source === agent.id || e.target === agent.id).length;
                return (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                    onClick={() => setSelectedAgent(isSelected ? null : agent)}
                  >
                    <div className="relative">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className={`w-9 h-9 rounded-full border-2 ${!agent.isActive ? "opacity-40" : ""}`}
                        style={{ borderColor: agent.color }}
                      />
                      {agent.isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{agent.name}</span>
                        {agent.role === "hub" && <Star size={10} className="text-amber-400" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{agent.nip05}</p>
                    </div>
                    <div className="text-right">
                      <TrustBadge score={agent.trust.composite} />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{peerCount} peers</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Selected agent profile */}
          {selectedAgent && (
            <div className="border-t border-border p-3 bg-card/30 animate-float-in">
              <AgentProfile agent={selectedAgent} maxNotes={2} onAgentClick={(id) => {
                const a = AGENTS.find(a => a.id === id);
                if (a) setSelectedAgent(a);
              }} />
            </div>
          )}
        </div>

        {/* Column 3: DVM Marketplace */}
        <div className="w-80 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card/30">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-purple-400" />
              <span className="text-sm font-semibold">DVM Marketplace</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">{DVM_SERVICES.length} services</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {DVM_SERVICES.map((dvm) => {
                const agent = getAgentById(dvm.agent);
                return (
                  <Card key={dvm.id} className="bg-card/50 hover:bg-card/80 cursor-pointer transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot size={14} className="text-purple-400" />
                        <span className="text-sm font-medium">{dvm.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{dvm.description}</p>
                      <div className="flex items-center gap-2 mb-2">
                        {agent && (
                          <div className="flex items-center gap-1.5">
                              <img
                              src={agent.avatarUrl}
                              alt={agent.name}
                              className="w-5 h-5 rounded-full border"
                              style={{ borderColor: agent.color }}
                            />
                            <span className="text-xs">{agent.name}</span>
                            <TrustBadge score={agent.trust.composite} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-purple-400">
                          <Zap size={10} className="inline" /> {dvm.price} units
                        </span>
                        <span className="text-green-400">{dvm.successRate}% success</span>
                        <span className="text-muted-foreground">{dvm.jobsCompleted} jobs</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Kind badges */}
              <div className="p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">NIP-90 Event Kinds</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[9px]">kind:5001 Text</Badge>
                  <Badge variant="outline" className="text-[9px]">kind:5002 Route</Badge>
                  <Badge variant="outline" className="text-[9px]">kind:5003 Trust</Badge>
                  <Badge variant="outline" className="text-[9px]">kind:5004 Peer</Badge>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Column 4: Communities */}
        <div className="flex-1 flex flex-col min-w-[280px]">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card/30">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-green-400" />
              <span className="text-sm font-semibold">Communities</span>
            </div>
            <button className="p-1 rounded hover:bg-accent text-muted-foreground">
              <Plus size={14} />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {COMMUNITIES.map((comm) => (
                <Card key={comm.id} className="bg-card/50 hover:bg-card/80 cursor-pointer transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Hash size={14} className="text-green-400" />
                      <span className="text-sm font-medium">{comm.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{comm.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {comm.members}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            comm.activity === "high" ? "text-green-400 border-green-800/50" :
                            comm.activity === "medium" ? "text-amber-400 border-amber-800/50" :
                            "text-muted-foreground"
                          }`}
                        >
                          {comm.activity}
                        </Badge>
                      </div>
                      {comm.paymentGated && (
                        <Badge className="text-[9px] bg-purple-900/40 text-purple-300 border-purple-800/50">
                          <Zap size={8} className="mr-0.5" /> {comm.gateAmount} units
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* NIP-72 info */}
              <div className="p-3 rounded-lg border border-dashed border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Communities use NIP-72</p>
                <p className="text-[10px] text-muted-foreground mt-1">Payment gates via ILP (Epic 14)</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
