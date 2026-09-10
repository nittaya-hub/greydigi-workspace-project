import { createClient } from "@/lib/supabase/server";
import type { IncidentSeverity } from "@/lib/supabase/database.types";

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function isWeekday(d: Date): boolean {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

/** Every SOW measures response targets "in service hours" (09:00-18:00
 * Singapore time, Monday to Friday, excluding Singapore public holidays
 * -- SOW-2026-002 section 6). This walks forward from `openedAt` adding
 * only minutes that fall inside that window, skipping weekends. It does
 * NOT know Singapore's public holiday calendar (no holiday table exists
 * in this schema yet), so a target that spans a public holiday will land
 * slightly early -- a known, deliberate simplification, not a rounding
 * bug. When `businessHoursOnly` is false, it's just openedAt + minutes. */
export function computeTargetAt(openedAt: Date, targetMinutes: number, businessHoursOnly: boolean): Date {
  if (!businessHoursOnly) return new Date(openedAt.getTime() + targetMinutes * 60_000);

  let remaining = targetMinutes;
  let cursor = new Date(openedAt.getTime() + SGT_OFFSET_MS);

  const dayStart = (d: Date) => {
    const x = new Date(d);
    x.setUTCHours(9, 0, 0, 0);
    return x;
  };
  const dayEnd = (d: Date) => {
    const x = new Date(d);
    x.setUTCHours(18, 0, 0, 0);
    return x;
  };
  const nextDay = (d: Date) => new Date(d.getTime() + DAY_MS);

  // Land cursor inside the next open business window.
  for (;;) {
    if (!isWeekday(cursor)) {
      cursor = dayStart(nextDay(cursor));
      continue;
    }
    const start = dayStart(cursor);
    const end = dayEnd(cursor);
    if (cursor < start) cursor = start;
    if (cursor >= end) {
      cursor = dayStart(nextDay(cursor));
      continue;
    }
    break;
  }

  while (remaining > 0) {
    const end = dayEnd(cursor);
    const availableMinutes = (end.getTime() - cursor.getTime()) / 60_000;
    if (remaining <= availableMinutes) {
      cursor = new Date(cursor.getTime() + remaining * 60_000);
      remaining = 0;
    } else {
      remaining -= availableMinutes;
      cursor = dayStart(nextDay(cursor));
      while (!isWeekday(cursor)) cursor = dayStart(nextDay(cursor));
    }
  }

  return new Date(cursor.getTime() - SGT_OFFSET_MS);
}

/** The per-severity response target + update cadence for a service's SLA
 * policy, if one exists. Falls back to the policy's flat
 * response_target_minutes when no tier row exists for this severity yet
 * (e.g. an older policy created before tiers existed) -- so a service
 * never regresses to "no target at all" just because it hasn't been
 * upgraded to per-tier data. */
export async function getSlaTargetForIncident(
  serviceId: string,
  severity: IncidentSeverity
): Promise<{ responseTargetMinutes: number; businessHoursOnly: boolean } | null> {
  const supabase = await createClient();
  const { data: policy } = await supabase
    .from("sla_policies")
    .select("id, response_target_minutes, business_hours_only")
    .eq("service_id", serviceId)
    .maybeSingle();
  if (!policy) return null;

  const { data: tier } = await supabase
    .from("sla_policy_tiers")
    .select("response_target_minutes")
    .eq("sla_policy_id", policy.id)
    .eq("severity", severity)
    .maybeSingle();

  return {
    responseTargetMinutes: tier?.response_target_minutes ?? policy.response_target_minutes,
    businessHoursOnly: policy.business_hours_only,
  };
}
