import { LoadingState } from "@/components/ui/LoadingState";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <LoadingState />
    </div>
  );
}
