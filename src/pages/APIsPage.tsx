import { useState, useEffect } from "react";
import type { ApiPanel } from "../types/order";

interface APIManagerProps {
  apis: ApiPanel[];
  onAddApi: (api: { name: string; url: string; key: string }) => void;
  onToggleStatus: (id: string) => void;
  onFetchServices: (id: string) => void;
  fetchingApiId: string | null;
  // New props for edit/delete functionality
  onUpdateApi?: (id: string, api: { name: string; url: string; key: string }) => void;
  onDeleteApi?: (id: string) => void;
}

export function APIManager({
  apis,
  onAddApi,
  onToggleStatus,
  onFetchServices,
  fetchingApiId,
  onUpdateApi,
  onDeleteApi,
}: APIManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [editFormData, setEditFormData] = useState({
    name: "",
    url: "",
    key: "",
  });

  // Initialize form data when starting edit
  useEffect(() => {
    if (editingId) {
      const apiToEdit = apis.find(api => api.id === editingId);
      if (apiToEdit) {
        setEditFormData({
          name: apiToEdit.name || "",
          url: apiToEdit.url || "",
          key: apiToEdit.key || "",
        });
      }
    }
  }, [editingId, apis]);

  // Start editing
  const handleEdit = (api: ApiPanel) => {
    setEditingId(api.id);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ name: "", url: "", key: "" });
  };

  // Save edited API
  const handleSaveEdit = () => {
    if (!editingId || !onUpdateApi) return;
    
    // Basic validation
    if (!editFormData.name.trim() || !editFormData.url.trim() || !editFormData.key.trim()) {
      alert("All fields are required!");
      return;
    }

    onUpdateApi(editingId, {
      name: editFormData.name.trim(),
      url: editFormData.url.trim(),
      key: editFormData.key.trim(),
    });
    
    setEditingId(null);
  };

  // Delete API
  const handleDelete = (id: string) => {
    if (onDeleteApi && confirm("Are you sure you want to delete this API? This action cannot be undone.")) {
      onDeleteApi(id);
    }
    setShowDeleteConfirm(null);
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Test API connection
  const handleTestConnection = async (api: ApiPanel) => {
    try {
      const response = await fetch(`${api.url}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api.key}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        alert("✅ Connection successful! API is reachable.");
      } else {
        alert("❌ Connection failed. Please check your URL and API key.");
      }
    } catch (error) {
      alert("❌ Network error. Unable to reach the API endpoint.");
      console.error("API connection test error:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">API Integrations</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage your SMM panel API connections. Add, edit, or remove API integrations.
        </p>
      </div>

      {/* Add API Form */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h3 className="mb-4 text-lg font-medium text-white">Add New API</h3>
        <AddApiForm onAddApi={onAddApi} />
      </div>

      {/* APIs List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Your APIs ({apis.length})</h3>
        
        {apis.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/20 py-12">
            <span className="text-4xl">🔌</span>
            <p className="mt-4 text-sm font-medium text-slate-300">No APIs added yet</p>
            <p className="mt-1 text-xs text-slate-500">Add your first API integration above</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apis.map((api) => (
              <div
                key={api.id}
                className={`relative rounded-xl border ${
                  api.enabled 
                    ? 'border-slate-800 bg-slate-900/30' 
                    : 'border-slate-700 bg-slate-900/20 opacity-70'
                } p-5 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5`}
              >
                {/* Status Badge */}
                <div className="absolute right-4 top-4">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      api.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                    title={api.enabled ? 'Active' : 'Disabled'}
                  />
                </div>

                {/* Edit/Delete Controls */}
                <div className="absolute right-4 top-8 flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(api)}
                    disabled={editingId !== null}
                    className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-cyan-400 disabled:opacity-50"
                    title="Edit API"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(api.id)}
                    disabled={editingId !== null}
                    className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-red-400 disabled:opacity-50"
                    title="Delete API"
                  >
                    🗑️
                  </button>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === api.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
                    <div 
                      className="rounded-lg bg-slate-800 p-4 text-center space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-sm text-white">Are you sure?</p>
                      <p className="text-xs text-slate-400">This will permanently delete "{api.name}"</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(api.id)}
                          className="px-3 py-1 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Editing Form */}
                {editingId === api.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                        placeholder="API Name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">URL</label>
                      <input
                        type="url"
                        value={editFormData.url}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                        placeholder="https://api.example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">API Key</label>
                      <div className="relative">
                        <input
                          type={showApiKey[api.id] ? "text" : "password"}
                          value={editFormData.key}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, key: e.target.value }))}
                          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 pr-10"
                          placeholder="Your API key"
                        />
                        <button
                          type="button"
                          onClick={() => toggleApiKeyVisibility(api.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showApiKey[api.id] ? "👁️" : "🙈"}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="flex-1 rounded bg-cyan-500/20 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/30 transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 rounded border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-white">{api.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">ID: {api.id.slice(0, 8)}...</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-400 mb-1">URL</p>
                      <p className="text-xs text-slate-300 break-all">{api.url}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 mb-1">API Key</p>
                        <button
                          type="button"
                          onClick={() => toggleApiKeyVisibility(api.id)}
                          className="text-xs text-slate-500 hover:text-slate-300"
                        >
                          {showApiKey[api.id] ? "Hide" : "Show"}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey[api.id] ? "text" : "password"}
                          value={api.key}
                          readOnly
                          className="w-full bg-transparent text-xs text-slate-300 border-none outline-none cursor-default pr-8"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(api.id)}
                        className={`flex-1 rounded px-3 py-2 text-xs font-medium transition ${
                          api.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {api.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => onFetchServices(api.id)}
                        disabled={fetchingApiId === api.id}
                        className="rounded px-3 py-2 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 disabled:opacity-50 transition"
                      >
                        {fetchingApiId === api.id ? '🔄' : 'Sync'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleTestConnection(api)}
                        className="rounded px-3 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition"
                      >
                        Test
                      </button>
                    </div>
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

// Add API Form Component
function AddApiForm({ onAddApi }: { onAddApi: (api: { name: string; url: string; key: string }) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    key: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.url.trim() || !formData.key.trim()) {
      alert("Please fill in all fields!");
      return;
    }

    setIsSubmitting(true);
    onAddApi({
      name: formData.name.trim(),
      url: formData.url.trim(),
      key: formData.key.trim(),
    });
    
    // Reset form
    setFormData({ name: "", url: "", key: "" });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="api-name" className="block text-sm font-medium text-slate-300 mb-1">
          API Name
        </label>
        <input
          id="api-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          placeholder="Enter a name for this API"
          required
        />
      </div>
      
      <div>
        <label htmlFor="api-url" className="block text-sm font-medium text-slate-300 mb-1">
          API URL
        </label>
        <input
          id="api-url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          placeholder="https://api.example.com"
          required
        />
      </div>
      
      <div>
        <label htmlFor="api-key" className="block text-sm font-medium text-slate-300 mb-1">
          API Key
        </label>
        <input
          id="api-key"
          type="text"
          value={formData.key}
          onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          placeholder="Enter your API key"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isSubmitting ? 'Adding...' : 'Add API'}
      </button>
    </form>
  );
}
