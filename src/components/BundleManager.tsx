import { useMemo, useState } from "react";
import type { ApiPanel, ApiService, Bundle } from "../types/order";

interface BundleManagerProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  onAddBundle: (bundle: {
    name: string;
    apiId: string;
    views: string;
    likes: string;
    shares: string;
    saves: string;
  }) => void;
  onUpdateBundle: (
    id: string,
    bundle: {
      name: string;
      apiId: string;
      views: string;
      likes: string;
      shares: string;
      saves: string;
    }
  ) => void;
  onDeleteBundle: (id: string) => void;
}

function filterServices(services: ApiService[], keywords: string[]) {
  return services.filter((service) => {
    const name = service.name.toLowerCase();
    return keywords.some((keyword) => name.includes(keyword));
  });
}

function getApiServices(apis: ApiPanel[], apiId: string) {
  return apis.find((api) => api.id === apiId)?.services ?? [];
}

export function BundleManager({ apis, bundles, onAddBundle, onUpdateBundle, onDeleteBundle }: BundleManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [apiId, setApiId] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [shares, setShares] = useState("");
  const [saves, setSaves] = useState("");

  const viewOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["view", "views"]),
    [apis, apiId]
  );
  const likeOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["like", "likes"]),
    [apis, apiId]
  );
  const shareOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["share", "shares"]),
    [apis, apiId]
  );
  const saveOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["save", "saves"]),
    [apis, apiId]
  );

  const resetForm = () => {
    setName("");
    setApiId("");
    setViews("");
    setLikes("");
    setShares("");
    setSaves("");
    setEditingBundleId(null);
    setShowForm(false);
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📁</span>
          <h2 className="text-2xl font-bold tracking-tight text-yellow-400">Arsenal Bundles</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
              return;
            }
            setShowForm(true);
          }}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-300 transition hover:bg-yellow-500/20"
        >
          {showForm ? "Close" : "➕ Create Bundle"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            if (!apiId) return;
            if (!views.trim() || !likes.trim() || !shares.trim() || !saves.trim()) return;
            const payload = {
              name: name.trim(),
              apiId,
              views: views.trim(),
              likes: likes.trim(),
              shares: shares.trim(),
              saves: saves.trim(),
            };
            if (editingBundleId) {
              onUpdateBundle(editingBundleId, payload);
            } else {
              onAddBundle(payload);
            }
            resetForm();
          }}
          className="grid gap-3 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-gray-900 to-black p-5 md:grid-cols-2"
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bundle Name"
            className="rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-500/50 md:col-span-2"
          />

          <p className="text-xs uppercase tracking-wide text-gray-600 md:col-span-2">Bundle Configuration</p>

          <select
            value={apiId}
            onChange={(event) => {
              setApiId(event.target.value);
              setViews("");
              setLikes("");
              setShares("");
              setSaves("");
            }}
            className="rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100 md:col-span-2"
          >
            <option value="">Select API Panel</option>
            {apis.map((api) => (
              <option key={`bundle-api-${api.id}`} value={api.id}>
                {api.name}
              </option>
            ))}
          </select>
          <select
            value={views}
            onChange={(event) => setViews(event.target.value)}
            className="rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100"
          >
            <option value="">Views Service</option>
            {viewOptions.map((service) => (
              <option key={`views-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={likes}
            onChange={(event) => setLikes(event.target.value)}
            className="rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100"
          >
            <option value="">Likes Service</option>
            {likeOptions.map((service) => (
              <option key={`likes-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={shares}
            onChange={(event) => setShares(event.target.value)}
            className="rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100"
          >
            <option value="">Shares Service</option>
            {shareOptions.map((service) => (
              <option key={`shares-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={saves}
            onChange={(event) => setSaves(event.target.value)}
            className="rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100"
          >
            <option value="">Saves Service</option>
            {saveOptions.map((service) => (
              <option key={`saves-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="md:col-span-2 rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-3 py-2 text-sm font-medium text-yellow-300 transition hover:bg-yellow-500/30"
          >
            {editingBundleId ? "Update Bundle" : "Save Bundle"}
          </button>
          {editingBundleId && (
            <button
              type="button"
              onClick={resetForm}
              className="md:col-span-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-700"
            >
              Cancel Edit
            </button>
          )}
        </form>
      )}

      <div className="space-y-3">
        {bundles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-yellow-500/30 bg-black p-8 text-center">
            <span className="text-4xl">📁</span>
            <p className="mt-2 text-sm text-gray-500">No bundles created yet</p>
            <p className="mt-1 text-xs text-gray-600">Create your first arsenal bundle</p>
          </div>
        )}
        {bundles.map((bundle) => (
          <article key={bundle.id} className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-4">
            <h3 className="text-base font-semibold text-yellow-400">{bundle.name}</h3>
            <p className="mt-2 text-sm text-gray-500">
              Panel: <span className="text-gray-300">{apis.find((api) => api.id === bundle.apiId)?.name ?? "Unknown"}</span>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Views Service: <span className="text-gray-300">{bundle.serviceIds.views}</span>
            </p>
            <p className="text-sm text-gray-500">
              Likes Service: <span className="text-gray-300">{bundle.serviceIds.likes}</span>
            </p>
            <p className="text-sm text-gray-500">
              Shares Service: <span className="text-gray-300">{bundle.serviceIds.shares}</span>
            </p>
            <p className="text-sm text-gray-500">
              Saves Service: <span className="text-gray-300">{bundle.serviceIds.saves}</span>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingBundleId(bundle.id);
                  setName(bundle.name);
                  setApiId(bundle.apiId);
                  setViews(bundle.serviceIds.views);
                  setLikes(bundle.serviceIds.likes);
                  setShares(bundle.serviceIds.shares);
                  setSaves(bundle.serviceIds.saves);
                  setShowForm(true);
                }}
                className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1.5 text-xs text-yellow-300 transition hover:bg-yellow-500/20"
              >
                ✏️ Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm("Are you sure you want to delete this bundle?");
                  if (!confirmed) return;
                  onDeleteBundle(bundle.id);
                  if (editingBundleId === bundle.id) {
                    resetForm();
                  }
                }}
                className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20"
              >
                🗑 Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
