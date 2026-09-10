-- Lets uploading one of the six signed artefacts (Scope brief, Quote,
-- Agreement, Manifest, Go-live pack, Tie-out certificate — see
-- src/lib/flightplan/document-kinds.ts) auto-confirm the matching, still-
-- open gate condition instead of requiring a second manual click on the
-- Flight plan check page. `met_via_document_id` records which document
-- did it, so the condition list can say "Confirmed from document" rather
-- than showing it as if a person clicked "Mark met" — and it's still
-- fully reversible: a workspace admin can revert it back to open exactly
-- like any other met condition (see revertGateCondition,
-- flight-plan-check/actions.ts), which is what makes doing this
-- automatically safe rather than a one-way guess.

alter table project_gate_conditions add column met_via_document_id uuid references documents (id) on delete set null;
