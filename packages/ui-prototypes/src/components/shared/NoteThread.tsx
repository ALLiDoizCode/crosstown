import { NoteCard } from "./NoteCard";
import type { SocialNote } from "@/data/mock-social";

interface NoteThreadProps {
  notes: SocialNote[];
  onAgentClick?: (agentId: string) => void;
}

export function NoteThread({ notes, onAgentClick }: NoteThreadProps) {
  if (notes.length === 0) return null;
  const [root, ...replies] = notes;

  return (
    <div className="space-y-0">
      <NoteCard note={root} onAgentClick={onAgentClick} replyCount={replies.length} />
      {replies.length > 0 && (
        <div className="ml-5 pl-4 border-l-2 border-border/40 space-y-1 pt-1">
          {replies.map(reply => (
            <NoteCard key={reply.id} note={reply} onAgentClick={onAgentClick} compact />
          ))}
        </div>
      )}
    </div>
  );
}
