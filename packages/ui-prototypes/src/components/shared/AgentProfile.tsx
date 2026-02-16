import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "./TrustBadge";
import { NoteCard } from "./NoteCard";
import type { Agent } from "@/data/mock-agents";
import { getNotesByAuthor } from "@/data/mock-social";
import { Users, UserPlus, FileText, Globe, Zap } from "lucide-react";

interface AgentProfileProps {
  agent: Agent;
  onAgentClick?: (agentId: string) => void;
  maxNotes?: number;
}

export function AgentProfile({ agent, onAgentClick, maxNotes = 3 }: AgentProfileProps) {
  const recentNotes = getNotesByAuthor(agent.id).slice(0, maxNotes);

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="flex items-start gap-3">
        <img
          src={agent.avatarUrl}
          alt={agent.name}
          className="w-14 h-14 rounded-full border-2"
          style={{ borderColor: agent.color }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg">{agent.name}</h3>
          <p className="text-xs text-muted-foreground">{agent.nip05}</p>
          <div className="flex items-center gap-2 mt-1">
            <TrustBadge score={agent.trust.composite} />
            <Badge variant="outline" className="text-[10px] capitalize">{agent.role}</Badge>
            {agent.isActive ? (
              <Badge className="bg-green-900/40 text-green-300 border-green-800/50 text-[10px]">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Offline</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-foreground/80 leading-relaxed">{agent.bio}</p>

      {agent.website && (
        <p className="text-xs text-blue-400 flex items-center gap-1">
          <Globe size={10} />
          {agent.website}
        </p>
      )}

      {/* Social stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-secondary/50 p-2">
          <p className="text-sm font-bold flex items-center justify-center gap-1">
            <UserPlus size={12} className="text-blue-400" />
            {agent.followingCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Following</p>
        </div>
        <div className="rounded-md bg-secondary/50 p-2">
          <p className="text-sm font-bold flex items-center justify-center gap-1">
            <Users size={12} className="text-cyan-400" />
            {agent.followerCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Followers</p>
        </div>
        <div className="rounded-md bg-secondary/50 p-2">
          <p className="text-sm font-bold flex items-center justify-center gap-1">
            <FileText size={12} className="text-green-400" />
            {agent.postCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Notes</p>
        </div>
      </div>

      {/* Infrastructure stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-secondary/50 p-2">
          <p className="text-sm font-bold">{agent.peersCount}</p>
          <p className="text-[10px] text-muted-foreground">Peers</p>
        </div>
        <div className="rounded-md bg-secondary/50 p-2">
          <p className="text-sm font-bold">{agent.routedLast24h}</p>
          <p className="text-[10px] text-muted-foreground">Routed</p>
        </div>
        <div className="rounded-md bg-secondary/50 p-2">
          <p className="text-sm font-bold flex items-center justify-center gap-1">
            <Zap size={10} className="text-purple-400" />
            {agent.balance.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">Balance</p>
        </div>
      </div>

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recent Notes
            </h4>
            <div className="space-y-2">
              {recentNotes.map(note => (
                <NoteCard key={note.id} note={note} onAgentClick={onAgentClick} compact />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
