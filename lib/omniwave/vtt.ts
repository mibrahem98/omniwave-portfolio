export type VttCue = { startSeconds: number; endSeconds: number; text: string };
export type VttSearchResult = VttCue & { index: number };

const MAX_CUES = 5_000;
const MAX_CUE_TEXT = 1_500;
const MAX_SEARCH_RESULTS = 40;

function parseTimestamp(value: string) {
  const parts = value.trim().replace(",", ".").split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part)) || parts.length < 2 || parts.length > 3) return null;
  const seconds = parts.length === 3 ? parts[0] * 3_600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  return seconds >= 0 && seconds <= 86_400 ? seconds : null;
}

function cleanCueText(lines: string[]) {
  return lines.join("\n").replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().replace(/\n{3,}/g, "\n\n").slice(0, MAX_CUE_TEXT);
}

/** Parses a bounded local WebVTT payload; invalid blocks are ignored rather than rendered. */
export function parseWebVtt(source: string): VttCue[] {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!normalized.trimStart().startsWith("WEBVTT")) return [];
  const blocks = normalized.split(/\n{2,}/);
  const cues: VttCue[] = [];
  for (const block of blocks.slice(1)) {
    if (cues.length >= MAX_CUES) break;
    const lines = block.split("\n").map((line) => line.trimEnd());
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [startRaw, endWithSettings] = lines[timingIndex].split("-->");
    const [endRaw] = endWithSettings.trim().split(/\s+/);
    const startSeconds = parseTimestamp(startRaw);
    const endSeconds = parseTimestamp(endRaw);
    const text = cleanCueText(lines.slice(timingIndex + 1));
    if (startSeconds === null || endSeconds === null || endSeconds <= startSeconds || !text) continue;
    cues.push({ startSeconds, endSeconds, text });
  }
  return cues;
}

/** Searches bounded local VTT cues without retaining or transmitting the query. */
export function searchVttCues(cues: VttCue[], query: string): VttSearchResult[] {
  const normalizedQuery = query.replace(/[\u0000-\u001F]/g, "").trim().toLocaleLowerCase().slice(0, 120);
  if (!normalizedQuery) return [];
  const matches: VttSearchResult[] = [];
  for (let index = 0; index < cues.length && matches.length < MAX_SEARCH_RESULTS; index += 1) {
    const cue = cues[index];
    if (cue.text.toLocaleLowerCase().includes(normalizedQuery)) matches.push({ ...cue, index });
  }
  return matches;
}
