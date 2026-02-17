import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { lazy, Suspense } from "react";
import { Network, Sparkles, Rss, ArrowRight } from "lucide-react";

const TrustGraphExplorer = lazy(() => import("@/prototypes/observatory/TrustGraphExplorer"));
const SplitObservatory = lazy(() => import("@/prototypes/observatory/SplitObservatory"));
const TrustWeatherMap = lazy(() => import("@/prototypes/observatory/TrustWeatherMap"));
const ColonyOverview = lazy(() => import("@/prototypes/colony/ColonyOverview"));
const AgentNeedsDashboard = lazy(() => import("@/prototypes/colony/AgentNeedsDashboard"));
const LivingEcosystem = lazy(() => import("@/prototypes/colony/LivingEcosystem"));
const MultiColumnFeed = lazy(() => import("@/prototypes/nostr-client/MultiColumnFeed"));
const TabbedDashboard = lazy(() => import("@/prototypes/nostr-client/TabbedDashboard"));
const UnifiedFeedSidebar = lazy(() => import("@/prototypes/nostr-client/UnifiedFeedSidebar"));

function Loading() {
  return (
    <div className="flex h-screen">
      {/* Simulated sidebar skeleton */}
      <div className="w-64 border-r border-border p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-20" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 100}ms` }}>
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Main area skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

const PARADIGMS = [
  {
    id: "observatory",
    title: "Social Graph Observatory",
    description: "Interactive force-directed trust graph with contextual feeds. The graph is the map; events are the narrative.",
    icon: Network,
    color: "from-blue-600 to-cyan-600",
    badge: "Recommended",
    prototypes: [
      { path: "/observatory/trust-graph", name: "1A: Trust Graph Explorer", desc: "Click-to-inspect force-directed graph with progressive disclosure agent profiles" },
      { path: "/observatory/split", name: "1B: Split Observatory", desc: "Graph + real-time activity feed in a split-pane layout" },
      { path: "/observatory/weather", name: "1C: Trust Weather Map", desc: "Heat map overlay with payment flow particles and ambient weather effects" },
    ],
  },
  {
    id: "colony",
    title: "Agent Colony Dashboard",
    description: "God game-inspired spatial environment. Agents have visible needs, the colony tells emergent stories.",
    icon: Sparkles,
    color: "from-amber-600 to-orange-600",
    prototypes: [
      { path: "/colony/overview", name: "2A: Colony Overview", desc: "Agent cards with RimWorld-style needs bars and narrative sidebar" },
      { path: "/colony/needs", name: "2B: Agent Needs Dashboard", desc: "Detailed needs panel per agent — liquidity, peers, routes, trust health" },
      { path: "/colony/ecosystem", name: "2C: Living Ecosystem", desc: "Organic visual style with ambient animations and cycling narrative timeline" },
    ],
  },
  {
    id: "nostr-client",
    title: "Nostr-Native Agent Client",
    description: "TweetDeck-style multi-column client filtered to agent activity. Familiar to Nostr users.",
    icon: Rss,
    color: "from-purple-600 to-indigo-600",
    prototypes: [
      { path: "/nostr/multi-column", name: "3A: Multi-Column Feed", desc: "Four simultaneous columns: Feed, Trust Graph, DVMs, Communities" },
      { path: "/nostr/tabbed", name: "3B: Tabbed Dashboard", desc: "Clean tab-based interface with Feed, Graph, DVM Marketplace, and Communities" },
      { path: "/nostr/unified", name: "3C: Unified Feed + Sidebar", desc: "Single filtered feed with contextual sidebar (Network/Agent/Discovery)" },
    ],
  },
];

function Home() {
  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="text-center mb-12 animate-float-in">
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Crosstown UI Prototypes
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          9 interactive prototypes across 3 UI paradigms for the Crosstown Protocol.
          Each demonstrates how humans can observe, curate, and participate in agent social/financial activity on Nostr + ILP.
        </p>
      </div>

      <div className="space-y-10">
        {PARADIGMS.map((paradigm, pi) => {
          const Icon = paradigm.icon;
          return (
            <div key={paradigm.id} className="animate-float-in" style={{ animationDelay: `${pi * 150}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${paradigm.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {paradigm.title}
                    {paradigm.badge && <Badge className="text-[10px]">{paradigm.badge}</Badge>}
                  </h2>
                  <p className="text-sm text-muted-foreground">{paradigm.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {paradigm.prototypes.map((proto, i) => (
                  <Link key={proto.path} to={proto.path} className="block group" style={{ animationDelay: `${(pi * 3 + i) * 80}ms` }}>
                    <Card className="h-full bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-all group-hover:ring-1 group-hover:ring-border group-hover:shadow-lg group-hover:shadow-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          {proto.name}
                          <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </CardTitle>
                        <CardDescription className="text-xs">{proto.desc}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-12 text-xs text-muted-foreground">
        <p>Built with React + shadcn/ui + Tailwind CSS v4 | Mock data only</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/observatory/trust-graph" element={<TrustGraphExplorer />} />
          <Route path="/observatory/split" element={<SplitObservatory />} />
          <Route path="/observatory/weather" element={<TrustWeatherMap />} />
          <Route path="/colony/overview" element={<ColonyOverview />} />
          <Route path="/colony/needs" element={<AgentNeedsDashboard />} />
          <Route path="/colony/ecosystem" element={<LivingEcosystem />} />
          <Route path="/nostr/multi-column" element={<MultiColumnFeed />} />
          <Route path="/nostr/tabbed" element={<TabbedDashboard />} />
          <Route path="/nostr/unified" element={<UnifiedFeedSidebar />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
