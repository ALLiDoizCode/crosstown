import { Badge } from "@/components/ui/badge";
import { ReactionBar } from "./ReactionBar";
import { getAgentById } from "@/data/mock-agents";
import type { SocialNote } from "@/data/mock-social";
import { MessageCircle } from "lucide-react";

function formatNoteTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface NoteCardProps {
  note: SocialNote;
  onAgentClick?: (agentId: string) => void;
  replyCount?: number;
  compact?: boolean;
}

export function NoteCard({ note, onAgentClick, replyCount, compact }: NoteCardProps) {
  const author = getAgentById(note.authorId);
  if (!author) return null;

  return (
    <div className="flex gap-3 rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-accent/20 animate-float-in">
      <img
        src={author.avatarUrl}
        alt={author.name}
        className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded-full border-2 shrink-0 cursor-pointer`}
        style={{ borderColor: author.color }}
        onClick={() => onAgentClick?.(author.id)}
      />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="font-medium text-sm hover:underline cursor-pointer"
            onClick={() => onAgentClick?.(author.id)}
          >
            {author.name}
          </span>
          <span className="text-xs text-muted-foreground">{author.nip05}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{formatNoteTime(note.timestamp)}</span>
        </div>

        {note.replyTo && (
          <p className="text-[10px] text-muted-foreground">
            Replying to thread
          </p>
        )}

        <p className={`${compact ? "text-xs" : "text-sm"} leading-relaxed text-foreground/90`}>
          {note.content}
        </p>

        {note.tags.length > 0 && !compact && (
          <div className="flex gap-1 flex-wrap">
            {note.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <ReactionBar likes={note.reactions.likes} zaps={note.reactions.zaps} reposts={note.reactions.reposts} />
          {replyCount !== undefined && replyCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle size={12} />
              {replyCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
