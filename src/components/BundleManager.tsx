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

const JOKER_QUOTES = [
  "Why so serious?",
  "Let's put a smile on that face!",
  "Introduce a little anarchy...",
  "It's not about the money, it's about sending a message.",
  "Madness is like gravity, all it takes is a little push.",
  "I'm an agent of chaos.",
  "Let's turn those frowns upside down!",
];

function getRandomQuote() {
  return JOKER_QUOTES[Math.floor(Math.random() * JOKER_QUOTES.length)];
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-3xl animate-pulse">🃏</span>
            <div className="absolute -inset-1 animate-ping rounded-full bg-purple-500/20" style={{ animationDuration: '2s' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-green-400 to-purple-400 bg-clip-text text-transparent">
              Chaos Bundles
            </h2>
            <p className="text-xs text-purple-400/60 italic">"{getRandomQuote()}"</p>
          </div>
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
          className="group relative overflow-hidden rounded-lg border border-purple-500/50 bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-300 transition-all hover:bg-purple-500/30 hover:shadow-lg hover:shadow-purple-500/25"
        >
          <span className="relative z-10">{showForm ? "Close" : "🃏 Create Bundle"}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-green-500/20 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
      </div>

      {/* Ha Ha Ha Banner */}
      <div className="relative overflow-hidden rounded-xl border border-green-500/30 bg-gradient-to-r from-purple-900/30 via-green-900/20 to-purple-900/30 p-3">
        <div className="flex items-center justify-center gap-4 text-green-400/60 text-sm font-bold tracking-widest">
          <span>HA</span>
          <span className="text-purple-400/60">HA</span>
          <span>HA</span>
          <span className="text-purple-400/60">HA</span>
          <span>HA</span>
          <span className="text-purple-400/60">HA</span>
          <span>HA</span>
        </div>
      </div>

      {/* Form */}
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
          className="relative grid gap-3 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-black to-green-950/30 p-5 md:grid-cols-2 overflow-hidden"
        >
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/10 to-transparent" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-purple-500/10 to-transparent" />

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="🃏 Bundle Name"
            className="rounded-xl border border-purple-500/30 bg-black/50 px-3 py-2.5 text-sm text-purple-100 placeholder-purple-400/40 outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 md:col-span-2 transition-all"
          />

          <p className="text-xs uppercase tracking-wide text-green-400/60 md:col-span-2 flex items-center gap-2">
            <span>🎭</span> Chaos Configuration
          </p>

          <select
            value={apiId}
            onChange={(event) => {
              setApiId(event.target.value);
              setViews("");
              setLikes("");
              setShares("");
              setSaves("");
            }}
            className="rounded-xl border border-purple-500/30 bg-black/50 px-3 py-2.5 text-sm text-purple-100 md:col-span-2 focus:border-green-500/50 transition-all"
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
            className="rounded-xl border border-purple-500/30 bg-black/50 px-3 py-2.5 text-sm text-purple-100 focus:border-green-500/50 transition-all"
          >
            <option value="">👁️ Views Service</option>
            {viewOptions.map((service) => (
              <option key={`views-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={likes}
            onChange={(event) => setLikes(event.target.value)}
            className="rounded-xl border border-purple-500/30 bg-black/50 px-3 py-2.5 text-sm text-purple-100 focus:border-green-500/50 transition-all"
          >
            <option value="">💜 Likes Service</option>
            {likeOptions.map((service) => (
              <option key={`likes-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={shares}
            onChange={(event) => setShares(event.target.value)}
            className="rounded-xl border border-purple-500/30 bg-black/50 px-3 py-2.5 text-sm text-purple-100 focus:border-green-500/50 transition-all"
          >
            <option value="">🔄 Shares Service</option>
            {shareOptions.map((service) => (
              <option key={`shares-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={saves}
            onChange={(event) => setSaves(event.target.value)}
            className="rounded-xl border border-purple-500/30 bg-black/50 px-3 py-2.5 text-sm text-purple-100 focus:border-green-500/50 transition-all"
          >
            <option value="">💾 Saves Service</option>
            {saveOptions.map((service) => (
              <option key={`saves-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="md:col-span-2 group relative overflow-hidden rounded-lg border border-green-500/50 bg-gradient-to-r from-green-600/20 to-purple-600/20 px-3 py-2.5 text-sm font-bold text-green-300 transition-all hover:from-green-600/30 hover:to-purple-600/30 hover:shadow-lg hover:shadow-green-500/20"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>🎭</span>
              {editingBundleId ? "Update Chaos" : "Unleash Bundle"}
            </span>
          </button>

          {editingBundleId && (
            <button
              type="button"
              onClick={resetForm}
              className="md:col-span-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition-all hover:bg-red-500/20"
            >
              ❌ Cancel Edit
            </button>
          )}
        </form>
      )}

      {/* Bundle Cards */}
      <div className="space-y-3">
        {bundles.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-black p-10 text-center">
            {/* Joker smile decoration */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5">
              <span className="text-[150px]">🃏</span>
            </div>
            
            <div className="relative">
              <span className="text-5xl">🎭</span>
              <p className="mt-4 text-lg font-bold bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent">
                No bundles yet...
              </p>
              <p className="mt-2 text-sm text-purple-400/60 italic">
                "Why so serious? Let's create some chaos!"
              </p>
            </div>
          </div>
        )}

        {bundles.map((bundle, index) => (
          <article 
            key={bundle.id} 
            className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-black to-green-950/20 p-5 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
          >
            {/* Card decorations */}
            <div className="absolute top-2 right-2 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
              {index % 2 === 0 ? '🃏' : '🎭'}
            </div>
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-purple-500/5 blur-2xl group-hover:bg-green-500/10 transition-colors" />

            {/* Content */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="text-lg">🃏</span>
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-300 to-green-300 bg-clip-text text-transparent">
                  {bundle.name}
                </h3>
              </div>

              <div className="mt-3 space-y-1.5">
                <p className="text-sm text-purple-300/70">
                  <span className="text-green-400">🎯 Panel:</span>{" "}
                  <span className="text-purple-200">{apis.find((api) => api.id === bundle.apiId)?.name ?? "Unknown"}</span>
                </p>
                
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <p className="text-xs bg-purple-500/10 rounded-lg px-2 py-1.5 border border-purple-500/20">
                    <span className="text-green-400">👁️</span>{" "}
                    <span className="text-purple-300">{bundle.serviceIds.views || "Not set"}</span>
                  </p>
                  <p className="text-xs bg-purple-500/10 rounded-lg px-2 py-1.5 border border-purple-500/20">
                    <span className="text-green-400">💜</span>{" "}
                    <span className="text-purple-300">{bundle.serviceIds.likes || "Not set"}</span>
                  </p>
                  <p className="text-xs bg-purple-500/10 rounded-lg px-2 py-1.5 border border-purple-500/20">
                    <span className="text-green-400">🔄</span>{" "}
                    <span className="text-purple-300">{bundle.serviceIds.shares || "Not set"}</span>
                  </p>
                  <p className="text-xs bg-purple-500/10 rounded-lg px-2 py-1.5 border border-purple-500/20">
                    <span className="text-green-400">💾</span>{" "}
                    <span className="text-purple-300">{bundle.serviceIds.saves || "Not set"}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
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
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 transition-all hover:bg-purple-500/20 hover:border-purple-500/50"
                >
                  <span>🎭</span> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm("Ready to spread chaos? Delete this bundle?");
                    if (!confirmed) return;
                    onDeleteBundle(bundle.id);
                    if (editingBundleId === bundle.id) {
                      resetForm();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-all hover:bg-red-500/20 hover:border-red-500/50"
                >
                  <span>💣</span> Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Joker Footer Quote */}
      {bundles.length > 0 && (
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-r from-purple-950/30 via-black to-green-950/30 p-4 text-center">
          <p className="text-sm italic text-green-400/60">
            "Madness, as you know, is like gravity. All it takes is a little push!"
          </p>
          <p className="mt-1 text-xs text-purple-400/50">— The Joker 🃏</p>
        </div>
      )}
    </section>
  );
}
