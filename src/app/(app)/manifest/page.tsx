import { PageHeading, Card, CardHeader } from "@/components/ui/Card";

/** The company brain — assets, decisions, accuracy/calibration, written
 * back from Missions, Hangar and Hypercare on every gate close (aironauts
 * Decision Pack, "No gate closes without a write-back"). Nav-only shell
 * for now: the object model and the write-back trigger are Wave 3 of the
 * Decision Pack's own build order, not this pass. No placeholder counts
 * or fabricated data here on purpose — there's nothing to show yet. */
export default function ManifestOverviewPage() {
  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading title="Manifest" description="The company brain. Not built yet." />
      <Card className="p-5 flex flex-col gap-4">
        <p className="text-[12.5px] text-muted leading-[1.6]">
          Manifest becomes the single place Missions, Hangar and Hypercare write back to on every gate
          close: assets and reuse, decisions and how they resolved, and planned-vs-actual accuracy that
          tunes the Flight Plan templates. None of that exists yet — this cockpit is reserved in the nav so
          the four-cockpit structure is in place, but its object model ships later.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { title: "Assets", note: "Agents, connectors, prompts and templates, registered with a reuse count." },
            { title: "Decisions", note: "Decisions, objections and how they resolved — the pattern library." },
            { title: "Accuracy", note: "Planned vs. actual on every mission, feeding estimate quality." },
          ].map((s) => (
            <Card key={s.title}>
              <CardHeader title={s.title} note="NOT BUILT" />
              <p className="px-4 pb-3.5 text-[11.5px] text-muted leading-[1.55]">{s.note}</p>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
