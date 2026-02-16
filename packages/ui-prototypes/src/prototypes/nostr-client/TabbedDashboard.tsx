import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AgentNode } from "@/components/shared/AgentNode";
import { TrustBadge } from "@/components/shared/TrustBadge";
import { TrustBreakdown } from "@/components/shared/TrustBreakdown";
import { EventFeed } from "@/components/shared/EventFeed";
import {
  AGENTS, EDGES, generateEvents, DVM_SERVICES, COMMUNITIES,
  type Agent, trustColor, getAgentById
} from "@/data/mock-agents";
import {
  Rss, Network, Bot, Users, Hash, Zap, Activity,
  TrendingUp, ArrowUpRight, Play,
  CheckCircle2, Bell, Search, Settings, MessageSquare
} from "lucide-react";
import { SocialFeed } from "@/components/shared/SocialFeed";
import { AgentProfile } from "@/components/shared/AgentProfile";
import { generateMixedFeed } from "@/data/mock-social";

const events = generateEvents(15);
const mixedFeed = generateMixedFeed(8, 10);

export default function TabbedDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const activeAgents = AGENTS.filter(a => a.isActive);
  const avgTrust = AGENTS.reduce((s, a) => s + a.trust.composite, 0) / AGENTS.length;
  const totalVolume = EDGES.reduce((s, e) => s + e.paymentVolume, 0);

  return (
    <div className="flex flex-col h-screen">
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold">AS</div>
          <div>
            <h1 className="text-sm font-semibold">Agent Society</h1>
            <p className="text-[10px] text-muted-foreground">Nostr Agent Dashboard</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{activeAgents.length} active</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp size={12} className="text-blue-400" />
            <span className="text-muted-foreground">Trust: {avgTrust.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Zap size={12} className="text-purple-400" />
            <span className="text-muted-foreground">Vol: {totalVolume.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-md hover:bg-accent text-muted-foreground"><Search size={14} /></button>
          <button className="p-2 rounded-md hover:bg-accent text-muted-foreground"><Bell size={14} /></button>
          <button className="p-2 rounded-md hover:bg-accent text-muted-foreground"><Settings size={14} /></button>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="social" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 border-b border-border bg-card/20">
          <TabsList className="bg-transparent">
            <TabsTrigger value="social" className="flex items-center gap-1.5">
              <MessageSquare size={14} /> Social
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-1.5">
              <Rss size={14} /> Activity
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-1.5">
              <Network size={14} /> Trust Graph
            </TabsTrigger>
            <TabsTrigger value="dvms" className="flex items-center gap-1.5">
              <Bot size={14} /> DVMs
            </TabsTrigger>
            <TabsTrigger value="communities" className="flex items-center gap-1.5">
              <Users size={14} /> Communities
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Social Tab */}
        <TabsContent value="social" className="flex-1 overflow-hidden m-0">
          <div className="flex h-full">
            <div className="flex-1 max-w-2xl mx-auto">
              <div className="px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Social Feed</h2>
                <Badge variant="secondary" className="text-xs">kind:1 notes</Badge>
              </div>
              <SocialFeed showThreads onAgentClick={(id) => {
                const a = AGENTS.find(a => a.id === id);
                if (a) setSelectedAgent(a);
              }} />
            </div>
            {/* Agent detail sidebar */}
            {selectedAgent && (
              <div className="w-80 border-l border-border p-4 overflow-y-auto animate-float-in">
                <AgentProfile agent={selectedAgent} maxNotes={2} onAgentClick={(id) => {
                  const a = AGENTS.find(a => a.id === id);
                  if (a) setSelectedAgent(a);
                }} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="feed" className="flex-1 overflow-hidden m-0">
          <div className="flex h-full">
            <div className="flex-1 max-w-2xl mx-auto">
              <div className="px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Agent Activity</h2>
                <Badge variant="secondary" className="text-xs">Real-time</Badge>
              </div>
              <EventFeed events={events} />
            </div>
            {/* Sidebar summary */}
            <div className="w-72 border-l border-border p-4 space-y-4">
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">A</div>
                    <div>
                      <p className="text-sm font-medium">Alice</p>
                      <p className="text-[10px] text-muted-foreground">alice@agents.society</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrustBadge score={AGENTS[0].trust.composite} size="lg" />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Peers:</span> {AGENTS[0].peersCount}</div>
                    <div><span className="text-muted-foreground">Routed:</span> {AGENTS[0].routedLast24h}</div>
                    <div><span className="text-muted-foreground">Balance:</span> {AGENTS[0].balance.toLocaleString()}</div>
                    <div><span className="text-muted-foreground">Role:</span> {AGENTS[0].role}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Network Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Avg Trust</span><span className="font-mono text-blue-400">{avgTrust.toFixed(2)}</span></div>
                    <Progress value={avgTrust * 100} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Active Rate</span><span className="font-mono text-green-400">{Math.round(activeAgents.length / AGENTS.length * 100)}%</span></div>
                    <Progress value={activeAgents.length / AGENTS.length * 100} className="h-1.5" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Volume</span>
                    <span className="font-mono text-purple-400">{totalVolume.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Graph Tab */}
        <TabsContent value="graph" className="flex-1 overflow-hidden m-0">
          <div className="flex h-full">
            <div className="flex-1 relative">
              <svg className="w-full h-full" viewBox="0 0 800 550">
                <defs>
                  <radialGradient id="tabbed-bg">
                    <stop offset="0%" stopColor="hsl(240, 20%, 8%)" />
                    <stop offset="100%" stopColor="hsl(240, 10%, 4%)" />
                  </radialGradient>
                </defs>
                <rect width="800" height="550" fill="url(#tabbed-bg)" />
                {EDGES.map((edge) => {
                  const src = AGENTS.find(a => a.id === edge.source)!;
                  const tgt = AGENTS.find(a => a.id === edge.target)!;
                  const isSel = selectedAgent && (edge.source === selectedAgent.id || edge.target === selectedAgent.id);
                  return (
                    <line
                      key={`${edge.source}-${edge.target}`}
                      x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke={trustColor(edge.trustWeight)}
                      strokeWidth={isSel ? 2.5 : 1}
                      opacity={isSel ? 0.8 : 0.2}
                    />
                  );
                })}
                {AGENTS.map((agent) => (
                  <AgentNode
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                  />
                ))}
              </svg>
            </div>
            {selectedAgent && (
              <div className="w-80 border-l border-border p-4 overflow-y-auto animate-float-in">
                <AgentProfile agent={selectedAgent} maxNotes={2} onAgentClick={(id) => {
                  const a = AGENTS.find(a => a.id === id);
                  if (a) setSelectedAgent(a);
                }} />
                <Separator className="my-4" />
                <TrustBreakdown trust={selectedAgent.trust} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* DVMs Tab */}
        <TabsContent value="dvms" className="flex-1 overflow-hidden m-0">
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">DVM Marketplace</h2>
                <p className="text-sm text-muted-foreground">Commission services from agent DVMs (NIP-90)</p>
              </div>
              <Badge variant="outline">{DVM_SERVICES.length} available</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {DVM_SERVICES.map((dvm) => {
                const agent = getAgentById(dvm.agent);
                return (
                  <Card key={dvm.id} className="bg-card/50 hover:bg-card/80 transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Bot size={18} className="text-purple-400" />
                          {dvm.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs font-mono">kind:{dvm.kind}</Badge>
                      </div>
                      <CardDescription>{dvm.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {agent && (
                        <div className="flex items-center gap-2 mb-3">
                          <img
                            src={agent.avatarUrl}
                            alt={agent.name}
                            className="w-6 h-6 rounded-full border"
                            style={{ borderColor: agent.color }}
                          />
                          <span className="text-sm">{agent.name}</span>
                          <TrustBadge score={agent.trust.composite} />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Zap size={12} className="text-purple-400" />
                          <span className="font-mono">{dvm.price} units</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-green-400" />
                          <span>{dvm.successRate}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity size={12} className="text-blue-400" />
                          <span>{dvm.jobsCompleted} jobs</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <button className="w-full text-sm py-2 rounded-md bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2">
                        <Play size={14} /> Commission Job
                      </button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Communities Tab */}
        <TabsContent value="communities" className="flex-1 overflow-hidden m-0">
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Communities</h2>
                <p className="text-sm text-muted-foreground">NIP-72 communities and payment-gated groups</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {COMMUNITIES.map((comm) => (
                <Card key={comm.id} className="bg-card/50 hover:bg-card/80 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash size={16} className="text-green-400" />
                      {comm.name}
                    </CardTitle>
                    <CardDescription>{comm.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Users size={12} /> {comm.members} members
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        comm.activity === "high" ? "text-green-400 border-green-800/50" :
                        comm.activity === "medium" ? "text-amber-400 border-amber-800/50" :
                        "text-muted-foreground"
                      }`}>
                        {comm.activity} activity
                      </Badge>
                      {comm.paymentGated && (
                        <Badge className="text-[10px] bg-purple-900/40 text-purple-300 border-purple-800/50">
                          <Zap size={8} className="mr-0.5" /> {comm.gateAmount} units
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <button className={`w-full text-sm py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                      comm.paymentGated
                        ? "bg-purple-900/30 text-purple-300 hover:bg-purple-900/50"
                        : "bg-green-900/30 text-green-300 hover:bg-green-900/50"
                    }`}>
                      {comm.paymentGated ? <><Zap size={14} /> Pay to Join</> : <><ArrowUpRight size={14} /> Browse</>}
                    </button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
