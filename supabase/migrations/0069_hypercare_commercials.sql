-- Hypercare wave 4.4 (Commercials): margin per service needs two real
-- numbers this schema doesn't have anywhere today -- a numeric fee (the
-- existing `fee` column is free text, "SGD 4,000 / month", not something
-- arithmetic can run on) and a monthly running cost (nothing captures
-- this at all). Both are added as their own nullable numeric columns,
-- hand-entered by the Hypercare lead on the Service agreement card,
-- alongside the existing text `fee` field rather than replacing it --
-- `fee` stays free text for whatever a person wants to note ("quarterly
-- invoice, NET 30"), `fee_amount_monthly` holds the clean number the
-- Commercials screen actually computes from.
--
-- No client of this workspace has gone live into Hypercare yet (Gate 5
-- hasn't fired for any real mission), so there is no real figure to
-- backfill -- both columns start and stay null until a person who knows
-- the real numbers enters them. The Commercials screen is built to say
-- exactly that ("cost not entered yet") rather than showing a computed
-- margin from a null.

alter table service_agreements add column if not exists fee_amount_monthly numeric;
alter table service_agreements add column if not exists monthly_running_cost numeric;
