import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ActivityEvent } from "@/data/mock-agents";
import { Zap, Link2, Shield, MessageCircle, Star, Bot, Search, FileText, UserPlus, Repeat2 } from "lucide-react";

const EVENT_ICONS: Record<ActivityEvent["type"], typeof Zap> = {
  zap: Zap,
  spsp_handshake: Link2,
  settlement: Shield,
  trust_update: Star,
  reaction: MessageCircle,
  dvm_job: Bot,
  peer_discovery: Search,
  note: FileText,
  follow: UserPlus,
  repost: Repeat2,
};

const EVENT_COLORS: Record<ActivityEvent["type"], string> = {
  zap: "text-purple-400",
  spsp_handshake: "text-cyan-400",
  settlement: "text-green-400",
  trust_update: "text-yellow-400",
  reaction: "text-pink-400",
  dvm_job: "text-blue-400",
  peer_discovery: "text-teal-400",
  note: "text-indigo-400",
  follow: "text-sky-400",
  repost: "text-emerald-400",
};

const EVENT_BADGE_COLORS: Record<ActivityEvent["type"], string> = {
  zap: "bg-purple-900/40 text-purple-300 border-purple-800/50",
  spsp_handshake: "bg-cyan-900/40 text-cyan-300 border-cyan-800/50",
  settlement: "bg-green-900/40 text-green-300 border-green-800/50",
  trust_update: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50",
  reaction: "bg-pink-900/40 text-pink-300 border-pink-800/50",
  dvm_job: "bg-blue-900/40 text-blue-300 border-blue-800/50",
  peer_discovery: "bg-teal-900/40 text-teal-300 border-teal-800/50",
  note: "bg-indigo-900/40 text-indigo-300 border-indigo-800/50",
  follow: "bg-sky-900/40 text-sky-300 border-sky-800/50",
  repost: "bg-emerald-900/40 text-emerald-300 border-emerald-800/50",
};

function formatTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

interface EventFeedProps {
  events: ActivityEvent[];
  onEventHover?: (agentId: string | null) => void;
  compact?: boolean;
}

export function EventFeed({ events, onEventHover, compact }: EventFeedProps) {
  return (
    <ScrollArea className="h-full">
      <div className={`space-y-${compact ? "1" : "2"} ${compact ? "p-2" : "p-3"}`}>
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.type];
          const colorClass = EVENT_COLORS[event.type];
          return (
            <div
              key={event.id}
              className="flex gap-3 rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-accent/30 animate-float-in"
              onMouseEnter={() => onEventHover?.(event.sourceAgent)}
              onMouseLeave={() => onEventHover?.(null)}
            >
              <div className={`mt-0.5 ${colorClass}`}>
                <Icon size={compact ? 14 : 16} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className={`${compact ? "text-xs" : "text-sm"} leading-snug`}>
                  {event.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${EVENT_BADGE_COLORS[event.type]}`}>
                    {event.type.replace("_", " ")}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{formatTime(event.timestamp)}</span>
                  {event.amount && (
                    <span className="text-[10px] font-mono text-purple-400">{event.amount} units</span>
                  )}
                </div>
                {event.details && !compact && (
                  <p className="text-xs text-muted-foreground mt-1">{event.details}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
