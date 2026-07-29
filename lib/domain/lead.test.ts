import { describe, expect, it } from "vitest";
import { nextThreadSeq } from "./lead";

describe("nextThreadSeq", () => {
  it("starts at 1 when there are no leads", () => {
    expect(nextThreadSeq([])).toBe(1);
  });

  it("returns one above the highest LD-L sequence (not the count)", () => {
    expect(
      nextThreadSeq([
        { threadKey: "LD-L-0003" },
        { threadKey: "LD-L-0012" },
        { threadKey: "LD-L-0007" },
      ]),
    ).toBe(13);
  });

  it("ignores empty / malformed keys", () => {
    expect(
      nextThreadSeq([{ threadKey: "LD-L-0005" }, { threadKey: "" }, { threadKey: "garbage" }]),
    ).toBe(6);
  });
});
