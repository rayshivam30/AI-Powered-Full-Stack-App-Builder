import { useMemo } from 'react';
import { ChatEvent, ChatEventType } from '@/lib/types';

function extractAttr(tagStr: string, attrName: string): string | undefined {
  const regex = new RegExp(`${attrName}\\s*=\\s*["']?([^"'>\\s]+)`, 'i');
  const match = regex.exec(tagStr);
  return match ? match[1] : undefined;
}

// Non-greedy tag regex that looks ahead to the next opening/closing XML tag or end of string
const TAG_REGEX = /<(tool|message|file)(?:\s+[^>]*)?>([\s\S]*?)(?=<\/?(?:tool|message|file)\b|$)/gi;

export const useStreamParser = (streamBuffer: string) => {
  return useMemo(() => {
    const events: ChatEvent[] = [];
    if (!streamBuffer) return events;

    let match: RegExpExecArray | null;
    TAG_REGEX.lastIndex = 0;

    while ((match = TAG_REGEX.exec(streamBuffer)) !== null) {
      const [fullMatch, tagName, rawTagContent] = match;

      if (!tagName) continue;

      const typeStr = tagName.toLowerCase();
      const openTagEnd = fullMatch.indexOf('>');
      const openTagMatch = openTagEnd !== -1 ? fullMatch.substring(0, openTagEnd + 1) : fullMatch;

      // Clean out closing tag if present at the end of content
      let content = rawTagContent.replace(new RegExp(`</${typeStr}>$`, 'i'), '').trim();

      if (typeStr === 'tool') {
        const argsVal = extractAttr(openTagMatch, 'args');
        events.push({
          type: ChatEventType.TOOL_LOG,
          content: content,
          metadata: argsVal || "Workspace",
        });
      } else if (typeStr === 'file') {
        const pathVal = extractAttr(openTagMatch, 'path');
        events.push({
          type: ChatEventType.FILE_EDIT,
          content: "",
          filePath: pathVal || "src/App.tsx",
        });
      } else if (typeStr === 'message') {
        if (content) {
          events.push({
            type: ChatEventType.MESSAGE,
            content: content,
          });
        }
      }
    }

    return events;
  }, [streamBuffer]);
};