import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GrowthGraph } from "../components/GrowthGraph";
import { OrderForm } from "../components/OrderForm";
import { PatternGenerator } from "../components/PatternGenerator";
import type {
  ApiPanel,
  Bundle,
  CreatedOrder,
  DeliveryOption,
  OrderConfig,
  PatternPlan,
  QuickPatternPreset,
} from "../types/order";
import { createSmmOrder } from "../utils/api";
import { createPatternPlan } from "../utils/patterns";

interface NewOrderPageProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  orders: CreatedOrder[];
  prefillOrder?: CreatedOrder | null;
  onCreateOrder: (order: CreatedOrder) => void;
  onNavigateToOrders: (notice?: string) => void;
}

function createOrderId() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

export function NewOrderPage({ apis, bundles, orders, prefillOrder, onCreateOrder, onNavigateToOrders }: NewOrderPageProps) {

  // ---------- ALL YOUR ORIGINAL STATE (UNCHANGED) ----------
  const [orderName, setOrderName] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [bulkLinks, setBulkLinks] = useState("");
  const [totalViews, setTotalViews] = useState(50000);
  const [selectedApiId, setSelectedApiId] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [startDelayHours, setStartDelayHours] = useState(0);
  const [includeLikes, setIncludeLikes] = useState(false);
  const [includeShares, setIncludeShares] = useState(false);
  const [includeSaves, setIncludeSaves] = useState(false);
  const [variancePercent, setVariancePercent] = useState(40);
  const [peakHoursBoost, setPeakHoursBoost] = useState(false);
  const [quickPreset, setQuickPreset] = useState<QuickPatternPreset | null>(null);
  const [customHours, setCustomHours] = useState(30);
  const [delivery, setDelivery] = useState<DeliveryOption>({ mode: "auto", hours: 18, label: "Auto" });
  const [seed, setSeed] = useState(0);
  const [expandedRuns, setExpandedRuns] = useState(false);

  const config: OrderConfig = useMemo(() => ({
    postUrl,
    totalViews,
    startDelayHours,
    includeLikes,
    includeShares,
    includeSaves,
    variancePercent,
    peakHoursBoost,
    quickPreset,
    delivery,
  }), [
    postUrl,
    totalViews,
    startDelayHours,
    includeLikes,
    includeShares,
    includeSaves,
    variancePercent,
    peakHoursBoost,
    quickPreset,
    delivery,
  ]);

  // ---------- GENERATE PLAN ----------
  const generatedPlan = useMemo(() => {
    const plan = createPatternPlan(config);
    return { ...plan, runs: plan?.runs || [] };
  }, [config, seed]);

  // ---------- 🔥 YOUR FIX APPLIED HERE ----------
  const plan = useMemo(() => {
    const basePlan = generatedPlan;
    const runs = basePlan?.runs || [];

    if (runs.length <= 1) return basePlan;

    const baseIntervalMin = basePlan.approximateIntervalMin || 120;
    const baseIntervalMs = baseIntervalMin * 60 * 1000;

    const newRuns = runs.map((run, i) => {
      if (i === 0) return run;

      const prevTime = new Date(runs[i - 1].at).getTime();

      // ✅ RANDOM VARIATION ±20%
      const variation = baseIntervalMs * (Math.random() * 0.4 - 0.2);

      const newTime = prevTime + baseIntervalMs + variation;

      return {
        ...run,
        at: new Date(newTime),
      };
    });

    return {
      ...basePlan,
      runs: newRuns,
    };
  }, [generatedPlan]);

  const safePlan = useMemo(() => ({ ...plan, runs: plan?.runs || [] }), [plan]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-7">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-2xl font-semibold text-white">New Order</h2>
      </motion.div>

      <OrderForm
        orderName={orderName}
        postUrl={postUrl}
        bulkLinks={bulkLinks}
        totalViews={totalViews}
        selectedApiId={selectedApiId}
        selectedBundleId={selectedBundleId}
        startDelayHours={startDelayHours}
        variancePercent={variancePercent}
        includeLikes={includeLikes}
        includeShares={includeShares}
        includeSaves={includeSaves}
        peakHoursBoost={peakHoursBoost}
        delivery={delivery}
        customHours={customHours}
        onPostUrlChange={setPostUrl}
        onBulkLinksChange={setBulkLinks}
        onOrderNameChange={setOrderName}
        onTotalViewsChange={setTotalViews}
        onSelectedApiChange={setSelectedApiId}
        onSelectedBundleChange={setSelectedBundleId}
        onStartDelayHoursChange={setStartDelayHours}
        onVarianceChange={setVariancePercent}
        onToggleLikes={setIncludeLikes}
        onToggleShares={setIncludeShares}
        onToggleSaves={setIncludeSaves}
        onPeakHoursChange={setPeakHoursBoost}
        onDeliveryChange={setDelivery}
        onCustomHoursChange={setCustomHours}
      />

      <PatternGenerator
        plan={safePlan}
        selectedPreset={quickPreset}
        expandedRuns={expandedRuns}
        onApplyPreset={setQuickPreset}
        onToggleRuns={() => setExpandedRuns(prev => !prev)}
        onGenerate={() => setSeed(s => s + 1)}
      />

      <GrowthGraph plan={safePlan} />
    </div>
  );
}
