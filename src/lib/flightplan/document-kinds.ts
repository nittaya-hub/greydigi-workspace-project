/** The six signed artefacts named on page 3/4 of the aironauts flight
 * plan spine, each tied to the gate it clears — plus "internal" for
 * working files that are not one of the six. This is the single source
 * of truth for what a document's `kind` means; both the upload form and
 * every page that lists documents (Documents tab, flight-plan-check's
 * Document check tab) read from here so a file is tagged once and shown
 * the same way everywhere. Kind values already in the database from
 * before this taxonomy existed (e.g. "artefact", "baseline") are not
 * aliased into a gate — they display as-is with no gate badge, since
 * guessing their gate after the fact would misattribute them.
 *
 * `matchKeyword` is what lets uploading one of the six auto-confirm its
 * gate condition (documents/actions.ts's createDocument) — it's matched
 * against the condition's own description (normalized: lowercased,
 * punctuation collapsed to spaces) rather than a template_condition_id
 * foreign key, because the real seeded conditions (supabase/seed_nk_live.sql)
 * literally embed the artefact's name in their wording ("Scope brief
 * signed, carrying baseline...", "Quote signed", "Manifest v1 and
 * foundation schema delivered..."), which is the most durable thing to
 * match on if a team later rewords a condition's surrounding text. */
export const DOCUMENT_KINDS = [
  { value: "scope_brief", label: "Scope brief", gate: "G2", matchKeyword: "scope brief" },
  { value: "quote", label: "Quote", gate: "G2", matchKeyword: "quote" },
  { value: "agreement", label: "Agreement", gate: "G2", matchKeyword: "agreement" },
  { value: "manifest", label: "Manifest v1 & foundation schema", gate: "G3", matchKeyword: "manifest" },
  { value: "go_live_pack", label: "Go-live pack", gate: "G4", matchKeyword: "go live pack" },
  { value: "tie_out_certificate", label: "Tie-out certificate", gate: "G5", matchKeyword: "tie out certificate" },
  { value: "internal", label: "Internal / working file", gate: null, matchKeyword: null },
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]["value"];

const KIND_BY_VALUE = new Map(DOCUMENT_KINDS.map((k) => [k.value as string, k]));

export function documentKindLabel(kind: string): string {
  return KIND_BY_VALUE.get(kind)?.label ?? kind;
}

export function documentKindGate(kind: string): string | null {
  return KIND_BY_VALUE.get(kind)?.gate ?? null;
}

export function documentKindMatchKeyword(kind: string): string | null {
  return KIND_BY_VALUE.get(kind)?.matchKeyword ?? null;
}

/** Lowercases and collapses punctuation/hyphens to single spaces, so
 * "Go-live pack delivered..." matches the keyword "go live pack" and a
 * hyphen/spacing difference in how a condition happens to be worded
 * never breaks the match. */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
