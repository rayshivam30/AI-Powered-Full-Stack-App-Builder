import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Lightbulb, 
  Database, 
  FileCode,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { ChatEvent, ChatEventType } from '@/lib/types';

export const ChatEventRenderer = ({ event, isLoading }: { event: ChatEvent, isLoading?: boolean }) => {
  switch (event.type) {
    case ChatEventType.THOUGHT:
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-[13px] font-normal mb-2">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Lightbulb className="w-3.5 h-3.5 text-amber-400" />}
          <span>{event.content}</span>
        </div>
      );

    case ChatEventType.TOOL_LOG:
      return (
        <div className="flex items-center gap-2 my-1 text-xs text-muted-foreground bg-muted/20 px-2.5 py-1.5 rounded-md border border-border/30 w-fit">
          <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Reading</span>
          <span className="font-mono text-foreground font-medium px-1.5 py-0.5 bg-background/50 rounded border border-border/40">
            {event.metadata || event.content || "Workspace"}
          </span>
        </div>
      );

    case ChatEventType.FILE_EDIT:
      return (
        <div className="flex items-center gap-2 my-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs w-fit animate-in fade-in duration-200">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="font-medium text-emerald-400">
            {isLoading ? "Building" : "Built"}
          </span>
          <span className="font-mono text-foreground font-semibold px-2 py-0.5 bg-background/60 rounded border border-border/50 truncate max-w-[280px]">
            {event.filePath || "src/App.tsx"}
          </span>
        </div>
      );

    case ChatEventType.MESSAGE:
      return (
        <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed my-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {event.content}
          </ReactMarkdown>
          {isLoading && <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />}
        </div>
      );

    default:
      return null;
  }
};