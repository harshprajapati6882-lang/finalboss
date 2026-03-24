import { useCallback, useMemo, useState, useEffect } from "react";
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

const NAV_ITEMS: { key: NavKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "new-order", label: "New Order", icon: "⚡" },
  { key: "orders", label: "Orders", icon: "📦" },
  { key: "apis", label: "APIs", icon: "🔗" },
  { key: "bundles", label: "Bundles", icon: "📁" },
];

const BAT_QUOTES = [
  "It's not who I am underneath, but what I do that defines me.",
  "The night is darkest just before the dawn.",
  "I'm whatever Gotham needs me to be.",
  "Sometimes the truth isn't good enough.",
  "A hero can be anyone.",
  "Why do we fall? So we can learn to pick ourselves up.",
  "I won't kill you, but I don't have to save you.",
  "It's not about what I want. It's about what's fair.",
  "Criminals are a superstitious, cowardly lot.",
  "I am vengeance. I am the night. I am Batman.",
];

function getRandomQuote() {
  return BAT_QUOTES[Math.floor(Math.random() * BAT_QUOTES.length)];
}

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

// Bat Signal Component
function BatSignal() {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-xl border border-yellow-500/20 bg-gradient-to-b from-gray-900 via-gray-950 to-black">
      {/* Stars */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-white/60"
            style={{
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Clouds */}
      <div className="absolute top-6 left-4 h-4 w-12 rounded-full bg-gray-700/30 blur-sm" />
      <div className="absolute top-10 right-6 h-3 w-10 rounded-full bg-gray-700/20 blur-sm" />
      <div className="absolute top-4 right-12 h-3 w-8 rounded-full bg-gray-600/20 blur-sm" />

      {/* Bat Signal Light Beam */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <div 
          className="relative h-36 w-28 animate-pulse"
          style={{ 
            background: 'linear-gradient(to top, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.15) 40%, rgba(234, 179, 8, 0.05) 70%, transparent 100%)',
            clipPath: 'polygon(35% 100%, 65% 100%, 85% 0%, 15% 0%)',
          }}
        />
      </div>

      {/* Bat Symbol Circle (Signal in Sky) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute inset-0 animate-ping rounded-full bg-yellow-500/20" style={{ animationDuration: '3s' }} />
          <div className="absolute -inset-2 animate-pulse rounded-full bg-yellow-500/10 blur-md" />
          
          {/* Signal circle */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-500/50 bg-yellow-500/20 shadow-lg shadow-yellow-500/30">
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.8))' }}>🦇</span>
          </div>
        </div>
      </div>

      {/* City Silhouette */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 200 40" className="h-10 w-full fill-black">
          {/* Buildings */}
          <rect x="0" y="20" width="12" height="20" />
          <rect x="14" y="12" width="10" height="28" />
          <rect x="26" y="18" width="8" height="22" />
          <rect x="36" y="8" width="14" height="32" />
          <rect x="52" y="22" width="10" height="18" />
          <rect x="64" y="14" width="12" height="26" />
          <rect x="78" y="20" width="8" height="20" />
          <rect x="88" y="6" width="16" height="34" />
          <rect x="106" y="16" width="10" height="24" />
          <rect x="118" y="24" width="8" height="16" />
          <rect x="128" y="10" width="14" height="30" />
          <rect x="144" y="18" width="10" height="22" />
          <rect x="156" y="14" width="12" height="26" />
          <rect x="170" y="22" width="8" height="18" />
          <rect x="180" y="8" width="12" height="32" />
          <rect x="194" y="16" width="6" height="24" />
          
          {/* Windows (small yellow dots) */}
          <rect x="40" y="12" width="2" height="2" fill="#eab308" opacity="0.6" />
          <rect x="44" y="18" width="2" height="2" fill="#eab308" opacity="0.4" />
          <rect x="92" y="10" width="2" height="2" fill="#eab308" opacity="0.5" />
          <rect x="96" y="16" width="2" height="2" fill="#eab308" opacity="0.7" />
          <rect x="132" y="14" width="2" height="2" fill="#eab308" opacity="0.5" />
          <rect x="136" y="22" width="2" height="2" fill="#eab308" opacity="0.4" />
          <rect x="184" y="12" width="2" height="2" fill="#eab308" opacity="0.6" />
        </svg>
      </div>

      {/* GOTHAM Text */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
        <p className="text-[10px] font-medium tracking-widest text-yellow-500/50">GOTHAM CITY</p>
      </div>
    </div>
  );
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
  const [quote, setQuote] = useState(getRandomQuote());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Change quote every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setQuote(getRandomQuote()), 30000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="min-h-screen bg-black text-gray-100">
      <div className="flex min-h-screen">
        {/* Batman Sidebar */}
        <aside className="w-64 flex flex-col border-r border-yellow-500/20 bg-gradient-to-b from-gray-950 to-black p-5">
          {/* Logo Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-yellow-500/20" style={{ animationDuration: '3s' }} />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-yellow-500/30 bg-black">
                  <span className="text-2xl">🦇</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-yellow-400">GOTHAM</h1>
                <p className="text-[10px] text-yellow-600">SMM COMMAND CENTER</p>
              </div>
            </div>
          </div>

          {/* Gotham Time */}
          <div className="mb-5 rounded-lg border border-yellow-500/20 bg-black p-3 text-center">
            <p className="text-[10px] text-gray-600 tracking-wider">GOTHAM TIME</p>
            <p className="text-lg font-mono font-bold text-yellow-400">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          {/* System Status */}
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs text-emerald-400">Systems Online</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5 flex-1">
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
                    "relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all",
                    isActive 
                      ? "bg-yellow-500/20 text-yellow-400 shadow-lg shadow-yellow-500/10" 
                      : "text-gray-500 hover:bg-yellow-500/10 hover:text-yellow-300"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-nav"
                      className="absolute inset-0 rounded-xl border border-yellow-500/50"
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    />
                  )}
                  <span className="relative text-base">{item.icon}</span>
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Batman Quote */}
          <div className="mb-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
            <p className="text-[11px] italic leading-relaxed text-yellow-500/70">
              "{quote}"
            </p>
            <p className="mt-2 text-right text-[10px] font-medium text-yellow-600">— Batman</p>
          </div>

          {/* Bat Signal in Sky */}
          <BatSignal />

          {/* Keyboard Shortcuts */}
          <div className="mt-4 space-y-1 rounded-lg border border-gray-800 bg-black/50 p-3">
            <p className="text-[10px] font-medium text-gray-600 mb-2">SHORTCUTS</p>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-700">
              <span>⌘D</span><span>Dashboard</span>
              <span>⌘N</span><span>New Mission</span>
              <span>⌘O</span><span>Orders</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-950 via-black to-gray-950">{content}</main>
      </div>
    </div>
  );
}
