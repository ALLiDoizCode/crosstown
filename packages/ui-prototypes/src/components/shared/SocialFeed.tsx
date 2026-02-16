import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteCard } from "./NoteCard";
import { NoteThread } from "./NoteThread";
import type { SocialNote } from "@/data/mock-social";
import { SOCIAL_NOTES } from "@/data/mock-social";

interface SocialFeedProps {
  notes?: SocialNote[];
  onAgentClick?: (agentId: string) => void;
  showThreads?: boolean;
}

export function SocialFeed({ notes, onAgentClick, showThreads }: SocialFeedProps) {
  const rootNotes = (notes ?? SOCIAL_NOTES)
    .filter(n => !n.replyTo)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {rootNotes.map(note => {
          if (showThreads) {
            const replies = SOCIAL_NOTES
              .filter(n => n.replyTo === note.id)
              .sort((a, b) => a.timestamp - b.timestamp);
            if (replies.length > 0) {
              return <NoteThread key={note.id} notes={[note, ...replies]} onAgentClick={onAgentClick} />;
            }
          }
          const replyCount = SOCIAL_NOTES.filter(n => n.replyTo === note.id).length;
          return <NoteCard key={note.id} note={note} onAgentClick={onAgentClick} replyCount={replyCount} />;
        })}
      </div>
    </ScrollArea>
  );
}
