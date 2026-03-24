import { useEffect, useMemo, useState } from "react";
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

export function OrdersPage({
  orders,
  notice,
  controllingOrderId,
  onControlOrder,
  onCloneOrder,
  onDismissNotice,
}: OrdersPageProps) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"rows" | "columns">("rows");
  const [openedOrderId, setOpenedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const groupedOrders = useMemo(() => {
      const scheduled = [];
      const running = [];
      const completed = [];

      filteredOrders.forEach((order) => {
        const status = getRealStatus(order);

        if (status === "completed") completed.push(order);
        else if (status === "running" || status === "processing") running.push(order);
        else scheduled.push(order);
      });

      return { scheduled, running, completed };
    }, [filteredOrders]);
    const value = query.trim().toLowerCase();
    if (!value) return orders;
    return orders.filter(
      (order) => (order.name || "").toLowerCase().includes(value) || (order.link || "").toLowerCase().includes(value)
    );
  }, [orders, query]);

  useEffect(() => {
    if (!openedOrderId) return;
    const stillExists = orders.some((order) => order.id === openedOrderId);
    if (!stillExists) setOpenedOrderId(null);
  }, [orders, openedOrderId]);

  const openedOrder = useMemo(() => orders.find((order) => order.id === openedOrderId) ?? null, [orders, openedOrderId]);

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

  function getRealStatus(order) {
    const runs = order.runs || [];
    const now = Date.now();

    if (runs.length > 0) {
      const allCompleted = runs.every((run) => {
        const runTime = run?.at instanceof Date
          ? run.at.getTime()
          : new Date(run?.at ?? now).getTime();

        return runTime <= now;
      });

      if (allCompleted) return "completed";
    }

    if (order.status === "processing") return "running";

    return order.status;
  }

  function toShortLink(link: string) {
    if (!link) return "-";
    return link.length > 48 ? `${link.slice(0, 30)}...${link.slice(-12)}` : link;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 py-7">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Orders</h2>
        <p className="mt-1 text-sm text-slate-400">Track immediately executed orders and inspect run schedules.</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by order name or link"
            className="min-w-[260px] flex-1 rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/40 transition focus:ring-2"
          />
          <div className="inline-flex rounded-lg border border-slate-700 bg-[#0d1424] p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("rows")}
              className={`rounded-md px-3 py-1.5 transition ${
                viewMode === "rows" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Rows
            </button>
            <button
              type="button"
              onClick={() => setViewMode("columns")}
              className={`rounded-md px-3 py-1.5 transition ${
                viewMode === "columns" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Columns
            </button>
          </div>
        </div>
      </div>
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <p>{notice}</p>
          <button type="button" onClick={onDismissNotice} className="text-emerald-100/80 hover:text-emerald-50">
            Dismiss
          </button>
        </div>
      )}
      {filteredOrders.length === 0 && <p className="text-sm text-slate-500">No orders found.</p>}
      {viewMode === "rows" && (
        <div className="space-y-6">

          {/* Scheduled */}
          {groupedOrders.scheduled.length > 0 && (
            <div>
              <h3 className="text-sm text-slate-400 mb-2">
                Scheduled ({groupedOrders.scheduled.length})
              </h3>
              <table className="w-full text-left text-xs text-slate-300">
               <tbody>
                 {groupedOrders.scheduled.map((order) => {
                   const progress = getProgress(order);
                   return (
                     <tr key={order.id}>
                       <td>{order.name}</td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>
          </div>
        )}

        {/* Running */}
        {groupedOrders.running.length > 0 && (
          <div>
            <h3 className="text-sm text-cyan-300 mb-2">
              Running ({groupedOrders.running.length})
            </h3>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f1627] text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Link</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Progress</th>
                    <th className="px-3 py-2">Runs</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedOrders.running.map((order) => {
                    const progress = getProgress(order);
                    return (
                      <tr key={order.id}>
                        <td className="px-3 py-2">{order.name}</td>
                        <td className="px-3 py-2">{order.link}</td>
                        <td className="px-3 py-2">{getRealStatus(order)}</td>
                        <td className="px-3 py-2">{progress.percent}%</td>
                        <td className="px-3 py-2">{progress.completed}/{progress.total}</td>
                        <td className="px-3 py-2">{new Date(order.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Completed */}
        {groupedOrders.completed.length > 0 && (
          <div>
            <h3 className="text-sm text-emerald-300 mb-2">
              Completed ({groupedOrders.completed.length})
            </h3>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20 opacity-70">
              <table className="w-full text-left text-xs text-slate-300">
                <tbody>
                  {groupedOrders.completed.map((order) => {
                    const progress = getProgress(order);
                    return (
                      <tr key={order.id}>
                        <td className="px-3 py-2">{order.name}</td>
                        <td className="px-3 py-2">{order.link}</td>
                        <td className="px-3 py-2">{getRealStatus(order)}</td>
                        <td className="px-3 py-2">{progress.percent}%</td>
                        <td className="px-3 py-2">{progress.completed}/{progress.total}</td>
                        <td className="px-3 py-2">{new Date(order.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    )}

      {filteredOrders.length > 0 && viewMode === "columns" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const progress = getProgress(order);
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setOpenedOrderId(order.id)}
                className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-left transition hover:border-cyan-500/40 hover:bg-slate-900/50"
              >
                <p className="truncate text-sm font-semibold text-white">{order.name || `Order #${order.id}`}</p>
                <p className="mt-1 truncate text-xs text-slate-400" title={order.link}>
                  {toShortLink(order.link)}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span className="uppercase text-slate-300">{getRealStatus(order)}</span>
                  <span>
                    {progress.completed}/{progress.total}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${progress.percent}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={() => setOpenedOrderId(null)}>
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-800 bg-[#070d18] p-4 sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Order Details</h3>
              <button
                type="button"
                onClick={() => setOpenedOrderId(null)}
                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
            <OrderCard
              key={openedOrder.id}
              order={openedOrder}
              controlBusy={controllingOrderId === openedOrder.id}
              onControl={onControlOrder}
              onClone={onCloneOrder}
            />
          </div>
        </div>
      )}
    </div>
  );
}
