import Anthropic from "@anthropic-ai/sdk";

export interface CheckpointExtraction {
  stats: { label: string; value: string; note: string | null }[];
  decisions: { title: string; owner: string | null; detail: string | null; dueLabel: string | null }[];
  commitments: { periodLabel: string; ownerLabel: string; items: string[]; accent: boolean }[];
  measures: { measureName: string; todayValue: string; afterValue: string; baselinedWhen: string | null }[];
}

/** Every "Integration required" message this feature can surface is the
 * same one CheckpointSourceFileRow.tsx already shows for a missing key --
 * this function is the only place that string lives, so there's exactly
 * one thing to update once a real key is added. */
export const AUTO_MAP_INTEGRATION_REQUIRED_MESSAGE =
  "Integration required: reading this file and mapping it into the sections above needs a real AI provider (e.g. an Anthropic API key), which isn't configured yet. The file is saved — add the key, then this can run for real.";

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_checkpoint_extraction",
  description:
    "Record every build-progress stat, decision, weekly commitment, and baseline measure found in this checkpoint document. Use the document's own wording. Leave an array empty if the document doesn't cover that section -- never invent a row.",
  input_schema: {
    type: "object",
    properties: {
      stats: {
        type: "array",
        description: "Build-progress stats, e.g. migrations done, rows loaded, tests passing, days to cutover.",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            note: { type: "string" },
          },
          required: ["label", "value"],
        },
      },
      decisions: {
        type: "array",
        description: "Decisions log items, open or closed, each with an owner and optionally a due label.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            owner: { type: "string" },
            detail: { type: "string" },
            due_label: { type: "string" },
          },
          required: ["title"],
        },
      },
      commitments: {
        type: "array",
        description: "This week / next week commitment cards, from either side of the engagement.",
        items: {
          type: "object",
          properties: {
            period_label: { type: "string" },
            owner_label: { type: "string" },
            items: { type: "array", items: { type: "string" } },
            accent: { type: "boolean", description: "true only if the document visually highlights this card." },
          },
          required: ["period_label", "owner_label", "items"],
        },
      },
      measures: {
        type: "array",
        description: "Baseline before/after measures the project holds itself to.",
        items: {
          type: "object",
          properties: {
            measure_name: { type: "string" },
            today_value: { type: "string" },
            after_value: { type: "string" },
            baselined_when: { type: "string" },
          },
          required: ["measure_name", "today_value", "after_value"],
        },
      },
    },
    required: ["stats", "decisions", "commitments", "measures"],
  },
};

interface RawExtraction {
  stats?: { label: string; value: string; note?: string | null }[];
  decisions?: { title: string; owner?: string | null; detail?: string | null; due_label?: string | null }[];
  commitments?: { period_label: string; owner_label: string; items?: string[]; accent?: boolean }[];
  measures?: { measure_name: string; today_value: string; after_value: string; baselined_when?: string | null }[];
}

/** Reads one uploaded checkpoint source file (a PDF or PNG deck) with
 * Claude and returns every row it found, structured to match this
 * project's own checkpoint tables. Throws AUTO_MAP_INTEGRATION_REQUIRED_
 * MESSAGE verbatim when no key is configured, so the caller can show
 * exactly the same explanation the button already gave before this was
 * built for real. */
export async function extractCheckpointDataFromFile(input: { base64: string; mimeType: string }): Promise<CheckpointExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error(AUTO_MAP_INTEGRATION_REQUIRED_MESSAGE);

  const client = new Anthropic({ apiKey });
  const documentBlock: Anthropic.ContentBlockParam =
    input.mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.base64 } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: input.mimeType === "image/jpeg" ? "image/jpeg" : "image/png",
            data: input.base64,
          },
        };

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          documentBlock,
          {
            type: "text",
            text: "This is a client delivery checkpoint deck or engineering status update. Call record_checkpoint_extraction with everything it contains. Use the document's own wording for labels, values, owners, and dates -- don't invent anything that isn't in the document, and leave a section's array empty if the document doesn't cover it.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("The AI provider didn't return structured data for this file. Try again, or enter the numbers by hand.");
  }

  const raw = toolUse.input as RawExtraction;
  return {
    stats: (raw.stats ?? []).map((s) => ({ label: s.label, value: s.value, note: s.note ?? null })),
    decisions: (raw.decisions ?? []).map((d) => ({
      title: d.title,
      owner: d.owner ?? null,
      detail: d.detail ?? null,
      dueLabel: d.due_label ?? null,
    })),
    commitments: (raw.commitments ?? []).map((c) => ({
      periodLabel: c.period_label,
      ownerLabel: c.owner_label,
      items: Array.isArray(c.items) ? c.items : [],
      accent: c.accent === true,
    })),
    measures: (raw.measures ?? []).map((m) => ({
      measureName: m.measure_name,
      todayValue: m.today_value,
      afterValue: m.after_value,
      baselinedWhen: m.baselined_when ?? null,
    })),
  };
}
