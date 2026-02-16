import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TrustBadge } from "./TrustBadge";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/data/mock-agents";

interface AgentHoverCardProps {
  agent: Agent;
  children: React.ReactNode;
}

export function AgentHoverCard({ agent, children }: AgentHoverCardProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72" side="top" sideOffset={8}>
        <div className="flex gap-3">
          <img
            src={agent.avatarUrl}
            alt={agent.name}
            className="w-12 h-12 rounded-full border-2"
            style={{ borderColor: agent.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{agent.name}</p>
            <p className="text-xs text-muted-foreground truncate">{agent.nip05}</p>
            <div className="flex items-center gap-2 mt-1">
              <TrustBadge score={agent.trust.composite} />
              <Badge variant="outline" className="text-[10px] capitalize">{agent.role}</Badge>
            </div>
          </div>
        </div>
        {agent.bio && (
          <p className="text-xs text-muted-foreground mt-2 leading-snug line-clamp-2">{agent.bio}</p>
        )}
        <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 pt-3 border-t border-border/50">
          <div>
            <p className="font-bold">{agent.followingCount}</p>
            <p className="text-[10px] text-muted-foreground">Following</p>
          </div>
          <div>
            <p className="font-bold">{agent.followerCount}</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </div>
          <div>
            <p className="font-bold">{agent.postCount}</p>
            <p className="text-[10px] text-muted-foreground">Notes</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 font-mono truncate">{agent.ilpAddress}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
