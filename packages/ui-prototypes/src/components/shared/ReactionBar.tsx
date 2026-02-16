import { Heart, Zap, Repeat2 } from "lucide-react";

interface ReactionBarProps {
  likes: number;
  zaps: number;
  reposts: number;
}

export function ReactionBar({ likes, zaps, reposts }: ReactionBarProps) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1 hover:text-pink-400 transition-colors cursor-pointer">
        <Heart size={12} />
        {likes > 0 && likes}
      </span>
      <span className="flex items-center gap-1 hover:text-purple-400 transition-colors cursor-pointer">
        <Zap size={12} />
        {zaps > 0 && zaps}
      </span>
      <span className="flex items-center gap-1 hover:text-green-400 transition-colors cursor-pointer">
        <Repeat2 size={12} />
        {reposts > 0 && reposts}
      </span>
    </div>
  );
}
