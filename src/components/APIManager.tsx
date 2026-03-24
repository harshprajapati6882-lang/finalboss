import { useState } from "react";
import type { ApiPanel } from "../types/order";

interface APIManagerProps {
  apis: ApiPanel[];
  onAddApi: (api: { name: string; url: string; key: string }) => void;
  onEditApi: (id: string, api: { name: string; url: string; key: string }) => void;
  onDeleteApi: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onFetchServices: (id: string) => void;
  fetchingApiId: string | null;
}

export function APIManager({ apis, onAddApi, onEditApi, onDeleteApi, onToggleStatus, onFetchServices, fetchingApiId }: APIManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editKey, setEditKey] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startEdit = (api: ApiPanel) => {
    setEditingId(api.id);
    setEditName(api.name);
    setEditUrl(api.url);
    setEditKey(api.key);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editUrl.trim() || !editKey.trim() || !editingId) return;
    onEditApi(editingId, { name: editName.trim(), url: editUrl.trim(), key: editKey.trim() });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDeleteApi(deleteId);
      setDeleteId(null);
    }
  };

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
            {editingId === api.id ? (
              <div className="space-y-3">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="API Name" className="w-full rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100" />
                <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="API URL" className="w-full rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100" />
                <input value={editKey} onChange={(e) => setEditKey(e.target.value)} placeholder="API Key" className="w-full rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100" />
                <div className="flex gap-2">
                  <button type="button" onClick={saveEdit} className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200">Save</button>
                  <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300">Cancel</button>
                </div>
              </div>
            ) : deleteId === api.id ? (
              <div className="space-y-3">
                <p className="text-sm text-red-300">Are you sure you want to delete "{api.name}"?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-sm text-red-200">Yes, Delete</button>
                  <button type="button" onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
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
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => startEdit(api)} className="rounded-md border border-yellow-400/50 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-200">
                      ✏️ Edit
                    </button>
                    <button type="button" onClick={() => confirmDelete(api.id)} className="rounded-md border border-red-400/50 bg-red-500/10 px-2.5 py-1 text-xs text-red-200">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
