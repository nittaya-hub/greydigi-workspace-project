import { FlightPlanSpine } from "@/components/portal/FlightPlanSpine";
import type { DashboardData } from "@/lib/dashboard/types";

export function FlightPlanBlock({ data }: { data: DashboardData }) {
  const phases = data.flightPlan?.phases ?? [];
  const gates = data.flightPlan?.gates ?? [];

  if (phases.length === 0) {
    return <div className="h-full flex items-center justify-center p-3.5 text-[11.5px] text-muted">No flight plan yet.</div>;
  }

  return (
    <div className="h-full overflow-auto p-3.5">
      <FlightPlanSpine phases={phases} gates={gates} dark={false} />
    </div>
  );
}
