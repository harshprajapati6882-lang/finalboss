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
  const prefillApiId = prefillOrder ? apis.find((api) => api.name === prefillOrder.selectedAPI)?.id ?? "" : "";
  const prefillBundleId = prefillOrder
    ? bundles.find((bundle) => bundle.name === prefillOrder.selectedBundle && bundle.apiId === prefillApiId)?.id ?? ""
    : "";
  const prefillRuns = prefillOrder?.runs || [];
  const prefillPlan: PatternPlan | null = prefillOrder
    ? {
        patternId: Number(prefillOrder.id.replace(/\D/g, "")) || Date.now() % 1000,
        patternName: prefillOrder.patternName,
        patternType: prefillOrder.patternType,
        totalRuns: prefillRuns.length,
        approximateIntervalMin:
          prefillRuns.length > 1
            ? Math.max(
                1,
                Math.round(
                  prefillRuns
                    .slice(1)
                    .reduce((acc, run, index) => {
                      const prev = prefillRuns[index];
                      return acc + (run.at.getTime() - prev.at.getTime()) / 60000;
                    }, 0) / (prefillRuns.length - 1)
                )
              )
            : 0,
        finishTime: prefillRuns[prefillRuns.length - 1]?.at ?? new Date(),
        estimatedDurationHours:
          prefillRuns.length > 1
            ? Math.round(
                ((prefillRuns[prefillRuns.length - 1]?.at.getTime() ?? Date.now()) -
                  (prefillRuns[0]?.at.getTime() ?? Date.now())) /
                  3600000
              )
            : 0,
        risk: "Safe",
        runs: prefillRuns,
      }
    : null;

  const [orderName, setOrderName] = useState(prefillOrder?.name && !prefillOrder.name.startsWith("Order #") ? prefillOrder.name : "");
  const [postUrl, setPostUrl] = useState(prefillOrder?.link ?? "");
  const [bulkLinks, setBulkLinks] = useState("");
  const [totalViews, setTotalViews] = useState(prefillOrder?.totalViews ?? 50000);
  const [selectedApiId, setSelectedApiId] = useState(prefillApiId);
  const [selectedBundleId, setSelectedBundleId] = useState(prefillBundleId);
  const [startDelayHours, setStartDelayHours] = useState(prefillOrder?.startDelayHours ?? 0);
  const [includeLikes, setIncludeLikes] = useState((prefillOrder?.engagement.likes ?? 0) > 0);
  const [includeShares, setIncludeShares] = useState((prefillOrder?.engagement.shares ?? 0) > 0);
  const [includeSaves, setIncludeSaves] = useState((prefillOrder?.engagement.saves ?? 0) > 0);
  const [variancePercent, setVariancePercent] = useState(40);
  const [peakHoursBoost, setPeakHoursBoost] = useState(false);
  const [quickPreset, setQuickPreset] = useState<QuickPatternPreset | null>(null);
  const [customHours, setCustomHours] = useState(30);
  const [delivery, setDelivery] = useState<DeliveryOption>({ mode: "auto", hours: 18, label: "Auto" });
  const [seed, setSeed] = useState(0);
  const [useClonedPlan, setUseClonedPlan] = useState(Boolean(prefillPlan));
  const [clonedPlan] = useState<PatternPlan | null>(prefillPlan);
  const [expandedRuns, setExpandedRuns] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const config: OrderConfig = useMemo(
    () => ({
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      includeShares,
      includeSaves,
      variancePercent,
      peakHoursBoost,
      quickPreset,
      delivery:
        delivery.mode === "custom"
          ? { ...delivery, hours: customHours, label: "Custom" }
          : delivery.mode === "auto"
            ? { ...delivery, hours: Math.max(6, Math.min(48, delivery.hours)) }
            : delivery,
    }),
    [
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
      customHours,
    ]
  );

  const generatedPlan = useMemo(() => {
    try {
      const nextPlan = createPatternPlan(config);
      return { ...nextPlan, runs: nextPlan?.runs || [] };
    } catch (error) {
      console.error("Pattern plan generation failed", error);
      const now = new Date();
      return {
        patternId: 0,
        patternName: "fallback",
        patternType: "smooth-s-curve" as const,
        totalRuns: 0,
        approximateIntervalMin: 0,
        finishTime: now,
        estimatedDurationHours: 0,
        risk: "Safe" as const,
        runs: [],
      };
    }
  }, [config, seed]);
  const plan = useMemo(
    () => (useClonedPlan && clonedPlan ? { ...clonedPlan, runs: clonedPlan.runs || [] } : generatedPlan),
    [useClonedPlan, clonedPlan, generatedPlan]
  );
  const safePlan = useMemo(() => ({ ...plan, runs: plan?.runs || [] }), [plan]);
  const bundleOptions = useMemo(() => {
    if (!selectedApiId) return bundles;
    return bundles.filter((bundle) => bundle.apiId === selectedApiId);
  }, [bundles, selectedApiId]);

  function isValidUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-7">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h2 className="text-2xl font-semibold tracking-tight text-white">New Order</h2>
        <p className="mt-1 text-sm text-slate-400">
          Configure view delivery patterns and engagement distribution. Frontend-only model, ready for API wiring.
        </p>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <OrderForm
          orderName={orderName}
          postUrl={postUrl}
          bulkLinks={bulkLinks}
          totalViews={totalViews}
          selectedApiId={selectedApiId}
          selectedBundleId={selectedBundleId}
          apiOptions={apis.map((api) => ({ id: api.id, name: api.name }))}
          bundleOptions={bundleOptions.map((bundle) => ({ id: bundle.id, name: bundle.name }))}
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
          onTotalViewsChange={(value) => {
            setUseClonedPlan(false);
            const safeValue = Number.isFinite(value) ? value : 0;
            setTotalViews(Math.max(0, Math.floor(safeValue)));
          }}
          onSelectedApiChange={(apiId) => {
            setSelectedApiId(apiId);
            setSelectedBundleId("");
          }}
          onSelectedBundleChange={setSelectedBundleId}
          onStartDelayHoursChange={(value) => {
            setUseClonedPlan(false);
            const safeValue = Number.isFinite(value) ? value : 0;
            setStartDelayHours(Math.max(0, Math.min(168, Math.floor(safeValue))));
          }}
          onVarianceChange={(value) => {
            setUseClonedPlan(false);
            const safeValue = Number.isFinite(value) ? value : 0;
            setVariancePercent(Math.max(0, Math.min(50, safeValue)));
          }}
          onToggleLikes={(value) => {
            setUseClonedPlan(false);
            setIncludeLikes(value);
          }}
          onToggleShares={(value) => {
            setUseClonedPlan(false);
            setIncludeShares(value);
          }}
          onToggleSaves={(value) => {
            setUseClonedPlan(false);
            setIncludeSaves(value);
          }}
          onPeakHoursChange={(value) => {
            setUseClonedPlan(false);
            setPeakHoursBoost(value);
          }}
          onDeliveryChange={(option) => {
            setUseClonedPlan(false);
            setDelivery(option);
          }}
          onCustomHoursChange={(hours) => {
            setUseClonedPlan(false);
            const safeHours = Number.isFinite(hours) ? hours : 1;
            const clampedHours = Math.max(1, Math.min(96, safeHours));
            setCustomHours(clampedHours);
            setDelivery({ mode: "custom", label: "Custom", hours: clampedHours });
          }}
        />

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <h2 className="text-lg font-semibold text-white">Detection Risk</h2>
            <p className="mt-2 text-sm text-slate-400">Based on variance and delivery speed</p>
            <div className="mt-4 inline-flex rounded-lg border border-slate-700 bg-[#0d1424] px-4 py-2">
              <span
                className={`text-sm font-semibold ${
                  safePlan.risk === "Safe"
                    ? "text-emerald-300"
                    : safePlan.risk === "Medium"
                      ? "text-amber-300"
                      : "text-rose-300"
                }`}
              >
                {safePlan.risk}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Estimated duration: {safePlan.estimatedDurationHours}h</p>
          </div>

          <PatternGenerator
            plan={safePlan}
            selectedPreset={quickPreset}
            expandedRuns={expandedRuns}
            onApplyPreset={(preset) => {
              setUseClonedPlan(false);
              setQuickPreset(preset);
              if (preset === "viral-boost") {
                setVariancePercent(48);
                setDelivery({ mode: "preset", label: "12h", hours: 12 });
              }
              if (preset === "fast-start") {
                setVariancePercent(32);
                setDelivery({ mode: "preset", label: "6h", hours: 6 });
              }
              if (preset === "trending-push") {
                setVariancePercent(40);
                setDelivery({ mode: "preset", label: "24h", hours: 24 });
              }
              if (preset === "slow-burn") {
                setVariancePercent(22);
                setDelivery({ mode: "preset", label: "48h", hours: 48 });
              }
              setSeed((current) => current + 1);
              setExpandedRuns(false);
            }}
            onToggleRuns={() => setExpandedRuns((prev) => !prev)}
            onGenerate={() => {
              setUseClonedPlan(false);
              setSeed((current) => current + 1);
              setExpandedRuns(false);
            }}
          />
        </div>
      </div>

      <GrowthGraph plan={safePlan} />

      <div className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <p className="text-sm text-slate-400">Create order will store the current plan, schedule, and engagement data.</p>
        <button
          type="button"
          disabled={isCreatingOrder}
          onClick={async () => {
            setCreateError("");
            setCreateSuccess("");
            if (!selectedBundleId) {
              setCreateError("Select a bundle before creating an order.");
              return;
            }
            const bulkTargets = bulkLinks
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);
            const singleTarget = postUrl.trim();
            const targets = bulkTargets.length > 0 ? bulkTargets : singleTarget ? [singleTarget] : [];
            if (!targets.length) {
              setCreateError("Add a post URL or paste multiple links before creating an order.");
              return;
            }
            const invalidTarget = targets.find((target) => !isValidUrl(target));
            if (invalidTarget) {
              setCreateError(`Invalid URL found: ${invalidTarget}`);
              return;
            }

            const selectedApi = apis.find((api) => api.id === selectedApiId) ?? null;
            if (!selectedApi) {
              setCreateError("Select an API before creating an order.");
              return;
            }
            if (!selectedApi.url.trim()) {
              setCreateError("API URL is required.");
              return;
            }
            if (!isValidUrl(selectedApi.url.trim())) {
              setCreateError("API URL must be a valid URL.");
              return;
            }
            if (!selectedApi.key.trim()) {
              setCreateError("API key is required.");
              return;
            }

            const selectedBundle = bundles.find((bundle) => bundle.id === selectedBundleId);
            if (!selectedBundle) {
              setCreateError("Selected bundle is missing. Please pick a valid bundle.");
              return;
            }
            const viewsServiceId = selectedBundle.serviceIds.views.trim();
            if (!viewsServiceId) {
              setCreateError("Selected bundle has no Views service ID.");
              return;
            }
            const likesServiceId = selectedBundle.serviceIds.likes.trim();
            const sharesServiceId = selectedBundle.serviceIds.shares.trim();
            const savesServiceId = selectedBundle.serviceIds.saves.trim();
            if (includeLikes && !likesServiceId) {
              setCreateError("Selected bundle has no Likes service ID.");
              return;
            }
            if (includeShares && !sharesServiceId) {
              setCreateError("Selected bundle has no Shares service ID.");
              return;
            }
            if (includeSaves && !savesServiceId) {
              setCreateError("Selected bundle has no Saves service ID.");
              return;
            }

            const quantity = (safePlan?.runs || []).reduce((acc, run) => acc + run.views, 0);
            if (!Number.isFinite(quantity) || quantity <= 0) {
              setCreateError("Quantity must be a valid number greater than 0.");
              return;
            }
            if (quantity < 100) {
              setCreateError("Views must be at least 100.");
              return;
            }

            const totalLikes = (safePlan?.runs || []).reduce((acc, run) => acc + run.likes, 0);
            const totalShares = (safePlan?.runs || []).reduce((acc, run) => acc + run.shares, 0);
            const totalSaves = (safePlan?.runs || []).reduce((acc, run) => acc + run.saves, 0);

            if (includeLikes && totalLikes < 10) {
              setCreateError("Likes must be at least 10.");
              return;
            }
            if (includeShares && totalShares < 20) {
              setCreateError("Shares must be at least 20.");
              return;
            }
            if (includeSaves && totalSaves < 10) {
              setCreateError("Saves must be at least 10.");
              return;
            }

            if (quantity > 100000) {
              const proceed = window.confirm("Are you sure? This is a large order.");
              if (!proceed) {
                return;
              }
            }
            const viewRuns = (safePlan?.runs || []).map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.floor(run.views),
            }));
            if (
              !viewRuns.length ||
              viewRuns.some((run) => !run.time || !Number.isFinite(run.quantity) || run.quantity <= 0)
            ) {
              setCreateError("Run schedule is invalid. Regenerate pattern and try again.");
              return;
            }

            // Preserve run index alignment across services by sending the full run arrays, including zeros.
            const likesRuns = (safePlan?.runs || []).map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.max(0, Math.floor(run.likes)),
            }));
            const sharesRuns = (safePlan?.runs || []).map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.max(0, Math.floor(run.shares)),
            }));
            const savesRuns = (safePlan?.runs || []).map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.max(0, Math.floor(run.saves)),
            }));

            const servicesPayload: {
              views: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
              likes?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
              shares?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
              saves?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
            } = {
              views: {
                serviceId: viewsServiceId,
                runs: viewRuns,
              },
            };

            if (includeLikes) {
              servicesPayload.likes = {
                serviceId: likesServiceId,
                runs: likesRuns,
              };
            }
            if (includeShares) {
              servicesPayload.shares = {
                serviceId: sharesServiceId,
                runs: sharesRuns,
              };
            }
            if (includeSaves) {
              servicesPayload.saves = {
                serviceId: savesServiceId,
                runs: savesRuns,
              };
            }

            setIsCreatingOrder(true);
            setCreateSuccess(`Processing ${targets.length} orders...`);
            try {
              const activeLinks = new Set(
                orders
                  .filter((order) => order.status === "running" || order.status === "paused" || order.status === "processing")
                  .map((order) => order.link.replace(/\/+$/, "").toLowerCase())
              );
              const createdLinks = new Set<string>();
              let successCount = 0;
              let failedCount = 0;
              let lastError = "";

              for (let index = 0; index < targets.length; index += 1) {
                const trimmedUrl = targets[index];
                const normalizedTarget = trimmedUrl.replace(/\/+$/, "").toLowerCase();
                if (activeLinks.has(normalizedTarget) || createdLinks.has(normalizedTarget)) {
                  failedCount += 1;
                  lastError = "Warning: An active order with the same link already exists.";
                  continue;
                }

                try {
                  const result = await createSmmOrder({
                    name: orderName.trim() || undefined,
                    apiUrl: selectedApi.url,
                    apiKey: selectedApi.key,
                    link: trimmedUrl,
                    services: servicesPayload,
                  });

                  const order: CreatedOrder = {
                    id: createOrderId(),
                    name: orderName.trim(),
                    schedulerOrderId: result.schedulerOrderId,
                    smmOrderId: result.orderId ?? "Scheduled",
                    link: trimmedUrl,
                    totalViews: quantity,
                    startDelayHours,
                    patternType: safePlan.patternType,
                    patternName: safePlan.patternName,
                    runs: safePlan?.runs || [],
                    engagement: {
                      likes: totalLikes,
                      shares: totalShares,
                      saves: totalSaves,
                    },
                    serviceId: viewsServiceId,
                    selectedAPI: selectedApi.name,
                    selectedBundle: selectedBundle.name,
                    status: result.status === "completed" ? "completed" : "running",
                    completedRuns: typeof result.completedRuns === "number" ? result.completedRuns : 0,
                    runStatuses: (safePlan?.runs || []).map(() => "pending"),
                    createdAt: new Date().toISOString(),
                    lastUpdatedAt: new Date().toISOString(),
                  };

                  if (!order.name) {
                    order.name = `Order #${order.id}`;
                  } else if (targets.length > 1) {
                    order.name = `${order.name} #${index + 1}`;
                  }

                  onCreateOrder(order);
                  createdLinks.add(normalizedTarget);
                  successCount += 1;
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Failed to create order";
                  const failedOrder: CreatedOrder = {
                    id: createOrderId(),
                    name: orderName.trim() || "",
                    smmOrderId: "N/A",
                    link: trimmedUrl,
                    totalViews: quantity,
                    startDelayHours,
                    patternType: safePlan.patternType,
                    patternName: safePlan.patternName,
                    runs: safePlan?.runs || [],
                    engagement: {
                      likes: totalLikes,
                      shares: totalShares,
                      saves: totalSaves,
                    },
                    serviceId: viewsServiceId,
                    selectedAPI: selectedApi.name,
                    selectedBundle: selectedBundle.name,
                    status: "failed",
                    completedRuns: 0,
                    runStatuses: (safePlan?.runs || []).map((_, runIndex) => (runIndex === 0 ? "cancelled" : "pending")),
                    runErrors: (safePlan?.runs || []).map((_, runIndex) => (runIndex === 0 ? message : "")),
                    errorMessage: message,
                    createdAt: new Date().toISOString(),
                    lastUpdatedAt: new Date().toISOString(),
                  };
                  if (!failedOrder.name) {
                    failedOrder.name = `Order #${failedOrder.id}`;
                  } else if (targets.length > 1) {
                    failedOrder.name = `${failedOrder.name} #${index + 1}`;
                  }
                  onCreateOrder(failedOrder);
                  failedCount += 1;
                  lastError = message;
                }
              }

              if (failedCount > 0 && successCount === 0) {
                setCreateError(lastError || "Failed to create orders.");
                setCreateSuccess("");
                return;
              }

              const successLabel =
                targets.length > 1
                  ? `Processed ${targets.length} orders. Success: ${successCount}, Failed: ${failedCount}`
                  : "Order Scheduled Successfully";
              setCreateSuccess(successLabel);
              if (failedCount > 0) {
                setCreateError(`Some orders failed. Last error: ${lastError}`);
              }
              onNavigateToOrders(successLabel);
            } finally {
              setIsCreatingOrder(false);
            }
          }}
          className="rounded-lg border border-cyan-400/70 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreatingOrder ? "Creating..." : "Create Order"}
        </button>
      </div>
      {createError && <p className="text-sm text-rose-300">{createError}</p>}
      {createSuccess && <p className="text-sm text-emerald-300">{createSuccess}</p>}
    </div>
  );
}
