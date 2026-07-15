import { storageService } from "../storage/StorageService";

export interface OfflineOperation {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  dependsOn?: string; // ID of the operation this depends on
  retryCount: number;
  status: "pending" | "syncing" | "failed";
  timestamp: number;
  actionName: string;
  payload: Record<string, unknown>;
}

export type OfflineActionFn = (payload: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

const actionRegistry: Record<string, OfflineActionFn> = {};
const QUEUE_KEY = "offline_operations_queue";
const MAX_RETRIES = 5;

let isProcessing = false;

// Register actions that can be executed offline
export function registerOfflineAction(name: string, fn: OfflineActionFn): void {
  actionRegistry[name] = fn;
}

// Get the current queue
export async function getOfflineQueue(): Promise<OfflineOperation[]> {
  const queue = await storageService.get<OfflineOperation[]>(QUEUE_KEY);
  return queue || [];
}

// Save the queue
async function saveOfflineQueue(queue: OfflineOperation[]): Promise<void> {
  await storageService.set<OfflineOperation[]>(QUEUE_KEY, queue);
}

// Add an operation to the queue
export async function enqueueOfflineOperation(
  type: string,
  actionName: string,
  payload: Record<string, unknown>,
  options?: { priority?: "high" | "medium" | "low"; dependsOn?: string; autoProcess?: boolean }
): Promise<string> {
  const id = `op_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
  const queue = await getOfflineQueue();

  const newOp: OfflineOperation = {
    id,
    type,
    priority: options?.priority || "medium",
    dependsOn: options?.dependsOn,
    retryCount: 0,
    status: "pending",
    timestamp: Date.now(),
    actionName,
    payload,
  };

  queue.push(newOp);
  await saveOfflineQueue(queue);

  // Trigger processing asynchronously in case we are currently online
  const triggerAuto = options?.autoProcess !== false;
  if (triggerAuto && typeof window !== "undefined" && window.navigator.onLine) {
    void processOfflineQueue();
  }

  return id;
}

// Check if an operation's dependencies are resolved
function areDependenciesResolved(op: OfflineOperation, queue: OfflineOperation[]): boolean {
  if (!op.dependsOn) return true;
  const dependency = queue.find((o) => o.id === op.dependsOn);
  // If dependency is not in queue, it is completed and removed
  if (!dependency) return true;
  // If dependency failed, we cannot proceed
  if (dependency.status === "failed") return false;
  return false;
}

// Cascade failure to dependent operations
function cascadeFailures(queue: OfflineOperation[]): boolean {
  let changed = false;
  queue.forEach((op) => {
    if (op.status === "pending" && op.dependsOn) {
      const dependency = queue.find((o) => o.id === op.dependsOn);
      if (dependency && dependency.status === "failed") {
        op.status = "failed";
        console.warn(`[OfflineQueue] Cascading failure to operation ${op.id} due to failed dependency ${op.dependsOn}`);
        changed = true;
      }
    }
  });
  return changed;
}

// Process the queue
export async function processOfflineQueue(): Promise<void> {
  if (isProcessing) return;
  if (typeof window === "undefined" || !window.navigator.onLine) {
    return;
  }
  isProcessing = true;

  try {
    let queue = await getOfflineQueue();
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }

    // Cascade any failed dependencies
    if (cascadeFailures(queue)) {
      await saveOfflineQueue(queue);
    }

    // Record count of pending items before we started processing in this loop
    const initialPendingCount = queue.filter((op) => op.status === "pending").length;

    // Filter operations that are ready to run
    const readyOps = queue.filter(
      (op) => op.status === "pending" && areDependenciesResolved(op, queue)
    );

    if (readyOps.length === 0) {
      isProcessing = false;
      return;
    }

    // Classify into parallel and sequential
    // Sequential: operations that are dependencies for other things in the queue
    const dependencyIds = new Set(queue.filter((op) => op.dependsOn).map((op) => op.dependsOn));
    
    const sequentialOps = readyOps.filter((op) => dependencyIds.has(op.id) || op.dependsOn);
    const parallelOps = readyOps.filter((op) => !dependencyIds.has(op.id) && !op.dependsOn);

    // Execute parallel operations concurrently
    const parallelPromises = parallelOps.map(async (op) => {
      return executeOperation(op);
    });

    // Execute sequential operations one-by-one to maintain order
    for (const op of sequentialOps) {
      const success = await executeOperation(op);
      // If a sequential operation fails, do not proceed with next sequential ops in this run
      if (!success) break;
    }

    await Promise.all(parallelPromises);

    // Reload queue
    queue = await getOfflineQueue();

    // Run cascade failures to propagate any new "failed" states
    cascadeFailures(queue);

    // Filter out completed items (which were deleted inside executeOperation) and failed ones
    const updatedQueue = queue.filter((op) => op.status !== "syncing" && op.status !== "failed");
    
    await saveOfflineQueue(updatedQueue);

    // Recursively process if there are still operations left and progress was made
    const nextQueue = await getOfflineQueue();
    const nextReady = nextQueue.filter((op) => op.status === "pending" && areDependenciesResolved(op, nextQueue));
    const finalPendingCount = nextQueue.filter((op) => op.status === "pending").length;
    
    isProcessing = false;

    if (nextReady.length > 0 && finalPendingCount < initialPendingCount) {
      // Await recursive execution so that caller promise resolves only when queue processing completes fully
      await processOfflineQueue();
    }
  } catch (error) {
    console.error("[OfflineQueue] Error processing queue:", error);
    isProcessing = false;
  }
}

// Execute a single operation
async function executeOperation(op: OfflineOperation): Promise<boolean> {
  const actionFn = actionRegistry[op.actionName];
  if (!actionFn) {
    console.error(`[OfflineQueue] No registered action found for "${op.actionName}"`);
    op.status = "failed";
    await updateOperationInQueue(op);
    return false;
  }

  op.status = "syncing";
  await updateOperationInQueue(op);

  try {
    const result = await actionFn(op.payload);

    if (result.success) {
      // Remove from queue completely
      const queue = await getOfflineQueue();
      const filtered = queue.filter((o) => o.id !== op.id);
      await saveOfflineQueue(filtered);
      return true;
    } else {
      console.warn(`[OfflineQueue] Action "${op.actionName}" (ID: ${op.id}) failed: ${result.error}`);
      op.retryCount += 1;
      op.status = op.retryCount >= MAX_RETRIES ? "failed" : "pending";
      await updateOperationInQueue(op);
      return false;
    }
  } catch (error) {
    console.error(`[OfflineQueue] Exception executing action "${op.actionName}" (ID: ${op.id}):`, error);
    op.retryCount += 1;
    op.status = op.retryCount >= MAX_RETRIES ? "failed" : "pending";
    await updateOperationInQueue(op);
    return false;
  }
}

// Update a single operation's status in the queue
async function updateOperationInQueue(op: OfflineOperation): Promise<void> {
  const queue = await getOfflineQueue();
  const updated = queue.map((o) => (o.id === op.id ? op : o));
  await saveOfflineQueue(updated);
}
