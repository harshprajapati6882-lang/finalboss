import type { CreatedOrder } from "../types/order";

interface DashboardPageProps {
  orders: CreatedOrder[];
}

export function DashboardPage({ orders }: DashboardPageProps) {
  const running = orders.filter((order) => order.status === "running" || order.status === "processing").length;
  const completed = orders.filter((order) => order.status === "completed").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 py-7">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">Basic order summary across your internal automation panel.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Orders</p>
          <p className="mt-1 text-2xl font-semibold text-white">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Running Orders</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">{running}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Completed Orders</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-300">{completed}</p>
        </div>
      </div>
    </div>
  );
}
