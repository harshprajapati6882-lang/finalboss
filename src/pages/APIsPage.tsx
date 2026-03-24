import { useState, useEffect } from "react";
import type { ApiPanel } from "../types/order";

interface APIManagerProps {
  apis: ApiPanel[];
  onAddApi: (api: { name: string; url: string; key: string }) => void;
  onToggleStatus: (id: string) => void;
  onFetchServices: (id: string) => void;
  fetchingApiId: string | null;
  onUpdateApi: (id: string, api: { name: string; url: string; key: string }) => Promise<void>;
  onDeleteApi: (id: string) => Promise<void>;
}

export function APIManager({
  apis,
  onAddApi,
  onToggleStatus,
  onFetchServices,
  fetchingApiId,
  onUpdateApi,
  onDeleteApi
}: APIManagerProps) {
  const [newApi, setNewApi] = useState({ name: "", url: "", key: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; url: string; key: string }>({ name: "", url: "", key: "" });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  // Initialize showKeys state
  useEffect(() => {
    const initialShowKeys: Record<string, boolean> = {};
    apis.forEach(api => {
      initialShowKeys[api.id] = false;
    });
    setShowKeys(initialShowKeys);
  }, [apis]);

  const handleAddApi = () => {
    if (!newApi.name || !newApi.url || !newApi.key) return;
    onAddApi(newApi);
    setNewApi({ name: "", url: "", key: "" });
  };

  const startEditing = (api: ApiPanel) => {
    setEditingId(api.id);
    setEditValues({
      name: api.name,
      url: api.url,
      key: api.key
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editValues.name || !editValues.url || !editValues.key) return;

    setIsLoading(prev => ({ ...prev, [id]: true }));
    try {
      await onUpdateApi(id, editValues);
      setEditingId(null);
    } finally {
      setIsLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(prev => ({ ...prev, [id]: true }));
    try {
      await onDeleteApi(id);
    } finally {
      setIsLoading(prev => ({ ...prev, [id]: false }));
      setDeleteConfirmId(null);
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">API Providers</h2>
        <p className="text-sm text-slate-400">Manage your SMM panel API connections</p>
      </div>

      {/* Add New API Form */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
        <h3 className="mb-4 text-lg font-medium text-white">Add New API</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-slate-300">Provider Name</label>
            <input
              id="name"
              type="text"
              value={newApi.name}
              onChange={(e) => setNewApi({...newApi, name: e.target.value})}
              placeholder="e.g. JustAnotherPanel"
              className="w-full rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label htmlFor="url" className="mb-1 block text-sm text-slate-300">API URL</label>
            <input
              id="url"
              type="url"
              value={newApi.url}
              onChange={(e) => setNewApi({...newApi, url: e.target.value})}
              placeholder="https://api.example.com/api/v2"
              className="w-full rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label htmlFor="key" className="mb-1 block text-sm text-slate-300">API Key</label>
            <input
              id="key"
              type="text"
              value={newApi.key}
              onChange={(e) => setNewApi({...newApi, key: e.target.value})}
              placeholder="Your API key"
              className="w-full rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
        <button
          onClick={handleAddApi}
          disabled={!newApi.name || !newApi.url || !newApi.key}
          className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
        >
          Add API Provider
        </button>
      </div>

      {/* API List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Your API Connections</h3>

        {apis.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center">
            <p className="text-sm text-slate-400">No API connections added yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apis.map((api) => (
              <div key={api.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
                {editingId === api.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm text-slate-300">Provider Name</label>
                        <input
                          type="text"
                          value={editValues.name}
                          onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                          className="w-full rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-300">API URL</label>
                        <input
                          type="url"
                          value={editValues.url}
                          onChange={(e) => setEditValues({...editValues, url: e.target.value})}
                          className="w-full rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-300">API Key</label>
                        <input
                          type="text"
                          value={editValues.key}
                          onChange={(e) => setEditValues({...editValues, key: e.target.value})}
                          className="w-full rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(api.id)}
                        disabled={isLoading[api.id]}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {isLoading[api.id] ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-white">{api.name}</h4>
                        <p className="text-sm text-slate-400">{api.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleStatus(api.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            api.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {api.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => startEditing(api)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => confirmDelete(api.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-slate-400">API Key</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-slate-300">
                            {showKeys[api.id] ? api.key : '••••••••••••••••'}
                          </code>
                          <button
                            onClick={() => toggleShowKey(api.id)}
                            className="text-xs text-slate-500 hover:text-slate-300"
                          >
                            {showKeys[api.id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => onFetchServices(api.id)}
                        disabled={fetchingApiId === api.id || !api.isActive}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        {fetchingApiId === api.id ? 'Fetching...' : 'Fetch Services'}
                      </button>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirmId === api.id && (
                      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <p className="mb-3 text-sm text-red-300">
                          Are you sure you want to delete this API connection? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(api.id)}
                            disabled={isLoading[api.id]}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            {isLoading[api.id] ? 'Deleting...' : 'Delete'}
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
