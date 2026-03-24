import { AnimatePresence, motion } from "framer-motion";
import type { PatternPlan, QuickPatternPreset } from "../types/order";
import { RunTable } from "./RunTable";

interface PatternGeneratorProps {
  plan: PatternPlan;
  selectedPreset: QuickPatternPreset | null;
  expandedRuns: boolean;
  onGenerate: () => void;
  onApplyPreset: (preset: QuickPatternPreset) => void;
  onToggleRuns: () => void;
}

const presetButtons: Array<{ label: string; value: QuickPatternPreset }> = [
  { label: "🚀 Viral Boost", value: "viral-boost" },
  { label: "⚡ Fast Start", value: "fast-start" },
  { label: "🔥 Trending Push", value: "trending-push" },
  { label: "🌊 Slow Burn", value: "slow-burn" },
];

export function PatternGenerator({
  plan,
  selectedPreset,
  expandedRuns,
  onGenerate,
  onApplyPreset,
  onToggleRuns,
}: PatternGeneratorProps) {
  const safeRuns = plan?.runs || [];
  const safeFinishTime = plan?.finishTime instanceof Date ? plan.finishTime : new Date();

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {presetButtons.map((preset) => {
            const active = selectedPreset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onApplyPreset(preset.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-yellow-500/70 bg-yellow-500/20 text-yellow-300"
                    : "border-gray-700 text-gray-500 hover:border-yellow-500/30"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-yellow-400">3. Pattern System</h2>
          <button
            type="button"
            onClick={onGenerate}
            className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
          >
            New Pattern
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-yellow-500/20 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-gray-600">Pattern ID</p>
            <p className="mt-1 text-base font-semibold text-gray-200">#{plan?.patternId ?? 0}</p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-gray-600">Pattern Name</p>
            <p className="mt-1 text-base font-semibold text-gray-200">{plan?.patternName || "-"}</p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-gray-600">Base Type</p>
            <p className="mt-1 text-base font-semibold text-gray-200">{plan?.patternType || "smooth-s-curve"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-5">
        <h2 className="mb-4 text-lg font-semibold text-yellow-400">4. Schedule Preview</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-yellow-500/20 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-gray-600">Total Runs</p>
            <p className="mt-1 text-base font-semibold text-gray-200">{plan?.totalRuns ?? 0}</p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-gray-600">Interval (approx)</p>
            <p className="mt-1 text-base font-semibold text-gray-200">{plan?.approximateIntervalMin ?? 0} min</p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-gray-600">Finish Time</p>
            <p className="mt-1 text-base font-semibold text-gray-200">{safeFinishTime.toLocaleString()}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleRuns}
          className="mt-4 text-sm text-yellow-400 transition hover:text-yellow-300"
        >
          {expandedRuns ? "Hide Runs" : "View Runs"}
        </button>
        <AnimatePresence initial={false}>
          {expandedRuns && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <RunTable runs={safeRuns} mode="schedule" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
