import { describe, expect, it } from "vitest";

import { parseWebVtt, searchVttCues } from "../lib/omniwave/vtt";

describe("local WebVTT parsing", () => {
  it("parses ordered, timed local caption cues and removes markup", () => {
    const cues = parseWebVtt("WEBVTT\n\nintro\n00:00:01.200 --> 00:00:03.750 align:center\n<b>Hello</b> world\n\n00:01:00.000 --> 00:01:02.000\nSecond line");
    expect(cues).toEqual([
      { startSeconds: 1.2, endSeconds: 3.75, text: "Hello world" },
      { startSeconds: 60, endSeconds: 62, text: "Second line" },
    ]);
  });

  it("ignores malformed data instead of rendering arbitrary text", () => {
    expect(parseWebVtt("not a VTT file")).toEqual([]);
    expect(parseWebVtt("WEBVTT\n\n00:00:03.000 --> 00:00:01.000\nInvalid")).toEqual([]);
  });

  it("searches local cues and preserves the cue time for direct navigation", () => {
    const cues = parseWebVtt("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nAurora rises\n\n00:00:05.000 --> 00:00:08.000\nThe wave returns");
    expect(searchVttCues(cues, "WAVE")).toEqual([{ index: 1, startSeconds: 5, endSeconds: 8, text: "The wave returns" }]);
  });

  it("does not return matches for an empty or control-character-only query", () => {
    const cues = [{ startSeconds: 1, endSeconds: 2, text: "Local text" }];
    expect(searchVttCues(cues, " \u0000 ")).toEqual([]);
  });
});
