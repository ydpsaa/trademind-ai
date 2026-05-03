import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";

const settingsSections = ["Profile", "Risk Settings", "Theme", "Account Preferences"];

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Mock preferences for the future authenticated workspace.">
      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => (
          <GlassCard key={section} className="p-4">
            <h2 className="text-base font-semibold">{section}</h2>
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <span className="text-zinc-400">{section} option {item}</span>
                  <span className="text-xs text-zinc-500">Mock</span>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
