import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApiPanel, Bundle, CreatedOrder } from "../types/order";
import { createSmmOrder } from "../utils/api";

interface ManualOrderPageProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  orders: CreatedOrder[];
  onCreateOrder: (order: CreatedOrder) => void;
  onNavigateToOrders: (notice?: string) => void;
}

interface RunEntry {
  id: string;
  time: Date;
  views: number;
  likes: number;
  shares: number;
  saves: number;
}

function createOrderId() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

function generateId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ManualOrderPage({ 
  apis, 
  bundles, 
  orders, 
  onCreateOrder, 
  onNavigateToOrders 
}: ManualOrderPageProps) {
  // Basic Order Info
  const [orderName, setOrderName] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [selectedApiId, setSelectedApiId] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  
  // Manual Runs Data
  const [runs, setRuns] = useState<RunEntry[]>([
    {
      id: generateId(),
      time: new Date(),
      views: 1000,
      likes: 50,
      shares: 20,
      saves: 30,
    },
  ]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'table' | 'paste' | 'upload'>('table');
  const [pasteData, setPasteData] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bundle Options
  const bundleOptions = useMemo(() => {
    if (!selectedApiId) return bundles;
    return bundles.filter((bundle) => bundle.apiId === selectedApiId);
  }, [bundles, selectedApiId]);

  // Calculate Totals
  const totals = useMemo(() => {
    return runs.reduce(
      (acc, run) => ({
        views: acc.views + run.views,
        likes: acc.likes + run.likes,
        shares: acc.shares + run.shares,
        saves: acc.saves + run.saves,
      }),
      { views: 0, likes: 0, shares: 0, saves: 0 }
    );
  }, [runs]);

  // Calculate Risk
  const risk = useMemo(() => {
    if (runs.length === 0) return "Safe";
    
    const avgViews = totals.views / runs.length;
    const totalHours = runs.length > 1 
      ? (new Date(runs[runs.length - 1].time).getTime() - new Date(runs[0].time).getTime()) / 3600000
      : 0;
    const viewsPerHour = totalHours > 0 ? totals.views / totalHours : totals.views;
    
    if (viewsPerHour > 10000 || avgViews > 5000) return "High";
    if (viewsPerHour > 5000 || avgViews > 2500) return "Medium";
    return "Safe";
  }, [runs, totals]);

  // Estimated Duration
  const estimatedDuration = useMemo(() => {
    if (runs.length <= 1) return 0;
    const first = new Date(runs[0].time).getTime();
    const last = new Date(runs[runs.length - 1].time).getTime();
    return Math.round((last - first) / 3600000);
  }, [runs]);

  // Add new run
  const addRun = useCallback(() => {
    const lastRun = runs[runs.length - 1];
    const newTime = new Date(lastRun ? new Date(lastRun.time).getTime() + 3600000 : Date.now());
    
    setRuns((prev) => [
      ...prev,
      {
        id: generateId(),
        time: newTime,
        views: lastRun?.views || 1000,
        likes: lastRun?.likes || 50,
        shares: lastRun?.shares || 20,
        saves: lastRun?.saves || 30,
      },
    ]);
  }, [runs]);

  // Remove run
  const removeRun = useCallback((id: string) => {
    setRuns((prev) => prev.filter((run) => run.id !== id));
  }, []);

  // Update run
  const updateRun = useCallback((id: string, field: keyof RunEntry, value: any) => {
    setRuns((prev) =>
      prev.map((run) =>
        run.id === id ? { ...run, [field]: value } : run
      )
    );
  }, []);

  // Duplicate run
  const duplicateRun = useCallback((id: string) => {
    const index = runs.findIndex((r) => r.id === id);
    if (index === -1) return;
    
    const runToDuplicate = runs[index];
    const newRun: RunEntry = {
      ...runToDuplicate,
      id: generateId(),
      time: new Date(new Date(runToDuplicate.time).getTime() + 3600000),
    };
    
    const newRuns = [...runs];
    newRuns.splice(index + 1, 0, newRun);
    setRuns(newRuns);
  }, [runs]);

  // Clear all runs
  const clearAllRuns = useCallback(() => {
    if (window.confirm("Clear all runs? This cannot be undone.")) {
      setRuns([{
        id: generateId(),
        time: new Date(),
        views: 1000,
        likes: 50,
        shares: 20,
        saves: 30,
      }]);
    }
  }, []);

  // Parse pasted data
  const parsePastedData = useCallback(() => {
    try {
      const lines = pasteData.trim().split('\n');
      if (lines.length === 0) {
        setCreateError("No data to parse");
        return;
      }

      const parsedRuns: RunEntry[] = [];
      
      // Check if first line is header
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('time') || firstLine.includes('views') || firstLine.includes('date');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        // Split by tab, comma, or multiple spaces
        const parts = line.split(/[\t,]+|\s{2,}/).map(p => p.trim()).filter(Boolean);
        
        if (parts.length < 2) continue;

        // Try to parse time (first column)
        let time: Date;
        const timeStr = parts[0];
        
        // Try different date formats
        if (timeStr.match(/^\d{1,2}:\d{2}/)) {
          // Time only (HH:mm) - use today's date
          const [hours, minutes] = timeStr.split(':').map(Number);
          time = new Date();
          time.setHours(hours, minutes, 0, 0);
          // If this time is before the last run, add a day
          if (parsedRuns.length > 0) {
            const lastTime = parsedRuns[parsedRuns.length - 1].time;
            if (time <= lastTime) {
              time.setDate(time.getDate() + 1);
            }
          }
        } else if (timeStr.match(/^\d+$/)) {
          // Unix timestamp or minutes offset
          const num = parseInt(timeStr);
          if (num > 1000000000) {
            // Unix timestamp
            time = new Date(num * 1000);
          } else {
            // Minutes from start
            const baseTime = parsedRuns.length > 0 
              ? new Date(parsedRuns[0].time) 
              : new Date();
            time = new Date(baseTime.getTime() + num * 60000);
          }
        } else {
          // Try standard date parsing
          time = new Date(timeStr);
          if (isNaN(time.getTime())) {
            // Default: add i hours from now
            time = new Date(Date.now() + i * 3600000);
          }
        }

        // Parse values
        const views = parseInt(parts[1]) || 0;
        const likes = parseInt(parts[2]) || 0;
        const shares = parseInt(parts[3]) || 0;
        const saves = parseInt(parts[4]) || 0;

        parsedRuns.push({
          id: generateId(),
          time,
          views,
          likes,
          shares,
          saves,
        });
      }

      if (parsedRuns.length === 0) {
        setCreateError("Could not parse any valid runs from data");
        return;
      }

      // Sort by time
      parsedRuns.sort((a, b) => a.time.getTime() - b.time.getTime());
      
      setRuns(parsedRuns);
      setCreateSuccess(`✅ Parsed ${parsedRuns.length} runs successfully!`);
      setCreateError("");
      setActiveTab('table');
      
      setTimeout(() => setCreateSuccess(""), 3000);
    } catch (error) {
      setCreateError("Failed to parse data. Check format and try again.");
    }
  }, [pasteData]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // For CSV files
        if (file.name.endsWith('.csv')) {
          setPasteData(content);
          parsePastedData();
        } 
        // For Excel files (.xlsx)
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // Note: For full Excel support, you'd need a library like xlsx
          // For now, show message
          setCreateError("Excel files require xlsx library. Please export as CSV or copy-paste data.");
        }
        else {
          // Try as plain text
          setPasteData(content);
          setActiveTab('paste');
        }
      } catch (error) {
        setCreateError("Failed to read file");
      }
    };

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      setCreateError("Supported formats: CSV, TXT. For Excel, copy-paste data.");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [parsePastedData]);

  // Generate template
  const generateTemplate = useCallback((count: number, intervalMinutes: number) => {
    const newRuns: RunEntry[] = [];
    const startTime = new Date();
    
    for (let i = 0; i < count; i++) {
      const time = new Date(startTime.getTime() + i * intervalMinutes * 60000);
      newRuns.push({
        id: generateId(),
        time,
        views: 1000,
        likes: 50,
        shares: 20,
        saves: 30,
      });
    }
    
    setRuns(newRuns);
  }, []);

  // URL validation
  function isValidUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Deploy function
  const handleDeploy = useCallback(async () => {
    if (isCreatingOrder) return;
    
    setCreateError("");
    setCreateSuccess("");
    
    // Validations
    if (!postUrl.trim()) {
      setCreateError("Enter a post URL");
      return;
    }
    if (!isValidUrl(postUrl.trim())) {
      setCreateError("Invalid URL format");
      return;
    }
    if (!selectedApiId) {
      setCreateError("Select an API");
      return;
    }
    if (!selectedBundleId) {
      setCreateError("Select a bundle");
      return;
    }
    if (runs.length === 0) {
      setCreateError("Add at least one run");
      return;
    }
    if (totals.views < 100) {
      setCreateError("Total views must be at least 100");
      return;
    }

    const selectedApi = apis.find((api) => api.id === selectedApiId);
    const selectedBundle = bundles.find((bundle) => bundle.id === selectedBundleId);
    
    if (!selectedApi || !selectedBundle) {
      setCreateError("Invalid API or Bundle selection");
      return;
    }

    const viewsServiceId = selectedBundle.serviceIds.views.trim();
    const likesServiceId = selectedBundle.serviceIds.likes.trim();
    const sharesServiceId = selectedBundle.serviceIds.shares.trim();
    const savesServiceId = selectedBundle.serviceIds.saves.trim();

    if (!viewsServiceId) {
      setCreateError("Bundle has no Views service");
      return;
    }

    // Prepare runs data
    const viewRuns = runs.map((run) => ({
      time: new Date(run.time).toISOString(),
      quantity: Math.floor(run.views),
    }));
    
    const likesRuns = runs.map((run) => ({
      time: new Date(run.time).toISOString(),
      quantity: Math.floor(run.likes),
    }));
    
    const sharesRuns = runs.map((run) => ({
      time: new Date(run.time).toISOString(),
      quantity: Math.floor(run.shares),
    }));
    
    const savesRuns = runs.map((run) => ({
      time: new Date(run.time).toISOString(),
      quantity: Math.floor(run.saves),
    }));

    const servicesPayload: {
      views: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
      likes?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
      shares?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
      saves?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
    } = {
      views: { serviceId: viewsServiceId, runs: viewRuns },
    };

    if (totals.likes > 0 && likesServiceId) {
      servicesPayload.likes = { serviceId: likesServiceId, runs: likesRuns };
    }
    if (totals.shares > 0 && sharesServiceId) {
      servicesPayload.shares = { serviceId: sharesServiceId, runs: sharesRuns };
    }
    if (totals.saves > 0 && savesServiceId) {
      servicesPayload.saves = { serviceId: savesServiceId, runs: savesRuns };
    }

    setIsCreatingOrder(true);
    setCreateSuccess("Deploying mission...");

    try {
      const result = await createSmmOrder({
        name: orderName.trim() || undefined,
        apiUrl: selectedApi.url,
        apiKey: selectedApi.key,
        link: postUrl.trim(),
        services: servicesPayload,
      });

      const order: CreatedOrder = {
        id: createOrderId(),
        name: orderName.trim() || `Manual Mission #${createOrderId()}`,
        schedulerOrderId: result.schedulerOrderId,
        smmOrderId: result.orderId ?? "Scheduled",
        link: postUrl.trim(),
        totalViews: totals.views,
        startDelayHours: 0,
        patternType: "manual",
        patternName: "Manual Schedule",
        runs: runs.map((run) => ({
          at: new Date(run.time),
          views: run.views,
          likes: run.likes,
          shares: run.shares,
          saves: run.saves,
        })),
        engagement: {
          likes: totals.likes,
          shares: totals.shares,
          saves: totals.saves,
        },
        serviceId: viewsServiceId,
        selectedAPI: selectedApi.name,
        selectedBundle: selectedBundle.name,
        status: result.status === "completed" ? "completed" : "running",
        completedRuns: typeof result.completedRuns === "number" ? result.completedRuns : 0,
        runStatuses: runs.map(() => "pending"),
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      onCreateOrder(order);
      setCreateSuccess("✅ Mission Deployed Successfully!");
      onNavigateToOrders("Manual Mission Deployed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create mission";
      setCreateError(message);
      setCreateSuccess("");
    } finally {
      setIsCreatingOrder(false);
    }
  }, [
    isCreatingOrder,
    postUrl,
    selectedApiId,
    selectedBundleId,
    runs,
    totals,
    apis,
    bundles,
    orderName,
    onCreateOrder,
    onNavigateToOrders,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Ctrl + Enter = Deploy
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleDeploy();
        return;
      }
      
      // Don't trigger shortcuts when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      // Ctrl + N = Add new run
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addRun();
        return;
      }
      
      // ? = Show shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }
      
      // Escape = Close modal
      if (e.key === 'Escape') {
        setShowShortcutsHelp(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeploy, addRun]);

  // Graph data
  const graphData = useMemo(() => {
    const sortedRuns = [...runs].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    let cumulative = { views: 0, likes: 0, shares: 0, saves: 0 };
    
    return sortedRuns.map((run) => {
      cumulative.views += run.views;
      cumulative.likes += run.likes;
      cumulative.shares += run.shares;
      cumulative.saves += run.saves;
      
      return {
        time: new Date(run.time),
        views: run.views,
        likes: run.likes,
        shares: run.shares,
        saves: run.saves,
        cumulativeViews: cumulative.views,
        cumulativeLikes: cumulative.likes,
        cumulativeShares: cumulative.shares,
        cumulativeSaves: cumulative.saves,
      };
    });
  }, [runs]);

  // Price calculation
  const price = useMemo(() => {
    const selectedBundle = bundles.find(b => b.id === selectedBundleId);
    const selectedApi = apis.find(a => a.id === selectedApiId);
    
    if (!selectedBundle || !selectedApi) return { views: 0, likes: 0, shares: 0, saves: 0, total: 0 };
    
    const viewsService = selectedApi.services.find(s => s.id === selectedBundle.serviceIds.views);
    const likesService = selectedApi.services.find(s => s.id === selectedBundle.serviceIds.likes);
    const sharesService = selectedApi.services.find(s => s.id === selectedBundle.serviceIds.shares);
    const savesService = selectedApi.services.find(s => s.id === selectedBundle.serviceIds.saves);
    
    const viewsRate = parseFloat(viewsService?.rate || "0");
    const likesRate = parseFloat(likesService?.rate || "0");
    const sharesRate = parseFloat(sharesService?.rate || "0");
    const savesRate = parseFloat(savesService?.rate || "0");
    
    const viewsPrice = (totals.views / 1000) * viewsRate;
    const likesPrice = (totals.likes / 1000) * likesRate;
    const sharesPrice = (totals.shares / 1000) * sharesRate;
    const savesPrice = (totals.saves / 1000) * savesRate;
    
    return {
      views: viewsPrice,
      likes: likesPrice,
      shares: sharesPrice,
      saves: savesPrice,
      total: viewsPrice + likesPrice + sharesPrice + savesPrice,
    };
  }, [bundles, apis, selectedBundleId, selectedApiId, totals]);

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-3 py-3">
      
      {/* Shortcuts Help Modal */}
      <AnimatePresence>
        {showShortcutsHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowShortcutsHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mx-4 max-w-sm rounded-xl border border-yellow-500/30 bg-gray-900 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-yellow-400">⌨️ Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowShortcutsHelp(false)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-md bg-black/50 px-2 py-1.5">
                  <span className="text-gray-300">Deploy Mission</span>
                  <kbd className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-300">Ctrl + Enter</kbd>
                </div>
                <div className="flex items-center justify-between rounded-md bg-black/50 px-2 py-1.5">
                  <span className="text-gray-300">Add New Run</span>
                  <kbd className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-300">Ctrl + N</kbd>
                </div>
                <div className="flex items-center justify-between rounded-md bg-black/50 px-2 py-1.5">
                  <span className="text-gray-300">Show/Hide Shortcuts</span>
                  <kbd className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">?</kbd>
                </div>
                <div className="flex items-center justify-between rounded-md bg-black/50 px-2 py-1.5">
                  <span className="text-gray-300">Close Modal</span>
                  <kbd className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">Esc</kbd>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h2 className="text-lg font-bold tracking-tight text-yellow-400">Manual Mission</h2>
            <span className="text-[10px] text-gray-500 ml-2">Full control over every run</span>
          </div>
          
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="flex items-center gap-1 rounded-md border border-gray-700 bg-black/50 px-2 py-1 text-[10px] text-gray-400 transition hover:border-yellow-500/30 hover:text-yellow-300"
          >
            <span>⌨️</span>
            <kbd className="rounded border border-gray-600 bg-gray-800 px-1 text-[9px]">?</kbd>
          </button>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid gap-3 xl:grid-cols-2">
        
        {/* LEFT COLUMN - Order Info & Data Input */}
        <div className="space-y-2">
          
          {/* Order Details */}
          <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-3">
            <h3 className="text-xs font-semibold text-yellow-400 mb-2">📋 Order Details</h3>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Order Name</label>
                <input
                  type="text"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder="Mission name..."
                  className="w-full rounded-lg border border-yellow-500/20 bg-black px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Post URL</label>
                <input
                  type="text"
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://instagram.com/reel/..."
                  className="w-full rounded-lg border border-yellow-500/20 bg-black px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">API Panel</label>
                <select
                  value={selectedApiId}
                  onChange={(e) => {
                    setSelectedApiId(e.target.value);
                    setSelectedBundleId("");
                  }}
                  className="w-full rounded-lg border border-yellow-500/20 bg-black px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
                >
                  <option value="">Select API</option>
                  {apis.map((api) => (
                    <option key={api.id} value={api.id}>{api.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Bundle</label>
                <select
                  value={selectedBundleId}
                  onChange={(e) => setSelectedBundleId(e.target.value)}
                  className="w-full rounded-lg border border-yellow-500/20 bg-black px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
                >
                  <option value="">Select Bundle</option>
                  {bundleOptions.map((bundle) => (
                    <option key={bundle.id} value={bundle.id}>{bundle.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Input Tabs */}
          <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-3">
            
            {/* Tab Headers */}
            <div className="flex items-center gap-1 mb-3">
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                  activeTab === 'table'
                    ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-300'
                    : 'border border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                📊 Table Editor
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                  activeTab === 'paste'
                    ? 'bg-blue-500/20 border border-blue-500 text-blue-300'
                    : 'border border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                📋 Paste Data
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                  activeTab === 'upload'
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                    : 'border border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                📁 Upload File
              </button>
            </div>

            {/* Table Editor Tab */}
            {activeTab === 'table' && (
              <div>
                {/* Quick Templates */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] text-gray-500">Quick:</span>
                  <button
                    onClick={() => generateTemplate(6, 60)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-0.5 text-[10px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30 transition"
                  >
                    6 runs/1h
                  </button>
                  <button
                    onClick={() => generateTemplate(12, 60)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-0.5 text-[10px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30 transition"
                  >
                    12 runs/1h
                  </button>
                  <button
                    onClick={() => generateTemplate(24, 60)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-0.5 text-[10px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30 transition"
                  >
                    24 runs/1h
                  </button>
                  <button
                    onClick={() => generateTemplate(12, 120)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-0.5 text-[10px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30 transition"
                  >
                    12 runs/2h
                  </button>
                </div>

                {/* Table */}
                <div className="max-h-[300px] overflow-auto rounded-lg border border-gray-800">
                  <table className="w-full text-[10px]">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">#</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">Time</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">👁️ Views</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">❤️ Likes</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">🔄 Shares</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">💾 Saves</th>
                        <th className="px-2 py-1.5 text-center text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run, index) => (
                        <motion.tr
                          key={run.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-t border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="px-2 py-1 text-gray-500">{index + 1}</td>
                          <td className="px-2 py-1">
                            <input
                              type="datetime-local"
                              value={new Date(run.time).toISOString().slice(0, 16)}
                              onChange={(e) => updateRun(run.id, 'time', new Date(e.target.value))}
                              className="w-full rounded border border-gray-700 bg-black px-1 py-0.5 text-[10px] text-white focus:border-yellow-500/50 focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={run.views}
                              onChange={(e) => updateRun(run.id, 'views', parseInt(e.target.value) || 0)}
                              className="w-16 rounded border border-gray-700 bg-black px-1 py-0.5 text-[10px] text-white focus:border-yellow-500/50 focus:outline-none"
                              min={0}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={run.likes}
                              onChange={(e) => updateRun(run.id, 'likes', parseInt(e.target.value) || 0)}
                              className="w-14 rounded border border-gray-700 bg-black px-1 py-0.5 text-[10px] text-white focus:border-pink-500/50 focus:outline-none"
                              min={0}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={run.shares}
                              onChange={(e) => updateRun(run.id, 'shares', parseInt(e.target.value) || 0)}
                              className="w-14 rounded border border-gray-700 bg-black px-1 py-0.5 text-[10px] text-white focus:border-blue-500/50 focus:outline-none"
                              min={0}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={run.saves}
                              onChange={(e) => updateRun(run.id, 'saves', parseInt(e.target.value) || 0)}
                              className="w-14 rounded border border-gray-700 bg-black px-1 py-0.5 text-[10px] text-white focus:border-purple-500/50 focus:outline-none"
                              min={0}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => duplicateRun(run.id)}
                                className="rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-white"
                                title="Duplicate"
                              >
                                📋
                              </button>
                              <button
                                onClick={() => removeRun(run.id)}
                                disabled={runs.length <= 1}
                                className="rounded p-0.5 text-gray-500 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-800/50 border-t border-gray-700">
                      <tr>
                        <td className="px-2 py-1.5 font-bold text-yellow-400" colSpan={2}>TOTAL</td>
                        <td className="px-2 py-1.5 font-bold text-yellow-300">{totals.views.toLocaleString()}</td>
                        <td className="px-2 py-1.5 font-bold text-pink-300">{totals.likes.toLocaleString()}</td>
                        <td className="px-2 py-1.5 font-bold text-blue-300">{totals.shares.toLocaleString()}</td>
                        <td className="px-2 py-1.5 font-bold text-purple-300">{totals.saves.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Table Actions */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addRun}
                      className="flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-300 hover:bg-yellow-500/20 transition"
                    >
                      ➕ Add Run
                    </button>
                    <button
                      onClick={clearAllRuns}
                      className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-300 hover:bg-red-500/20 transition"
                    >
                      🗑️ Clear All
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500">{runs.length} runs</span>
                </div>
              </div>
            )}

            {/* Paste Data Tab */}
            {activeTab === 'paste' && (
              <div>
                <div className="mb-2 rounded-md border border-blue-500/20 bg-blue-500/10 p-2">
                  <p className="text-[10px] text-blue-300 mb-1">📝 Paste data from Excel/Sheets</p>
                  <p className="text-[9px] text-blue-400/70">Format: Time, Views, Likes, Shares, Saves (tab or comma separated)</p>
                </div>
                
                <textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder={`Time\tViews\tLikes\tShares\tSaves
10:00\t1000\t50\t20\t30
11:00\t1500\t75\t30\t45
12:00\t2000\t100\t40\t60`}
                  rows={8}
                  className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none resize-none font-mono"
                />
                
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={parsePastedData}
                    disabled={!pasteData.trim()}
                    className="flex items-center gap-1 rounded-md border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-[10px] font-medium text-blue-300 hover:bg-blue-500/30 transition disabled:opacity-50"
                  >
                    🔄 Parse Data
                  </button>
                  <button
                    onClick={() => setPasteData("")}
                    className="text-[10px] text-gray-500 hover:text-white transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Upload File Tab */}
            {activeTab === 'upload' && (
              <div>
                <div className="mb-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2">
                  <p className="text-[10px] text-emerald-300 mb-1">📁 Upload CSV file</p>
                  <p className="text-[9px] text-emerald-400/70">Columns: Time, Views, Likes, Shares, Saves</p>
                </div>
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-black/50 p-6 cursor-pointer hover:border-emerald-500/50 transition"
                >
                  <span className="text-3xl mb-2">📄</span>
                  <p className="text-xs text-gray-400 mb-1">Click to upload or drag and drop</p>
                  <p className="text-[10px] text-gray-600">CSV, TXT files supported</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <div className="mt-3 rounded-md border border-gray-700 bg-black/50 p-2">
                  <p className="text-[10px] text-gray-400 mb-1">📥 Sample CSV format:</p>
                  <pre className="text-[9px] text-gray-500 font-mono">
{`Time,Views,Likes,Shares,Saves
2024-01-15 10:00,1000,50,20,30
2024-01-15 11:00,1500,75,30,45
2024-01-15 12:00,2000,100,40,60`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Preview & Stats */}
        <div className="space-y-2">
          
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-2 text-center">
              <p className="text-lg font-bold text-yellow-400">{runs.length}</p>
              <p className="text-[9px] text-gray-500">Runs</p>
            </div>
            <div className="rounded-lg border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-2 text-center">
              <p className="text-lg font-bold text-yellow-400">{(totals.views / 1000).toFixed(0)}k</p>
              <p className="text-[9px] text-gray-500">Views</p>
            </div>
            <div className="rounded-lg border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-2 text-center">
              <p className="text-lg font-bold text-yellow-400">{estimatedDuration}h</p>
              <p className="text-[9px] text-gray-500">Duration</p>
            </div>
            <div className={`rounded-lg border p-2 text-center ${
              risk === 'Safe' ? 'border-emerald-500/20 bg-emerald-500/5' :
              risk === 'Medium' ? 'border-yellow-500/20 bg-yellow-500/5' :
              'border-red-500/20 bg-red-500/5'
            }`}>
              <p className={`text-lg font-bold ${
                risk === 'Safe' ? 'text-emerald-400' :
                risk === 'Medium' ? 'text-yellow-400' :
                'text-red-400'
              }`}>{risk}</p>
              <p className="text-[9px] text-gray-500">Risk</p>
            </div>
          </div>

          {/* Graph Preview */}
          <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-3">
            <h3 className="text-xs font-semibold text-yellow-400 mb-2">📈 Schedule Preview</h3>
            
            {runs.length > 0 ? (
              <div className="h-48 relative">
                {/* Simple Bar Chart */}
                <div className="flex items-end justify-between h-40 gap-0.5 px-1">
                  {graphData.map((point, index) => {
                    const maxViews = Math.max(...graphData.map(p => p.views));
                    const heightPercent = (point.views / maxViews) * 100;
                    
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center justify-end group"
                      >
                        <div className="relative w-full">
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                            <div className="rounded-md bg-gray-800 border border-gray-700 px-2 py-1 text-[9px] whitespace-nowrap">
                              <p className="text-white font-medium">{point.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              <p className="text-yellow-300">👁️ {point.views}</p>
                              <p className="text-pink-300">❤️ {point.likes}</p>
                              <p className="text-blue-300">🔄 {point.shares}</p>
                              <p className="text-purple-300">💾 {point.saves}</p>
                            </div>
                          </div>
                          
                          {/* Bar */}
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-sm min-h-[4px] cursor-pointer hover:from-yellow-500 hover:to-yellow-300 transition-colors"
                            style={{ height: `${Math.max(heightPercent, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* X-axis labels */}
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-[8px] text-gray-500">
                    {graphData[0]?.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[8px] text-gray-500">
                    {graphData[graphData.length - 1]?.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-500 text-xs">
                No runs added yet
              </div>
            )}
          </div>

          {/* Cumulative Graph */}
          <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-3">
            <h3 className="text-xs font-semibold text-yellow-400 mb-2">📊 Cumulative Growth</h3>
            
            {runs.length > 0 ? (
              <div className="h-32 relative">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.2" />
                  
                  {/* Cumulative Views Line */}
                  <polyline
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="0.8"
                    points={graphData.map((point, index) => {
                      const x = (index / (graphData.length - 1 || 1)) * 100;
                      const y = 50 - (point.cumulativeViews / (totals.views || 1)) * 45;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  
                  {/* Area fill */}
                  <polygon
                    fill="url(#gradient)"
                    opacity="0.3"
                    points={`0,50 ${graphData.map((point, index) => {
                      const x = (index / (graphData.length - 1 || 1)) * 100;
                      const y = 50 - (point.cumulativeViews / (totals.views || 1)) * 45;
                      return `${x},${y}`;
                    }).join(' ')} 100,50`}
                  />
                  
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#facc15" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Labels */}
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-gray-500">0</span>
                  <span className="text-[8px] text-yellow-400 font-medium">{totals.views.toLocaleString()} views</span>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
                No data to display
              </div>
            )}
          </div>

          {/* Price Calculator */}
          {selectedBundleId && runs.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-black p-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-yellow-400">💰 Price</span>
                
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  <span className="text-[10px] text-gray-400">👁️{(totals.views/1000).toFixed(0)}k=₹{price.views.toFixed(0)}</span>
                  {totals.likes > 0 && (
                    <span className="text-[10px] text-gray-400">❤️{(totals.likes/1000).toFixed(1)}k=₹{price.likes.toFixed(0)}</span>
                  )}
                  {totals.shares > 0 && (
                    <span className="text-[10px] text-gray-400">🔄{(totals.shares/1000).toFixed(1)}k=₹{price.shares.toFixed(0)}</span>
                  )}
                  {totals.saves > 0 && (
                    <span className="text-[10px] text-gray-400">💾{(totals.saves/1000).toFixed(1)}k=₹{price.saves.toFixed(0)}</span>
                  )}
                </div>
                
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1">
                  <span className="text-sm font-bold text-yellow-400">₹{price.total.toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deploy Button */}
      <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {createError && <span className="text-[10px] text-red-400">❌ {createError}</span>}
          {createSuccess && <span className="text-[10px] text-emerald-400">{createSuccess}</span>}
          {!createError && !createSuccess && (
            <span className="text-[10px] text-gray-500">
              Ready to deploy {runs.length} runs • {totals.views.toLocaleString()} total views
            </span>
          )}
        </div>
        
        <motion.button
          type="button"
          disabled={isCreatingOrder}
          onClick={handleDeploy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-4 py-1.5 text-xs font-semibold text-yellow-300 transition ${
            isCreatingOrder ? 'cursor-not-allowed opacity-60' : 'hover:bg-yellow-500/30'
          }`}
        >
          {isCreatingOrder && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
          <span className="relative">
            {isCreatingOrder ? "🚀 Deploying..." : "🎯 Deploy Manual Mission"}
          </span>
          <kbd className="relative hidden rounded border border-yellow-500/30 bg-yellow-500/10 px-1 py-0.5 text-[8px] sm:inline">
            Ctrl+↵
          </kbd>
        </motion.button>
      </div>
    </div>
  );
}
