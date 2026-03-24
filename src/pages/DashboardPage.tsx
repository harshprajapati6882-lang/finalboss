import { useState, useMemo } from "react";
import type { CreatedOrder } from "../types/order";

interface DashboardPageProps {
  orders: CreatedOrder[];
}

type TimePeriod = "today" | "week" | "month" | "all";

export function DashboardPage({ orders }: DashboardPageProps) {
  const [period, setPeriod] = useState<TimePeriod>("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter orders by time period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (period === "today") return orderDate >= todayStart;
      if (period === "week") return orderDate >= weekStart;
      if (period === "month") return orderDate >= monthStart;
      return true;
    });
  }, [orders, period]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const running = filteredOrders.filter(
      (o) => o.status === "running" || o.status === "processing" || o.status === "paused"
    ).length;
    const completed = filteredOrders.filter((o) => o.status === "completed").length;
    const failed = filteredOrders.filter((o) => o.status === "failed" || o.status === "cancelled").length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, running, completed, failed, successRate };
  }, [filteredOrders]);

  // Calculate services breakdown
  const servicesBreakdown = useMemo(() => {
    let views = 0;
    let likes = 0;
    let shares = 0;
    let saves = 0;

    filteredOrders.forEach((order) => {
      (order.runs || []).forEach((run) => {
        views += run.views || 0;
        likes += run.likes || 0;
        shares += run.shares || 0;
        saves += run.saves || 0;
      });
    });

    const total = views + likes + shares + saves;
    return {
      views: { count: views, percent: total > 0 ? Math.round((views / total) * 100) : 0 },
      likes: { count: likes, percent: total > 0 ? Math.round((likes / total) * 100) : 0 },
      shares: { count: shares, percent: total > 0 ? Math.round((shares / total) * 100) : 0 },
      saves: { count: saves, percent: total > 0 ? Math.round((saves / total) * 100) : 0 },
      total,
    };
  }, [filteredOrders]);

  // Get last 7 days data for chart
  const chartData = useMemo(() => {
    const days: { label: string; count: number; date: Date }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate < dayEnd;
      }).length;

      days.push({
        label: date.toLocaleDateString("en", { weekday: "short" }),
        count,
        date: dayStart,
      });
    }

    const maxCount = Math.max(...days.map((d) => d.count), 1);
    return { days, maxCount };
  }, [orders]);

  // Recent orders (last 5)
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [orders]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
      case "processing":
        return "text-cyan-400";
      case "completed":
        return "text-emerald-400";
      case "paused":
        return "text-yellow-400";
      case "failed":
      case "cancelled":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "running":
      case "processing":
        return "bg-cyan-500/20";
      case "completed":
        return "bg-emerald-500/20";
      case "paused":
        return "bg-yellow-500/20";
      case "failed":
      case "cancelled":
        return "bg-red-500/20";
      default:
        return "bg-slate-500/20";
    }
  };

  // Clear ONLY orders data (keeps APIs and Bundles)
  const handleClearOrders = () => {
    localStorage.removeItem("dev-smm-orders");
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-400">
            Overview of your SMM panel performance
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="inline-flex rounded-lg border border-slate-700 bg-[#0d1424] p-1">
          {[
            { key: "today", label: "Today" },
            { key: "week", label: "7 Days" },
            { key: "month", label: "30 Days" },
            { key: "all", label: "All Time" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key as TimePeriod)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                period === item.key
                  ? "bg-cyan-500/20 text-cyan-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Orders</p>
            <span className="text-xl">📦</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">
            {period === "today" && "Created today"}
            {period === "week" && "Last 7 days"}
            {period === "month" && "Last 30 days"}
            {period === "all" && "All time"}
          </p>
        </div>

        {/* Running Orders */}
        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-400/80">Running</p>
            <span className="text-xl">🚀</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-cyan-300">{stats.running}</p>
          <div className="mt-2 flex items-center gap-1">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400"></span>
            <p className="text-xs text-cyan-400/70">Active now</p>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/80">Completed</p>
            <span className="text-xl">✅</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-300">{stats.completed}</p>
          <p className="mt-1 text-xs text-emerald-400/70">Successfully finished</p>
        </div>

        {/* Failed Orders */}
        <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-red-400/80">Failed</p>
            <span className="text-xl">❌</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-red-300">{stats.failed}</p>
          <p className="mt-1 text-xs text-red-400/70">Cancelled or failed</p>
        </div>
      </div>

      {/* Success Rate Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Success Rate</h3>
          <span className={`text-2xl font-bold ${stats.successRate >= 70 ? "text-emerald-400" : stats.successRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {stats.successRate}%
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              stats.successRate >= 70 ? "bg-emerald-500" : stats.successRate >= 40 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${stats.successRate}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{stats.completed} completed</span>
          <span>{stats.failed} failed</span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <h3 className="text-sm font-medium text-white">📈 Orders Last 7 Days</h3>
          <div className="mt-5 flex h-40 items-end justify-between gap-2">
            {chartData.days.map((day, index) => {
              const height = chartData.maxCount > 0 ? (day.count / chartData.maxCount) * 100 : 0;
              const isToday = index === chartData.days.length - 1;
              return (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs text-slate-400">{day.count}</span>
                  <div className="relative w-full flex-1">
                    <div
                      className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${
                        isToday ? "bg-cyan-500" : "bg-slate-600"
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className={`text-xs ${isToday ? "text-cyan-400 font-medium" : "text-slate-500"}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <h3 className="text-sm font-medium text-white">🔥 Services Breakdown</h3>
          <div className="mt-5 space-y-4">
            {/* Views */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">👁️ Views</span>
                <span className="text-slate-400">{servicesBreakdown.views.count.toLocaleString()} ({servicesBreakdown.views.percent}%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${servicesBreakdown.views.percent}%` }} />
              </div>
            </div>

            {/* Likes */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">❤️ Likes</span>
                <span className="text-slate-400">{servicesBreakdown.likes.count.toLocaleString()} ({servicesBreakdown.likes.percent}%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-pink-500 transition-all duration-500" style={{ width: `${servicesBreakdown.likes.percent}%` }} />
              </div>
            </div>

            {/* Shares */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">🔄 Shares</span>
                <span className="text-slate-400">{servicesBreakdown.shares.count.toLocaleString()} ({servicesBreakdown.shares.percent}%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${servicesBreakdown.shares.percent}%` }} />
              </div>
            </div>

            {/* Saves */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">🔖 Saves</span>
                <span className="text-slate-400">{servicesBreakdown.saves.count.toLocaleString()} ({servicesBreakdown.saves.percent}%)</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-yellow-500 transition-all duration-500" style={{ width: `${servicesBreakdown.saves.percent}%` }} />
              </div>
            </div>

            {/* Total */}
            <div className="mt-4 rounded-lg bg-slate-800/50 p-3 text-center">
              <p className="text-xs text-slate-500">Total Engagements</p>
              <p className="text-xl font-bold text-white">{servicesBreakdown.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">⏰ Recent Orders</h3>
          <span className="text-xs text-slate-500">Last 5 orders</span>
        </div>

        {recentOrders.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-700 py-8 text-center">
            <p className="text-sm text-slate-500">No orders yet</p>
            <p className="mt-1 text-xs text-slate-600">Create your first order to see it here</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3 transition hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${getStatusBg(order.status)}`}>
                    {order.status === "running" || order.status === "processing" ? "🚀" :
                     order.status === "completed" ? "✅" :
                     order.status === "paused" ? "⏸️" : "❌"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {order.name || `Order #${order.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()} at{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusBg(order.status)} ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.runs?.length || 0} runs
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-center">
          <p className="text-xs text-slate-500">Average Runs/Order</p>
          <p className="mt-1 text-xl font-bold text-white">
            {filteredOrders.length > 0
              ? Math.round(filteredOrders.reduce((sum, o) => sum + (o.runs?.length || 0), 0) / filteredOrders.length)
              : 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-center">
          <p className="text-xs text-slate-500">Total Runs Scheduled</p>
          <p className="mt-1 text-xl font-bold text-white">
            {filteredOrders.reduce((sum, o) => sum + (o.runs?.length || 0), 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-center">
          <p className="text-xs text-slate-500">Completed Runs</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">
            {filteredOrders.reduce((sum, o) => sum + (o.completedRuns || 0), 0)}
          </p>
        </div>
      </div>

      {/* Clear Orders Button */}
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-orange-300">🧹 Clear Orders</h3>
            <p className="mt-1 text-xs text-orange-400/70">
              Delete all orders for a fresh start.
              <br />
              <span className="text-emerald-400">✓ APIs and Bundles will be kept safe!</span>
            </p>
          </div>

          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-200 transition hover:bg-orange-500/20"
            >
              🗑️ Clear Orders
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-300">Are you sure?</span>
              <button
                type="button"
                onClick={handleClearOrders}
                className="rounded-lg border border-red-500 bg-red-500/30 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/50"
              >
                ✓ Yes, Delete Orders
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
              >
                ✕ Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
