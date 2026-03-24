import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { APIsPage } from "./pages/APIsPage";
import { BundlesPage } from "./pages/BundlesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { OrdersPage } from "./pages/OrdersPage";
import type { ApiPanel, Bundle, CreatedOrder, RunStatus } from "./types/order";
import { fetchServices, updateOrderControl } from "./utils/api";
import { cn } from "./utils/cn";

type NavKey = "dashboard" | "new-order" | "orders" | "apis" | "bundles";

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "new-order", label: "New Order" },
  { key: "orders", label: "Orders" },
  { key: "apis", label: "APIs" },
  { key: "bundles", label: "Bundles" },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function hydrateOrderDates(orders: CreatedOrder[]): CreatedOrder[] {
  return (orders || []).map((order) => {
    const safeRuns = Array.isArray(order?.runs)
      ? order.runs.map((run, index) => ({
          run: Number.isFinite(run?.run) ? run.run : index + 1,
          at: run?.at ? new Date(run.at) : new Date(),
          minutesFromStart: Number.isFinite(run?.minutesFromStart) ? run.minutesFromStart : 0,
          views: Number.isFinite(run?.views) ? run.views : 0,
          likes: Number.isFinite(run?.likes) ? run.likes : 0,
          shares: Number.isFinite(run?.shares) ? run.shares : 0,
          saves: Number.isFinite(run?.saves) ? run.saves : 0,
          cumulativeViews: Number.isFinite(run?.cumulativeViews) ? run.cumulativeViews : 0,
          cumulativeLikes: Number.isFinite(run?.cumulativeLikes) ? run.cumulativeLikes : 0,
          cumulativeShares: Number.isFinite(run?.cumulativeShares) ? run.cumulativeShares : 0,
          cumulativeSaves: Number.isFinite(run?.cumulativeSaves) ? run.cumulativeSaves : 0,
        }))
      : [];

    const safeRunStatuses: RunStatus[] = Array.isArray(order?.runStatuses)
      ? safeRuns.map((_, index) => {
          const next = order.runStatuses[index];
          return next === "completed" || next === "cancelled" ? next : "pending";
        })
      : safeRuns.map(() => "pending");
    const safeRunErrors = Array.isArray(order?.runErrors)
      ? safeRuns.map((_, index) => order.runErrors?.[index] ?? "")
      : safeRuns.map(() => "");

    return {
      ...order,
      name: order?.name || `Order #${order?.id ?? Date.now()}`,
      smmOrderId: order?.smmOrderId ?? "N/A",
      serviceId: order?.serviceId ?? "N/A",
      status:
        order?.status === "failed" ||
        order?.status === "paused" ||
        order?.status === "cancelled" ||
        order?.status === "completed" ||
        order?.status === "running" ||
        order?.status === "processing"
          ? order.status
          : "running",
      completedRuns: Number.isFinite(order?.completedRuns) ? order.completedRuns : 0,
      runStatuses: safeRunStatuses,
      runErrors: safeRunErrors,
      lastUpdatedAt: order?.lastUpdatedAt ?? order?.createdAt ?? new Date().toISOString(),
      runs: safeRuns,
    };
  });
}

function hydrateApis(apis: ApiPanel[]): ApiPanel[] {
  return apis.map((api) => ({
    ...api,
    services: Array.isArray(api.services) ? api.services : [],
    lastFetchError: api.lastFetchError,
    lastFetchAt: api.lastFetchAt,
  }));
}

function hydrateBundles(bundles: Bundle[]): Bundle[] {
  return bundles.map((bundle) => ({
    ...bundle,
    apiId: bundle.apiId ?? "",
  }));
}

export default function App() {
  const [activePage, setActivePage] = useState<NavKey>("new-order");
  const [ordersNotice, setOrdersNotice] = useState("");
  const [orders, setOrders] = useState<CreatedOrder[]>(() => hydrateOrderDates(readStorage<CreatedOrder[]>("dev-smm-orders", [])));
  const [apis, setApis] = useState<ApiPanel[]>(() => hydrateApis(readStorage<ApiPanel[]>("dev-smm-apis", [])));
  const [bundles, setBundles] = useState<Bundle[]>(() => hydrateBundles(readStorage<Bundle[]>("dev-smm-bundles", [])));
  const [cloneSourceOrder, setCloneSourceOrder] = useState<CreatedOrder | null>(null);
  const [fetchingApiId, setFetchingApiId] = useState<string | null>(null);
  const [controllingOrderId, setControllingOrderId] = useState<string | null>(null);

  const persistOrders = useCallback((next: CreatedOrder[]) => {
    setOrders(next);
    localStorage.setItem("dev-smm-orders", JSON.stringify(next));
  }, []);

  const persistApis = useCallback((next: ApiPanel[]) => {
    setApis(next);
    localStorage.setItem("dev-smm-apis", JSON.stringify(next));
  }, []);

  const persistBundles = useCallback((next: Bundle[]) => {
    setBundles(next);
    localStorage.setItem("dev-smm-bundles", JSON.stringify(next));
  }, []);

  const content = useMemo(() => {
    if (activePage === "new-order") {
      return (
        <NewOrderPage
          apis={apis}
          bundles={bundles}
          orders={orders}
          prefillOrder={cloneSourceOrder}
          onCreateOrder={(order) => persistOrders([order, ...orders])}
          onNavigateToOrders={(notice) => {
            if (notice) setOrdersNotice(notice);
            setActivePage("orders");
          }}
        />
      );
    }
    if (activePage === "dashboard") {
      return <DashboardPage orders={orders} />;
    }
    if (activePage === "orders") {
      return (
        <OrdersPage
          orders={orders}
          notice={ordersNotice}
          controllingOrderId={controllingOrderId}
          onCloneOrder={(order) => {
            setCloneSourceOrder(order);
            setActivePage("new-order");
          }}
          onControlOrder={async (order, action) => {
            const applyLocalUpdate = (nextStatus: CreatedOrder["status"]) => {
              const updated = orders.map((item) => {
                if (item.id !== order.id) return item;
                if (nextStatus === "cancelled") {
                  const nextRunStatuses = item.runStatuses.map((status) => (status === "pending" ? "cancelled" : status));
                  const completedRuns = nextRunStatuses.filter((status) => status === "completed").length;
                  return {
                    ...item,
                    status: nextStatus,
                    runStatuses: nextRunStatuses,
                    completedRuns,
                    lastUpdatedAt: new Date().toISOString(),
                  };
                }
                return {
                  ...item,
                  status: nextStatus,
                  lastUpdatedAt: new Date().toISOString(),
                };
              });
              persistOrders(updated);
            };

            setControllingOrderId(order.id);
            try {
              if (order.schedulerOrderId) {
                const result = await updateOrderControl({
                  schedulerOrderId: order.schedulerOrderId,
                  action,
                });
                const nextStatus =
                  result.status || (action === "pause" ? "paused" : action === "resume" ? "running" : "cancelled");
                const updated = orders.map((item) => {
                  if (item.id !== order.id) return item;
                  return {
                    ...item,
                    status: nextStatus,
                    completedRuns: typeof result.completedRuns === "number" ? result.completedRuns : item.completedRuns,
                    runStatuses: result.runStatuses ?? item.runStatuses,
                    lastUpdatedAt: new Date().toISOString(),
                  };
                });
                persistOrders(updated);
              } else {
                applyLocalUpdate(action === "pause" ? "paused" : action === "resume" ? "running" : "cancelled");
              }
            } catch {
              applyLocalUpdate(action === "pause" ? "paused" : action === "resume" ? "running" : "cancelled");
            } finally {
              setControllingOrderId(null);
            }
          }}
          onDismissNotice={() => setOrdersNotice("")}
        />
      );
    }
        if (activePage === "apis") {
      return (
        <APIsPage
          apis={apis}
          onAddApi={(api) => {
            const next: ApiPanel[] = [
              ...apis,
              {
                id: `api-${Date.now()}`,
                name: api.name,
                url: api.url,
                key: api.key,
                status: "Active",
                services: [],
              },
            ];
            persistApis(next);
          }}
          onEditApi={(id, api) => {
            const next: ApiPanel[] = apis.map((item) =>
              item.id === id
                ? { ...item, name: api.name, url: api.url, key: api.key }
                : item
            );
            persistApis(next);
          }}
          onDeleteApi={(id) => {
            const next = apis.filter((api) => api.id !== id);
            persistApis(next);
          }}
          onToggleStatus={(id) => {
            const next: ApiPanel[] = apis.map((api) =>
              api.id === id ? { ...api, status: api.status === "Active" ? "Inactive" : "Active" } : api
            );
            persistApis(next);
          }}
          onFetchServices={async (id) => {
            const targetApi = apis.find((api) => api.id === id);
            if (!targetApi) return;

            setFetchingApiId(id);
            try {
              const services = await fetchServices(targetApi.url, targetApi.key);
              const next = apis.map((api) =>
                api.id === id
                  ? {
                      ...api,
                      services,
                      lastFetchAt: new Date().toISOString(),
                      lastFetchError: undefined,
                    }
                  : api
              );
              persistApis(next);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Failed to fetch services";
              const next = apis.map((api) =>
                api.id === id
                  ? {
                      ...api,
                      lastFetchError: message,
                    }
                  : api
              );
              persistApis(next);
            } finally {
              setFetchingApiId(null);
            }
          }}
          fetchingApiId={fetchingApiId}
        />
      );
    }
    return (
      <BundlesPage
        apis={apis}
        bundles={bundles}
        onAddBundle={(bundle) => {
          const next: Bundle[] = [
            ...bundles,
            {
              id: `bundle-${Date.now()}`,
              apiId: bundle.apiId,
              name: bundle.name,
              serviceIds: {
                views: bundle.views,
                likes: bundle.likes,
                shares: bundle.shares,
                saves: bundle.saves,
              },
            },
          ];
          persistBundles(next);
        }}
        onUpdateBundle={(id, bundle) => {
          const next: Bundle[] = bundles.map((item) =>
            item.id === id
              ? {
                  ...item,
                  apiId: bundle.apiId,
                  name: bundle.name,
                  serviceIds: {
                    views: bundle.views,
                    likes: bundle.likes,
                    shares: bundle.shares,
                    saves: bundle.saves,
                  },
                }
              : item
          );
          persistBundles(next);
        }}
        onDeleteBundle={(id) => {
          const next = bundles.filter((bundle) => bundle.id !== id);
          persistBundles(next);
        }}
      />
    );
  }, [activePage, apis, bundles, orders, fetchingApiId, controllingOrderId, ordersNotice, cloneSourceOrder]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-slate-800/80 bg-[#050810] p-6">
          <div className="mb-8 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-white">Dev SMM</h1>
            <p className="text-xs text-slate-500">Internal orchestration tool</p>
          </div>
          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === "new-order") {
                      setCloneSourceOrder(null);
                    }
                    setActivePage(item.key);
                  }}
                  className={cn(
                    "relative flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm transition-colors",
                    isActive ? "bg-slate-800/80 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-nav"
                      className="absolute inset-0 rounded-xl border border-slate-700/90"
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">{content}</main>
      </div>
    </div>
  );
}
