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
  intervalMinutes: number; // Minutes from start (0, 60, 120, etc.)
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
  const [bulkLinks, setBulkLinks] = useState("");
  const [selectedApiId, setSelectedApiId] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [startDelayMinutes, setStartDelayMinutes] = useState(0);
  
  // Manual Runs Data
  const [runs, setRuns] = useState<RunEntry[]>([
    {
      id: generateId(),
      intervalMinutes: 0,
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
  const [deploymentProgress, setDeploymentProgress] = useState({ current: 0, total: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bundle Options
  const bundleOptions = useMemo(() => {
    if (!selectedApiId) return bundles;
    return bundles.filter((bundle) => bundle.apiId === selectedApiId);
  }, [bundles, selectedApiId]);

  // Calculate actual times based on intervals
  const calculatedRuns = useMemo(() => {
    const startTime = Date.now() + startDelayMinutes * 60000;
    
    return runs.map((run) => ({
      ...run,
      actualTime: new Date(startTime + run.intervalMinutes * 60000),
    }));
  }, [runs, startDelayMinutes]);

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
    const totalMinutes = runs.length > 1 
      ? runs[runs.length - 1].intervalMinutes - runs[0].intervalMinutes
      : 0;
    const totalHours = totalMinutes / 60;
    const viewsPerHour = totalHours > 0 ? totals.views / totalHours : totals.views;
    
    if (viewsPerHour > 10000 || avgViews > 5000) return "High";
    if (viewsPerHour > 5000 || avgViews > 2500) return "Medium";
    return "Safe";
  }, [runs, totals]);

  // Estimated Duration
  const estimatedDuration = useMemo(() => {
    if (runs.length <= 1) return 0;
    const totalMinutes = runs[runs.length - 1].intervalMinutes - runs[0].intervalMinutes;
    return Math.round(totalMinutes / 60);
  }, [runs]);

  // Parse bulk links
  const parsedBulkLinks = useMemo(() => {
    const lines = bulkLinks
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    
    const validLinks = lines.filter((link) => {
      try {
        const parsed = new URL(link);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    });
    const invalidLinks = lines.filter((link) => {
      try {
        const parsed = new URL(link);
        return !(parsed.protocol === "http:" || parsed.protocol === "https:");
      } catch {
        return true;
      }
    });
    
    return {
      total: lines.length,
      valid: validLinks.length,
      invalid: invalidLinks.length,
      links: validLinks,
    };
  }, [bulkLinks]);

  // Add new run
  const addRun = useCallback(() => {
    const lastRun = runs[runs.length - 1];
    const newInterval = lastRun ? lastRun.intervalMinutes + 60 : 0; // Default +60 min
    
    setRuns((prev) => [
      ...prev,
      {
        id: generateId(),
        intervalMinutes: newInterval,
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
      intervalMinutes: runToDuplicate.intervalMinutes + 60,
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
        intervalMinutes: 0,
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
      const hasHeader = firstLine.includes('interval') || firstLine.includes('views') || firstLine.includes('minute');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        // Split by tab, comma, or multiple spaces
        const parts = line.split(/[\t,]+|\s{2,}/).map(p => p.trim()).filter(Boolean);
        
        if (parts.length < 2) continue;

        // Parse interval (first column) - in minutes
        const intervalMinutes = parseInt(parts[0]) || (i * 60); // Default: i * 60 minutes

        // Parse values
        const views = parseInt(parts[1]) || 0;
        const likes = parseInt(parts[2]) || 0;
        const shares = parseInt(parts[3]) || 0;
        const saves = parseInt(parts[4]) || 0;

        parsedRuns.push({
          id: generateId(),
          intervalMinutes,
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

      // Sort by interval
      parsedRuns.sort((a, b) => a.intervalMinutes - b.intervalMinutes);
      
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
        
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          setPasteData(content);
          setActiveTab('paste');
        } else {
          setCreateError("Supported formats: CSV, TXT");
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Generate template
  const generateTemplate = useCallback((count: number, intervalMinutes: number) => {
    const newRuns: RunEntry[] = [];
    
    for (let i = 0; i < count; i++) {
      newRuns.push({
        id: generateId(),
        intervalMinutes: i * intervalMinutes,
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
    
    // Determine targets
    const bulkTargets = parsedBulkLinks.links;
    const singleTarget = postUrl.trim();
    const targets = bulkTargets.length > 0 ? bulkTargets : singleTarget ? [singleTarget] : [];
    
    // Validations
    if (targets.length === 0) {
      setCreateError("Enter a post URL or paste bulk links");
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

    // Calculate actual times
    const startTime = Date.now() + startDelayMinutes * 60000;
    
    const runsWithTime = runs.map((run) => ({
      ...run,
      actualTime: new Date(startTime + run.intervalMinutes * 60000),
    }));

    // Prepare runs data
    const viewRuns = runsWithTime.map((run) => ({
      time: run.actualTime.toISOString(),
      quantity: Math.floor(run.views),
    }));
    
    const likesRuns = runsWithTime.map((run) => ({
      time: run.actualTime.toISOString(),
      quantity: Math.floor(run.likes),
    }));
    
    const sharesRuns = runsWithTime.map((run) => ({
      time: run.actualTime.toISOString(),
      quantity: Math.floor(run.shares),
    }));
    
    const savesRuns = runsWithTime.map((run) => ({
      time: run.actualTime.toISOString(),
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
    setDeploymentProgress({ current: 0, total: targets.length });
    
    if (targets.length > 1) {
      setCreateSuccess(`Processing ${targets.length} missions...`);
    } else {
      setCreateSuccess("Deploying mission...");
    }

    let successCount = 0;
    let failedCount = 0;
    let lastError = "";

    try {
      for (let index = 0; index < targets.length; index++) {
        const targetUrl = targets[index];
        setDeploymentProgress({ current: index + 1, total: targets.length });

        try {
          const result = await createSmmOrder({
            name: orderName.trim() || undefined,
            apiUrl: selectedApi.url,
            apiKey: selectedApi.key,
            link: targetUrl,
            services: servicesPayload,
          });

          const order: CreatedOrder = {
            id: createOrderId(),
            name: orderName.trim() 
              ? (targets.length > 1 ? `${orderName.trim()} #${index + 1}` : orderName.trim())
              : `Manual Mission #${createOrderId()}`,
            schedulerOrderId: result.schedulerOrderId,
            smmOrderId: result.orderId ?? "Scheduled",
            link: targetUrl,
            totalViews: totals.views,
            startDelayHours: Math.round(startDelayMinutes / 60),
            patternType: "manual",
            patternName: "Manual Schedule",
            runs: runsWithTime.map((run) => ({
              at: run.actualTime,
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
          successCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed";
          lastError = message;
          failedCount++;

          // Create failed order record
          const failedOrder: CreatedOrder = {
            id: createOrderId(),
            name: orderName.trim() 
              ? (targets.length > 1 ? `${orderName.trim()} #${index + 1}` : orderName.trim())
              : `Manual Mission #${createOrderId()}`,
            smmOrderId: "N/A",
            link: targetUrl,
            totalViews: totals.views,
            startDelayHours: Math.round(startDelayMinutes / 60),
            patternType: "manual",
            patternName: "Manual Schedule",
            runs: runsWithTime.map((run) => ({
              at: run.actualTime,
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
            status: "failed",
            completedRuns: 0,
            runStatuses: runs.map(() => "cancelled"),
            errorMessage: message,
            createdAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
          };
          onCreateOrder(failedOrder);
        }
      }

      // Final result
      if (failedCount > 0 && successCount === 0) {
        setCreateError(lastError || "All missions failed");
        setCreateSuccess("");
      } else if (targets.length > 1) {
        const resultMsg = `✅ Done: ${successCount}/${targets.length} deployed`;
        setCreateSuccess(resultMsg);
        if (failedCount > 0) {
          setCreateError(`${failedCount} failed: ${lastError}`);
        }
        onNavigateToOrders(resultMsg);
      } else {
        setCreateSuccess("✅ Mission Deployed Successfully!");
        onNavigateToOrders("Manual Mission Deployed");
      }
    } finally {
      setIsCreatingOrder(false);
      setDeploymentProgress({ current: 0, total: 0 });
    }
  }, [
    isCreatingOrder,
    postUrl,
    bulkLinks,
    parsedBulkLinks,
    selectedApiId,
    selectedBundleId,
    runs,
    totals,
    apis,
    bundles,
    orderName,
    startDelayMinutes,
    onCreateOrder,
    onNavigateToOrders,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleDeploy();
        return;
      }
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addRun();
        return;
      }
      
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }
      
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
    const sortedRuns = [...calculatedRuns].sort((a, b) => a.intervalMinutes - b.intervalMinutes);
    
    let cumulative = { views: 0, likes: 0, shares: 0, saves: 0 };
    
    return sortedRuns.map((run) => {
      cumulative.views += run.views;
      cumulative.likes += run.likes;
      cumulative.shares += run.shares;
      cumulative.saves += run.saves;
      
      return {
        ...run,
        cumulativeViews: cumulative.views,
        cumulativeLikes: cumulative.likes,
        cumulativeShares: cumulative.shares,
        cumulativeSaves: cumulative.saves,
      };
    });
  }, [calculatedRuns]);

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
    
    // Multiply by number of links for bulk orders
    const linkCount = Math.max(1, parsedBulkLinks.valid || (postUrl.trim() ? 1 : 0));
    
    return {
      views: viewsPrice * linkCount,
      likes: likesPrice * linkCount,
      shares: sharesPrice * linkCount,
      saves: savesPrice * linkCount,
      total: (viewsPrice + likesPrice + sharesPrice + savesPrice) * linkCount,
      perLink: viewsPrice + likesPrice + sharesPrice + savesPrice,
      linkCount,
    };
  }, [bundles, apis, selectedBundleId, selectedApiId, totals, parsedBulkLinks, postUrl]);

  // Format time helper
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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

            {/* Bulk Links */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-500">Bulk Links (one per line)</label>
                {parsedBulkLinks.total > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      parsedBulkLinks.invalid > 0 
                        ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                        : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      <span>📦</span>
                      <span>{parsedBulkLinks.valid}/{parsedBulkLinks.total}</span>
                    </div>
                  </div>
                )}
              </div>
              <textarea
                value={bulkLinks}
                onChange={(e) => setBulkLinks(e.target.value)}
                placeholder="Paste multiple URLs here..."
                rows={2}
                className={`w-full rounded-lg border bg-black px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none resize-none transition ${
                  parsedBulkLinks.invalid > 0
                    ? 'border-red-500/50'
                    : parsedBulkLinks.valid > 1
                      ? 'border-emerald-500/50'
                      : 'border-yellow-500/20'
                }`}
              />
              {parsedBulkLinks.valid > 1 && (
                <div className="mt-1 flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1">
                  <span className="text-xs">🚀</span>
                  <span className="text-[10px] text-blue-300">{parsedBulkLinks.valid} missions will be created</span>
                </div>
              )}
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

          {/* Start Delay Block */}
          <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-black p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⏰</span>
                <div>
                  <h3 className="text-xs font-semibold text-orange-400">Start Delay</h3>
                  <p className="text-[9px] text-gray-500">Delay before first run starts</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={startDelayMinutes}
                  onChange={(e) => setStartDelayMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="w-20 rounded-lg border border-orange-500/30 bg-black px-2 py-1.5 text-xs text-white text-center focus:border-orange-500/50 focus:outline-none"
                />
                <span className="text-[10px] text-gray-500">minutes</span>
              </div>
            </div>
            
            {/* Quick delay buttons */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {[0, 15, 30, 60, 120, 180].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setStartDelayMinutes(mins)}
                  className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                    startDelayMinutes === mins
                      ? 'bg-orange-500/30 border border-orange-500 text-orange-300'
                      : 'border border-gray-700 text-gray-400 hover:text-orange-300 hover:border-orange-500/30'
                  }`}
                >
                  {mins === 0 ? 'Now' : mins < 60 ? `${mins}m` : `${mins/60}h`}
                </button>
              ))}
            </div>
            
            {/* Estimated start time */}
            <div className="mt-2 text-[10px] text-orange-400/70">
              📅 First run at: {formatDateTime(new Date(Date.now() + startDelayMinutes * 60000))}
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
                    6 runs @60min
                  </button>
                  <button
                    onClick={() => generateTemplate(12, 30)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-0.5 text-[10px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30 transition"
                  >
                    12 runs @30min
                  </button>
                  <button
                    onClick={() => generateTemplate(24, 60)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-0.5 text-[10px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30 transition"
                  >
                    24 runs @60min
                  </button>
                  <button
                    onClick={() => generateTemplate(12, 120)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-0.5 text-[10px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30 transition"
                  >
                    12 runs @2h
                  </button>
                </div>

                {/* Table */}
                <div className="max-h-[250px] overflow-auto rounded-lg border border-gray-800">
                  <table className="w-full text-[10px]">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">#</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">⏱️ Interval (min)</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">🕐 Time</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">👁️ Views</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">❤️ Likes</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">🔄 Shares</th>
                        <th className="px-2 py-1.5 text-left text-gray-400 font-medium">💾 Saves</th>
                        <th className="px-2 py-1.5 text-center text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculatedRuns.map((run, index) => (
                        <motion.tr
                          key={run.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-t border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="px-2 py-1 text-gray-500">{index + 1}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={run.intervalMinutes}
                              onChange={(e) => updateRun(run.id, 'intervalMinutes', parseInt(e.target.value) || 0)}
                              className="w-16 rounded border border-gray-700 bg-black px-1 py-0.5 text-[10px] text-white focus:border-yellow-500/50 focus:outline-none"
                              min={0}
                            />
                          </td>
                          <td className="px-2 py-1 text-[9px] text-gray-500">
                            {formatTime(run.actualTime)}
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
                        <td className="px-2 py-1.5 font-bold text-yellow-400" colSpan={3}>TOTAL</td>
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
                  <p className="text-[9px] text-blue-400/70">Format: Interval(min), Views, Likes, Shares, Saves</p>
                </div>
                
                <textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder={`Interval	Views	Likes	Shares	Saves
0	1000	50	20	30
60	1500	75	30	45
120	2000	100	40	60
180	1200	60	25	35`}
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
                  <p className="text-[9px] text-emerald-400/70">Columns: Interval(min), Views, Likes, Shares, Saves</p>
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
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <div className="mt-3 rounded-md border border-gray-700 bg-black/50 p-2">
                  <p className="text-[10px] text-gray-400 mb-1">📥 Sample CSV format:</p>
                  <pre className="text-[9px] text-gray-500 font-mono">
{`Interval,Views,Likes,Shares,Saves
0,1000,50,20,30
60,1500,75,30,45
120,2000,100,40,60`}
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

          {/* Timeline Preview */}
          <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-yellow-400">📅 Timeline Preview</h3>
              <span className="text-[9px] text-gray-500">
                {formatDateTime(new Date(Date.now() + startDelayMinutes * 60000))} → {formatDateTime(calculatedRuns[calculatedRuns.length - 1]?.actualTime || new Date())}
              </span>
            </div>
            
            {runs.length > 0 ? (
              <div className="h-40 relative">
                {/* Simple Bar Chart */}
                <div className="flex items-end justify-between h-32 gap-0.5 px-1">
                  {graphData.map((point, index) => {
                    const maxViews = Math.max(...graphData.map(p => p.views));
                    const heightPercent = maxViews > 0 ? (point.views / maxViews) * 100 : 0;
                    
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center justify-end group"
                      >
                        <div className="relative w-full">
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                            <div className="rounded-md bg-gray-800 border border-gray-700 px-2 py-1 text-[9px] whitespace-nowrap">
                              <p className="text-white font-medium">+{point.intervalMinutes}min</p>
                              <p className="text-gray-400">{formatTime(point.actualTime)}</p>
                              <p className="text-yellow-300">👁️ {point.views}</p>
                              <p className="text-pink-300">❤️ {point.likes}</p>
                              <p className="text-blue-300">🔄 {point.shares}</p>
                              <p className="text-purple-300">💾 {point.saves}</p>
                            </div>
                          </div>
                          
                          {/* Bar */}
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(heightPercent, 5)}%` }}
                            className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-sm min-h-[4px] cursor-pointer hover:from-yellow-500 hover:to-yellow-300 transition-colors"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* X-axis labels */}
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-[8px] text-gray-500">
                    Start (+{runs[0]?.intervalMinutes || 0}min)
                  </span>
                  <span className="text-[8px] text-gray-500">
                    End (+{runs[runs.length - 1]?.intervalMinutes || 0}min)
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
              <div className="h-28 relative">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.2" />
                  
                  <polyline
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="0.8"
                    points={graphData.map((point, index) => {
                      const x = graphData.length > 1 ? (index / (graphData.length - 1)) * 100 : 50;
                      const y = totals.views > 0 ? 50 - (point.cumulativeViews / totals.views) * 45 : 50;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  
                  <polygon
                    fill="url(#gradient)"
                    opacity="0.3"
                    points={`0,50 ${graphData.map((point, index) => {
                      const x = graphData.length > 1 ? (index / (graphData.length - 1)) * 100 : 50;
                      const y = totals.views > 0 ? 50 - (point.cumulativeViews / totals.views) * 45 : 50;
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
                
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-gray-500">0</span>
                  <span className="text-[8px] text-yellow-400 font-medium">{totals.views.toLocaleString()} views</span>
                </div>
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center text-gray-500 text-xs">
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
                  <span className="text-[10px] text-gray-400">👁️{(totals.views/1000).toFixed(0)}k</span>
                  {totals.likes > 0 && (
                    <span className="text-[10px] text-gray-400">❤️{(totals.likes/1000).toFixed(1)}k</span>
                  )}
                  {totals.shares > 0 && (
                    <span className="text-[10px] text-gray-400">🔄{(totals.shares/1000).toFixed(1)}k</span>
                  )}
                  {totals.saves > 0 && (
                    <span className="text-[10px] text-gray-400">💾{(totals.saves/1000).toFixed(1)}k</span>
                  )}
                  {price.linkCount > 1 && (
                    <span className="text-[10px] text-blue-400">×{price.linkCount} links</span>
                  )}
                </div>
                
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1">
                  <span className="text-sm font-bold text-yellow-400">₹{price.total.toFixed(0)}</span>
                </div>
              </div>
              
              {price.linkCount > 1 && (
                <div className="mt-1 text-[9px] text-gray-500 text-right">
                  ₹{price.perLink.toFixed(0)} per link × {price.linkCount} links
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deploy Button */}
      <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {createError && <span className="text-[10px] text-red-400">❌ {createError}</span>}
          {createSuccess && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400">{createSuccess}</span>
              {isCreatingOrder && deploymentProgress.total > 1 && (
                <div className="flex items-center gap-1">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-700">
                    <motion.div
                      animate={{ width: `${(deploymentProgress.current / deploymentProgress.total) * 100}%` }}
                      className="h-full rounded-full bg-yellow-400"
                    />
                  </div>
                  <span className="text-[9px] text-yellow-400">{deploymentProgress.current}/{deploymentProgress.total}</span>
                </div>
              )}
            </div>
          )}
          {!createError && !createSuccess && (
            <span className="text-[10px] text-gray-500">
              Ready: {runs.length} runs • {totals.views.toLocaleString()} views
              {parsedBulkLinks.valid > 1 && ` • ${parsedBulkLinks.valid} links`}
              {startDelayMinutes > 0 && ` • starts in ${startDelayMinutes}min`}
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
            {isCreatingOrder 
              ? `🚀 Deploying${deploymentProgress.total > 1 ? ` ${deploymentProgress.current}/${deploymentProgress.total}` : '...'}` 
              : `🎯 Deploy${parsedBulkLinks.valid > 1 ? ` ${parsedBulkLinks.valid} Missions` : ' Mission'}`
            }
          </span>
          <kbd className="relative hidden rounded border border-yellow-500/30 bg-yellow-500/10 px-1 py-0.5 text-[8px] sm:inline">
            Ctrl+↵
          </kbd>
        </motion.button>
      </div>
    </div>
  );
}
