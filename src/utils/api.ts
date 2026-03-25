import type { ApiService } from "../types/order";

interface CreateOrderPayload {
  name?: string;
  apiUrl: string;
  apiKey: string;
  link: string;
  services: Partial<
    Record<
      "views" | "likes" | "shares" | "saves",
      {
        serviceId: string;
        runs: Array<{
          time: string;
          quantity: number;
        }>;
      }
    >
  >;
}

interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  schedulerOrderId?: string;
  status?: string;
  completedRuns?: number;
  message?: string;
  raw?: unknown;
}

interface OrderControlResult {
  success: boolean;
  status?: "running" | "paused" | "cancelled" | "completed";
  completedRuns?: number;
  runStatuses?: Array<"pending" | "completed" | "cancelled">;
  error?: string;
}

const BACKEND_BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim() ||
  "https://backend-y30y.onrender.com";

interface RawService {
  service?: string | number;
  id?: string | number;
  name?: string;
  type?: string;
  rate?: string | number;
  min?: string | number;
  max?: string | number;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchServices(apiUrl: string, apiKey: string): Promise<ApiService[]> {
  const endpoint = `${BACKEND_BASE_URL.replace(/\/$/, "")}/api/services`;
  console.info("[Fetch Services] Sending request", { endpoint, apiUrl });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiUrl, apiKey }),
    });
  } catch (error) {
    console.error("[Fetch Services] Network request failed", error);
    throw new Error("Cannot reach backend /api/services. Check backend availability and VITE_BACKEND_URL.");
  }

  const responseText = await response.text();
  const payload = ((): unknown => {
    try {
      return JSON.parse(responseText);
    } catch {
      return null;
    }
  })();

  const payloadObject = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

  if (!response.ok) {
    console.error("[Fetch Services] Failed response", {
      status: response.status,
      payload,
      bodyPreview: responseText.slice(0, 500),
    });
    throw new Error(String(payloadObject?.error || `Failed to fetch services (HTTP ${response.status})`));
  }

  const directRows = Array.isArray(payload) ? payload : [];
  const wrappedServices = payloadObject?.services;
  const rows: RawService[] = Array.isArray(wrappedServices)
    ? (wrappedServices as RawService[])
    : wrappedServices && typeof wrappedServices === "object" && Array.isArray((wrappedServices as { data?: unknown[] }).data)
      ? (wrappedServices as { data: RawService[] }).data
      : (directRows as RawService[]);

  console.info("[Fetch Services] Response received", { count: rows.length });

  return rows
    .map((service) => {
      const id = String(service.service ?? service.id ?? "").trim();
      const name = String(service.name ?? "").trim();
      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        type: String(service.type ?? "").trim(),
        rate: String(service.rate ?? "").trim(),
        min: toNumber(service.min),
        max: toNumber(service.max),
      } satisfies ApiService;
    })
    .filter((service): service is ApiService => Boolean(service));
}

export async function createSmmOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  const endpoint = `${BACKEND_BASE_URL.replace(/\/$/, "")}/api/order`;
  console.info("[Create Order] Sending request", {
    endpoint,
    apiUrl: payload.apiUrl,
    services: Object.keys(payload.services),
    link: payload.link,
    runsCount: Object.values(payload.services).reduce((sum, s) => sum + (s?.runs?.length || 0), 0),
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[Create Order] Network request failed", error);
    throw new Error("Cannot reach backend /api/order. Check backend availability and VITE_BACKEND_URL.");
  }

  const responseText = await response.text();
  const parsed = ((): unknown => {
    try {
      return JSON.parse(responseText);
    } catch {
      return null;
    }
  })();

  const payloadObject = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const explicitError =
    typeof payloadObject?.error === "string" && payloadObject.error.trim()
      ? payloadObject.error.trim()
      : "";
  const isExplicitSuccess = payloadObject?.success === true;
  const successMessage =
    typeof payloadObject?.message === "string" && payloadObject.message.trim()
      ? payloadObject.message.trim()
      : "Order Scheduled Successfully";
  const orderIds = Array.isArray(payloadObject?.orderIds) ? payloadObject.orderIds : null;
  const resolvedOrderId = payloadObject?.orderId ?? payloadObject?.order ?? (orderIds && orderIds[0]);
  const schedulerOrderId =
    payloadObject?.schedulerOrderId !== undefined && payloadObject?.schedulerOrderId !== null
      ? String(payloadObject.schedulerOrderId)
      : undefined;

  // 🔧 DEBUG: Log schedulerOrderId
  console.info("[Create Order] schedulerOrderId received:", schedulerOrderId);

  if (explicitError) {
    console.error("[Create Order] API returned error", {
      status: response.status,
      payload: payloadObject,
    });
    throw new Error(explicitError);
  }

  if (!response.ok) {
    console.error("[Create Order] Failed response", {
      status: response.status,
      payload: payloadObject,
      bodyPreview: responseText.slice(0, 500),
    });
    throw new Error(`Order request failed (HTTP ${response.status})`);
  }

  if (isExplicitSuccess) {
    console.info("[Create Order] Response received", {
      success: true,
      message: successMessage,
      orderId: resolvedOrderId !== undefined && resolvedOrderId !== null ? String(resolvedOrderId) : undefined,
      schedulerOrderId,
    });
    return {
      success: true,
      orderId:
        resolvedOrderId !== undefined && resolvedOrderId !== null && String(resolvedOrderId).trim() !== ""
          ? String(resolvedOrderId)
          : undefined,
      message: successMessage,
      schedulerOrderId,
      status: typeof payloadObject?.status === "string" ? payloadObject.status : undefined,
      completedRuns: typeof payloadObject?.completedRuns === "number" ? payloadObject.completedRuns : undefined,
      raw: payloadObject,
    };
  }

  if (resolvedOrderId === undefined || resolvedOrderId === null || String(resolvedOrderId).trim() === "") {
    console.error("[Create Order] Missing order ID in response", {
      status: response.status,
      payload: payloadObject,
      bodyPreview: responseText.slice(0, 500),
    });
    throw new Error("Order failed: provider did not return an order ID or success confirmation");
  }

  console.info("[Create Order] Response received", {
    orderId: String(resolvedOrderId),
    schedulerOrderId,
  });

  return {
    success: true,
    orderId: String(resolvedOrderId),
    message: successMessage,
    schedulerOrderId,
    status: typeof payloadObject?.status === "string" ? payloadObject.status : undefined,
    completedRuns: typeof payloadObject?.completedRuns === "number" ? payloadObject.completedRuns : undefined,
    raw: payloadObject,
  };
}

// 🔧 IMPROVED: Better cancel handling with retries and detailed logging
export async function updateOrderControl(payload: {
  schedulerOrderId: string;
  action: "pause" | "resume" | "cancel";
}): Promise<OrderControlResult> {
  const endpoint = `${BACKEND_BASE_URL.replace(/\/$/, "")}/api/order/control`;
  
  console.info(`[Order Control] Sending ${payload.action.toUpperCase()} request`, {
    endpoint,
    schedulerOrderId: payload.schedulerOrderId,
    action: payload.action,
  });

  // Retry logic for cancel action (important!)
  const maxRetries = payload.action === "cancel" ? 3 : 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }

      const payloadObject = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;

      console.info(`[Order Control] Response (attempt ${attempt}/${maxRetries})`, {
        status: response.status,
        success: payloadObject?.success,
        resultStatus: payloadObject?.status,
        completedRuns: payloadObject?.completedRuns,
        runStatuses: payloadObject?.runStatuses,
        raw: payloadObject,
      });

      if (!response.ok || payloadObject?.success === false) {
        const errorMsg = String(payloadObject?.error || `Order control failed (HTTP ${response.status})`);
        console.error(`[Order Control] Failed (attempt ${attempt}/${maxRetries})`, errorMsg);
        
        if (attempt < maxRetries) {
          console.info(`[Order Control] Retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        throw new Error(errorMsg);
      }

      // 🔧 Verify cancel was successful
      if (payload.action === "cancel") {
        const resultStatus = payloadObject?.status;
        if (resultStatus !== "cancelled") {
          console.warn(`[Order Control] Cancel requested but status is '${resultStatus}', expected 'cancelled'`);
        }
      }

      return {
        success: true,
        status:
          payloadObject?.status === "running" ||
          payloadObject?.status === "paused" ||
          payloadObject?.status === "cancelled" ||
          payloadObject?.status === "completed"
            ? payloadObject.status
            : undefined,
        completedRuns: typeof payloadObject?.completedRuns === "number" ? payloadObject.completedRuns : undefined,
        runStatuses: Array.isArray(payloadObject?.runStatuses)
          ? (payloadObject.runStatuses as Array<"pending" | "completed" | "cancelled">)
          : undefined,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Order Control] Error (attempt ${attempt}/${maxRetries})`, lastError.message);
      
      if (attempt < maxRetries) {
        console.info(`[Order Control] Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error("Order control failed after all retries");
}

// 🔧 NEW: Batch cancel function for bulk orders
export async function cancelMultipleOrders(schedulerOrderIds: string[]): Promise<{
  success: boolean;
  results: Array<{ schedulerOrderId: string; success: boolean; error?: string }>;
}> {
  console.info(`[Batch Cancel] Cancelling ${schedulerOrderIds.length} orders...`);
  
  const results: Array<{ schedulerOrderId: string; success: boolean; error?: string }> = [];
  
  for (const schedulerOrderId of schedulerOrderIds) {
    try {
      await updateOrderControl({ schedulerOrderId, action: "cancel" });
      results.push({ schedulerOrderId, success: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ schedulerOrderId, success: false, error: errorMsg });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.info(`[Batch Cancel] Completed: ${successCount}/${schedulerOrderIds.length} successful`);
  
  return {
    success: successCount === schedulerOrderIds.length,
    results,
  };
}
