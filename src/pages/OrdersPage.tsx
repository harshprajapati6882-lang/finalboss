import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CreatedOrder } from "../types/order";
import { OrderCard } from "../components/OrderCard";

interface OrdersPageProps {
  orders: CreatedOrder[];
  notice: string;
  controllingOrderId: string | null;
  onControlOrder: (order: CreatedOrder, action: "pause" | "resume" | "cancel") => void;
  onCloneOrder: (order: CreatedOrder) => void;
  onDismissNotice: () => void;
}

type TabType = "running" | "completed" | "scheduled";
type ViewMode = "rows" | "columns";

// Grouped order type for batch orders
interface GroupedOrder {
  id: string;
  batchId: string | null;
  name: string;
  orders: CreatedOrder[];
  isBatch: boolean;
  totalViews: number;
  linksCount: number;
  createdAt: string;
}

// Batman Status Colors
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: "bg-yellow-500/15", text: "text-yellow-300", dot: "bg-yellow-400" },
  processing: { bg: "bg-yellow-500/15", text: "text-yellow-300", dot: "bg-yellow-400" },
  completed: { bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-400" },
  scheduled: { bg: "bg-amber-500/15", text: "text-amber-300", dot: "bg-amber-400" },
  paused: { bg: "bg-orange-500/15", text: "text-orange-300", dot: "bg-orange-400" },
  cancelled: { bg: "bg-red-500/15", text: "text-red-300", dot: "bg-red-400" },
  pending: { bg: "bg-gray-500/15", text: "text-gray-300", dot: "bg-gray-400" },
  failed: { bg: "bg-red-500/15", text: "text-red-300", dot: "bg-red-400" },
};

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: "running", label: "Active", icon: "⚡" },
  { key: "completed", label: "Completed", icon: "✓" },
  { key: "scheduled", label: "Scheduled", icon: "⏱" },
];

export function OrdersPage({
  orders,
  notice,
  controllingOrderId,
  onControlOrder,
  onCloneOrder,
  onDismissNotice,
}: OrdersPageProps) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("rows");
  const [activeTab, setActiveTab] = useState<TabType>("running");
  const [openedGroupId, setOpenedGroupId] = useState<string | null>(null);

  function getProgress(order: CreatedOrder) {
    const safeRuns = order.runs || [];
    const totalRuns = safeRuns.length;
    if (totalRuns === 0) return { percent: 0, completed: 0, total: 0 };
    
    const now = Date.now();
    const timeCompleted = safeRuns.reduce((count, run) => {
      const runMs = run?.at instanceof Date ? run.at.getTime() : new Date(run?.at ?? now).getTime();
      return runMs <= now ? count + 1 : count;
    }, 0);
    
    const statusCompleted = (order.runStatuses || []).filter((status) => status === "completed").length;
    const completed = Math.min(totalRuns, Math.max(order.completedRuns || 0, statusCompleted, timeCompleted));
    
    return {
      percent: Math.round((completed / totalRuns) * 100),
      completed,
      total: totalRuns,
    };
  }

  function getGroupProgress(group: GroupedOrder) {
    const allRuns = group.orders.flatMap(o => o.runs || []);
    const totalRuns = allRuns.length;
    if (totalRuns === 0) return { percent: 0, completed: 0, total: 0 };
    
    const now = Date.now();
    let completedCount = 0;
    
    group.orders.forEach(order => {
      const progress = getProgress(order);
      completedCount += progress.completed;
    });
    
    const totalRunsInGroup = group.orders.reduce((sum, o) => sum + (o.runs?.length || 0), 0);
    
    return {
      percent: totalRunsInGroup > 0 ? Math.round((completedCount / totalRunsInGroup) * 100) : 0,
      completed: completedCount,
      total: totalRunsInGroup,
    };
  }

  function getRealStatus(order: CreatedOrder): string {
    const runs = order.runs || [];
    const now = Date.now();

    if (runs.length > 0) {
      const allFuture = runs.every((run) => {
        const runTime = run?.at instanceof Date ? run.at.getTime() : new Date(run?.at ?? now).getTime();
        return runTime > now;
      });
      if (allFuture && order.status !== "cancelled" && order.status !== "paused") {
        return "scheduled";
      }
    }

    if (runs.length > 0) {
      const allCompleted = runs.every((run) => {
        const runTime = run?.at instanceof Date ? run.at.getTime() : new Date(run?.at ?? now).getTime();
        return runTime <= now;
      });
      if (allCompleted) return "completed";
    }

    if (order.status === "processing") return "running";
    if (order.status === "pending") return "running";

    return order.status;
  }

  function getGroupStatus(group: GroupedOrder): string {
    const statuses = group.orders.map(o => getRealStatus(o));
    
    if (statuses.every(s => s === "completed")) return "completed";
    if (statuses.every(s => s === "cancelled")) return "cancelled";
    if (statuses.every(s => s === "scheduled")) return "scheduled";
    if (statuses.some(s => s === "failed")) return "failed";
    if (statuses.some(s => s === "paused")) return "paused";
    if (statuses.some(s => s === "running")) return "running";
    
    return "running";
  }

  function getOrderCategory(order: CreatedOrder): TabType {
    const status = getRealStatus(order);
    
    if (status === "completed") return "completed";
    if (status === "scheduled") return "scheduled";
    
    return "running";
  }

  function getGroupCategory(group: GroupedOrder): TabType {
    const status = getGroupStatus(group);
    
    if (status === "completed") return "completed";
    if (status === "scheduled") return "scheduled";
    
    return "running";
  }

  function getNextRunTime(order: CreatedOrder): Date | null {
    const runs = order.runs || [];
    const now = Date.now();
    
    const futureRuns = runs
      .map((run) => (run?.at instanceof Date ? run.at : new Date(run?.at ?? now)))
      .filter((date) => date.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime());
    
    return futureRuns.length > 0 ? futureRuns[0] : null;
  }

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return "Now";
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `in ${minutes}m`;
    return "in <1m";
  }

  // Group orders by batchId
  const groupedOrders = useMemo(() => {
    const groups: Map<string, GroupedOrder> = new Map();
    
    orders.forEach((order) => {
      const groupKey = order.batchId || order.id; // Use batchId or individual id
      
      if (groups.has(groupKey)) {
        const existing = groups.get(groupKey)!;
        existing.orders.push(order);
        existing.totalViews += order.totalViews;
        existing.linksCount += 1;
      } else {
        groups.set(groupKey, {
          id: groupKey,
          batchId: order.batchId || null,
          name: order.name,
          orders: [order],
          isBatch: !!order.batchId,
          totalViews: order.totalViews,
          linksCount: 1,
          createdAt: order.createdAt,
        });
      }
    });
    
    // Sort orders within each group by batchIndex
    groups.forEach((group) => {
      group.orders.sort((a, b) => (a.batchIndex || 0) - (b.batchIndex || 0));
    });
    
    return Array.from(groups.values());
  }, [orders]);

  const categorizedGroups = useMemo(() => {
    const running: GroupedOrder[] = [];
    const completed: GroupedOrder[] = [];
    const scheduled: GroupedOrder[] = [];

    groupedOrders.forEach((group) => {
      const category = getGroupCategory(group);
      if (category === "running") running.push(group);
      else if (category === "completed") completed.push(group);
      else scheduled.push(group);
    });

    running.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    completed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    scheduled.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { running, completed, scheduled };
  }, [groupedOrders]);

  const filteredGroups = useMemo(() => {
    const groupsForTab = categorizedGroups[activeTab];
    const value = query.trim().toLowerCase();
    
    if (!value) return groupsForTab;
    
    return groupsForTab.filter((group) =>
      group.name.toLowerCase().includes(value) ||
      group.orders.some(order => 
        order.link.toLowerCase().includes(value) ||
        order.id.toLowerCase().includes(value)
      )
    );
  }, [categorizedGroups, activeTab, query]);

  // Get opened group
  const openedGroup = useMemo(
    () => groupedOrders.find((group) => group.id === openedGroupId) ?? null,
    [groupedOrders, openedGroupId]
  );

  useEffect(() => {
    if (!openedGroupId) return;
    const stillExists = groupedOrders.some((group) => group.id === openedGroupId);
    if (!stillExists) setOpenedGroupId(null);
  }, [groupedOrders, openedGroupId]);

  function toShortLink(link: string) {
    if (!link) return "-";
    return link.length > 48 ? `${link.slice(0, 30)}...${link.slice(-12)}` : link;
  }

  function extractReelId(link: string) {
    const match = link.match(/\/reel\/([^/?]+)/);
    return match ? match[1] : link.slice(-15);
  }

  function StatusBadge({ status }: { status: string }) {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${colors.dot} ${status === "running" ? "animate-pulse" : ""}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function ProgressBar({ percent, size = "normal" }: { percent: number; size?: "small" | "normal" }) {
    const height = size === "small" ? "h-1" : "h-1.5";
    const getColor = () => {
      if (percent === 100) return "bg-emerald-500";
      if (percent > 50) return "bg-yellow-500";
      return "bg-yellow-600";
    };

    return (
      <div className={`w-full overflow-hidden rounded-full bg-gray-800 ${height}`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }

  function EmptyState({ tab }: { tab: TabType }) {
    const messages = {
      running: { title: "No active missions", description: "Missions in progress will appear here" },
      completed: { title: "No completed missions", description: "Finished missions will appear here" },
      scheduled: { title: "No scheduled missions", description: "Future missions will appear here" },
    };

    const icons = {
      running: "⚡",
      completed: "✅",
      scheduled: "📅",
    };

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-yellow-500/30 bg-black py-16">
        <span className="text-4xl">{icons[tab]}</span>
        <p className="mt-4 text-sm font-medium text-yellow-400">{messages[tab].title}</p>
        <p className="mt-1 text-xs text-gray-600">{messages[tab].description}</p>
      </div>
    );
  }

  function StatsSummary() {
    const stats = [
      { label: "Active", count: categorizedGroups.running.length, color: "text-yellow-400" },
      { label: "Completed", count: categorizedGroups.completed.length, color: "text-emerald-400" },
      { label: "Scheduled", count: categorizedGroups.scheduled.length, color: "text-amber-400" },
    ];

    return (
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-yellow-500/20 bg-black px-4 py-3 text-center"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            <p className="mt-1 text-xs text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>
    );
  }

  function GroupTableRow({ group }: { group: GroupedOrder }) {
    const progress = getGroupProgress(group);
    const status = getGroupStatus(group);

    return (
      <tr
        onClick={() => setOpenedGroupId(group.id)}
        className="cursor-pointer border-t border-gray-800 transition hover:bg-yellow-500/5"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{group.name || `Mission #${group.id.slice(0, 8)}`}</p>
            {group.isBatch && (
              <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] text-blue-300">
                📦 {group.linksCount} links
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-600 font-mono">
            {group.isBatch ? group.batchId?.slice(0, 15) : group.orders[0]?.id}
          </p>
        </td>
        <td className="max-w-[220px] px-4 py-3">
          {group.isBatch ? (
            <p className="text-gray-500 text-xs">{group.linksCount} Instagram links</p>
          ) : (
            <p className="truncate text-gray-500" title={group.orders[0]?.link}>
              {toShortLink(group.orders[0]?.link || "")}
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={status} />
        </td>
        <td className="px-4 py-3">
          <div className="w-32">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-600">
                {progress.completed}/{progress.total} runs
              </span>
              <span className="text-[11px] font-medium text-gray-500">{progress.percent}%</span>
            </div>
            <ProgressBar percent={progress.percent} />
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600 text-xs">
          {new Date(group.createdAt).toLocaleDateString()}
          <span className="block text-gray-700">{new Date(group.createdAt).toLocaleTimeString()}</span>
        </td>
      </tr>
    );
  }

  function GroupCardItem({ group }: { group: GroupedOrder }) {
    const progress = getGroupProgress(group);
    const status = getGroupStatus(group);

    return (
      <button
        type="button"
        onClick={() => setOpenedGroupId(group.id)}
        className="group rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-4 text-left transition-all hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/5 w-full"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-white group-hover:text-yellow-100">
                {group.name || `Mission #${group.id.slice(0, 8)}`}
              </p>
              {group.isBatch && (
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 text-[9px] text-blue-300">
                  📦 {group.linksCount}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-gray-600 font-mono">
              {group.isBatch ? `Batch: ${group.linksCount} links` : group.orders[0]?.id}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {!group.isBatch && (
          <p className="mt-3 truncate text-xs text-gray-500" title={group.orders[0]?.link}>
            {toShortLink(group.orders[0]?.link || "")}
          </p>
        )}

        {group.isBatch && (
          <div className="mt-3 flex flex-wrap gap-1">
            {group.orders.slice(0, 3).map((order, idx) => (
              <span key={order.id} className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-gray-400">
                {extractReelId(order.link)}
              </span>
            ))}
            {group.orders.length > 3 && (
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-gray-500">
                +{group.orders.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-600">Progress</span>
            <span className="text-gray-500">
              {progress.completed}/{progress.total} ({progress.percent}%)
            </span>
          </div>
          <ProgressBar percent={progress.percent} />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-600">
          <span>Deployed</span>
          <span>{new Date(group.createdAt).toLocaleDateString()}</span>
        </div>
      </button>
    );
  }

  // Individual Link Card for Batch Orders Popup
  function IndividualLinkCard({ order, index }: { order: CreatedOrder; index: number }) {
    const progress = getProgress(order);
    const status = getRealStatus(order);
    const isControlling = controllingOrderId === order.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-black p-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-yellow-500/20 text-xs font-bold text-yellow-400">
                {index + 1}
              </span>
              <a
                href={order.link}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-blue-400 hover:text-blue-300 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {toShortLink(order.link)}
              </a>
            </div>
            <p className="mt-1 ml-8 text-[10px] text-gray-600 font-mono">{order.id}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Progress */}
        <div className="mt-3 ml-8">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">
              {progress.completed}/{progress.total} runs
            </span>
            <span className="text-gray-500">{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} size="small" />
        </div>

        {/* Stats */}
        <div className="mt-3 ml-8 grid grid-cols-4 gap-2">
          <div className="rounded-md bg-black/50 px-2 py-1 text-center">
            <p className="text-xs font-medium text-yellow-400">{(order.totalViews / 1000).toFixed(0)}k</p>
            <p className="text-[9px] text-gray-600">Views</p>
          </div>
          <div className="rounded-md bg-black/50 px-2 py-1 text-center">
            <p className="text-xs font-medium text-pink-400">{order.engagement.likes}</p>
            <p className="text-[9px] text-gray-600">Likes</p>
          </div>
          <div className="rounded-md bg-black/50 px-2 py-1 text-center">
            <p className="text-xs font-medium text-blue-400">{order.engagement.shares}</p>
            <p className="text-[9px] text-gray-600">Shares</p>
          </div>
          <div className="rounded-md bg-black/50 px-2 py-1 text-center">
            <p className="text-xs font-medium text-purple-400">{order.engagement.saves}</p>
            <p className="text-[9px] text-gray-600">Saves</p>
          </div>
        </div>

        {/* Individual Controls */}
        <div className="mt-3 ml-8 flex items-center gap-2 flex-wrap">
          {/* Pause/Resume */}
          {status === "running" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onControlOrder(order, "pause");
              }}
              disabled={isControlling}
              className="flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-medium text-orange-300 hover:bg-orange-500/20 transition disabled:opacity-50"
            >
              {isControlling ? "⏳" : "⏸️"} Pause
            </button>
          )}
          
          {status === "paused" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onControlOrder(order, "resume");
              }}
              disabled={isControlling}
              className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              {isControlling ? "⏳" : "▶️"} Resume
            </button>
          )}

          {/* Cancel */}
          {status !== "completed" && status !== "cancelled" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Cancel this order?\n\nLink: ${order.link.slice(0, 50)}...`)) {
                  onControlOrder(order, "cancel");
                }
              }}
              disabled={isControlling}
              className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-300 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              {isControlling ? "⏳" : "❌"} Cancel
            </button>
          )}

          {/* Clone */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloneOrder(order);
            }}
            className="flex items-center gap-1 rounded-md border border-gray-600 bg-black px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-white hover:border-gray-500 transition"
          >
            📋 Clone
          </button>

          {/* Open Link */}
          <a
            href={order.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-md border border-gray-600 bg-black px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-white hover:border-gray-500 transition"
          >
            🔗 Open
          </a>
        </div>

        {/* Error Message */}
        {order.errorMessage && (
          <div className="mt-2 ml-8 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-1">
            <p className="text-[10px] text-red-400">❌ {order.errorMessage}</p>
          </div>
        )}
      </motion.div>
    );
  }

  // Batch Order Detail Popup
  function BatchDetailPopup({ group }: { group: GroupedOrder }) {
    const overallProgress = getGroupProgress(group);
    const overallStatus = getGroupStatus(group);

    const statusCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      group.orders.forEach((order) => {
        const status = getRealStatus(order);
        counts[status] = (counts[status] || 0) + 1;
      });
      return counts;
    }, [group.orders]);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4 py-6"
        onClick={() => setOpenedGroupId(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-yellow-500/30 bg-black shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-800 px-5 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-yellow-400">{group.name}</h3>
                  {group.isBatch && (
                    <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-300">
                      📦 Bulk Order
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-600 font-mono">{group.batchId || group.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenedGroupId(null)}
                className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
              >
                ✕ Close
              </button>
            </div>

            {/* Overall Stats */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-gray-900 px-3 py-2 text-center">
                <p className="text-xl font-bold text-yellow-400">{group.linksCount}</p>
                <p className="text-[10px] text-gray-500">Total Links</p>
              </div>
              <div className="rounded-lg bg-gray-900 px-3 py-2 text-center">
                <p className="text-xl font-bold text-yellow-400">{(group.totalViews / 1000).toFixed(0)}k</p>
                <p className="text-[10px] text-gray-500">Total Views</p>
              </div>
              <div className="rounded-lg bg-gray-900 px-3 py-2 text-center">
                <p className="text-xl font-bold text-emerald-400">{overallProgress.percent}%</p>
                <p className="text-[10px] text-gray-500">Progress</p>
              </div>
              <div className="rounded-lg bg-gray-900 px-3 py-2 text-center">
                <StatusBadge status={overallStatus} />
              </div>
            </div>

            {/* Status Summary */}
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1 text-xs">
                  <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]?.dot || 'bg-gray-500'}`} />
                  <span className="text-gray-400">{count} {status}</span>
                </div>
              ))}
            </div>

            {/* Bulk Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (window.confirm(`Pause ALL ${group.orders.filter(o => getRealStatus(o) === 'running').length} running orders?`)) {
                    group.orders.forEach((order) => {
                      if (getRealStatus(order) === 'running') {
                        onControlOrder(order, 'pause');
                      }
                    });
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20 transition"
              >
                ⏸️ Pause All Running
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Resume ALL ${group.orders.filter(o => getRealStatus(o) === 'paused').length} paused orders?`)) {
                    group.orders.forEach((order) => {
                      if (getRealStatus(order) === 'paused') {
                        onControlOrder(order, 'resume');
                      }
                    });
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition"
              >
                ▶️ Resume All Paused
              </button>
              <button
                onClick={() => {
                  const activeCount = group.orders.filter(o => !['completed', 'cancelled'].includes(getRealStatus(o))).length;
                  if (window.confirm(`⚠️ Cancel ALL ${activeCount} active orders?\n\nThis cannot be undone!`)) {
                    group.orders.forEach((order) => {
                      const status = getRealStatus(order);
                      if (status !== 'completed' && status !== 'cancelled') {
                        onControlOrder(order, 'cancel');
                      }
                    });
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition"
              >
                ❌ Cancel All Active
              </button>
            </div>
          </div>

          {/* Individual Links List */}
          <div className="flex-1 overflow-y-auto p-5">
            <h4 className="text-sm font-semibold text-gray-400 mb-3">
              📋 Individual Links ({group.orders.length})
            </h4>
            <div className="space-y-3">
              {group.orders.map((order, index) => (
                <IndividualLinkCard key={order.id} order={order} index={index} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Single Order Detail Popup (for non-batch orders)
  function SingleOrderPopup({ order }: { order: CreatedOrder }) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4 py-6"
        onClick={() => setOpenedGroupId(null)}
      >
        <div
          className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-yellow-500/30 bg-black p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-yellow-400">Mission Details</h3>
              <p className="mt-0.5 text-xs text-gray-600 font-mono">{order.id}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenedGroupId(null)}
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
            >
              ✕ Close
            </button>
          </div>
          <OrderCard
            key={order.id}
            order={order}
            controlBusy={controllingOrderId === order.id}
            onControl={onControlOrder}
            onClone={onCloneOrder}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <h2 className="text-2xl font-bold tracking-tight text-yellow-400">Mission Control</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage all your operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="inline-flex h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>Live monitoring</span>
        </div>
      </div>

      {/* Stats Summary */}
      <StatsSummary />

      {/* Notice */}
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <p>{notice}</p>
          </div>
          <button
            type="button"
            onClick={onDismissNotice}
            className="rounded-lg px-2 py-1 text-emerald-200 hover:bg-emerald-500/20 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count = categorizedGroups[tab.key].length;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-yellow-500/20 text-yellow-300 shadow-lg shadow-yellow-500/10"
                      : "text-gray-500 hover:bg-yellow-500/10 hover:text-yellow-400"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                      isActive ? "bg-yellow-500/30 text-yellow-100" : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & View Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search missions..."
                className="w-full rounded-lg border border-yellow-500/30 bg-black py-2.5 pl-10 pr-4 text-sm text-gray-100 outline-none ring-yellow-500/40 transition placeholder:text-gray-700 focus:border-yellow-500/50 focus:ring-2"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="inline-flex rounded-lg border border-yellow-500/30 bg-black p-1">
              <button
                type="button"
                onClick={() => setViewMode("rows")}
                className={`rounded-md px-3 py-2 text-xs transition ${
                  viewMode === "rows"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "text-gray-500 hover:text-yellow-400"
                }`}
                title="Table View"
              >
                ☰ Rows
              </button>
              <button
                type="button"
                onClick={() => setViewMode("columns")}
                className={`rounded-md px-3 py-2 text-xs transition ${
                  viewMode === "columns"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "text-gray-500 hover:text-yellow-400"
                }`}
                title="Grid View"
              >
                ⊞ Grid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      {query && (
        <p className="text-sm text-gray-600">
          Found <span className="text-gray-400 font-medium">{filteredGroups.length}</span> missions
          matching "<span className="text-yellow-400">{query}</span>" in {activeTab}
        </p>
      )}

      {/* Orders Display */}
      {filteredGroups.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : viewMode === "rows" ? (
        <div className="overflow-hidden rounded-xl border border-yellow-500/20 bg-black">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-400">
              <thead className="bg-gray-900 text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Mission</th>
                  <th className="px-4 py-3 font-medium">Link(s)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Deployed</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <GroupTableRow key={group.id} group={group} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGroups.map((group) => (
            <GroupCardItem key={group.id} group={group} />
          ))}
        </div>
      )}

      {/* Detail Popup */}
      <AnimatePresence>
        {openedGroup && (
          openedGroup.isBatch ? (
            <BatchDetailPopup group={openedGroup} />
          ) : (
            <SingleOrderPopup order={openedGroup.orders[0]} />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
