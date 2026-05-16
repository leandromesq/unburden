import { AppShell } from "@/components/app-shell";
import { SpeedBenchmarkPage } from "@/components/speed/speed-benchmark-page";

export default function SpeedPage() {
  return (
    <AppShell activeTool="speed">
      <SpeedBenchmarkPage />
    </AppShell>
  );
}
