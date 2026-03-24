import { useState } from "react";
import type { ApiPanel } from "../types/order";

interface APIManagerProps {
  apis: ApiPanel[];
  onAddApi: (api: { name: string; url: string; key: string }) => void;
  onToggleStatus: (id: string) => void;
  onFetchServices: (id: string) => void;
  fetchingApiId: string | null;
}

export function APIManager({ apis, onAddApi, onToggleStatus, onFetchServices, fetchingApiId }: APIManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-white">APIs</h2>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200"
        >
          ➕ Add API
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !url.trim() || !key.trim()) return;
            onAddApi({ name: name.trim(), url: url.trim(), key: key.trim() });
            setName("");
            setUrl("");
            setKey("");
            setShowForm(false);
          }}
          className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/30 p-5 md:grid-cols-3"
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="API Name" className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100" />
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="API URL" className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100" />
          <input value={key} onChange={(event) => setKey(event.target.value)} placeholder="API Key" className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100" />
          <button type="submit" className="md:col-span-3 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">Save API</button>
        </form>
      )}

      <div className="space-y-3">
        {apis.length === 0 && <p className="text-sm text-slate-500">No APIs added yet.</p>}
        {apis.map((api) => (
          <article key={api.id} className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">{api.name}</h3>
                <p className="text-sm text-slate-400">{api.url}</p>
                <p className="mt-1 text-xs text-slate-500">{api.services.length} services loaded</p>
                {api.lastFetchError && <p className="mt-1 text-xs text-rose-300">{api.lastFetchError}</p>}
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${api.status === "Active" ? "text-emerald-300" : "text-slate-400"}`}>{api.status}</p>
                <button type="button" onClick={() => onToggleStatus(api.id)} className="mt-1 block text-xs text-cyan-300">
                  Toggle Status
                </button>
                <button
                  type="button"
                  onClick={() => onFetchServices(api.id)}
                  disabled={fetchingApiId === api.id}
                  className="mt-2 rounded-md border border-cyan-400/50 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {fetchingApiId === api.id ? "Fetching..." : "Fetch Services"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
