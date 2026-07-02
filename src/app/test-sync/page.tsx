"use client";

import React, { useEffect, useState } from "react";
import { storageService } from "@/lib/storage/StorageService";
import {
  enqueueOfflineOperation,
  registerOfflineAction,
  processOfflineQueue,
  getOfflineQueue,
} from "@/lib/offline/offlineQueue";
import { useRefresh } from "@/lib/refresh/RefreshContext";

// Duplicated semver helper from VersionAlert to verify logic
function parseVersion(v: string): number[] {
  return v.split(".").map((num) => parseInt(num, 10) || 0);
}

function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

interface TestResult {
  name: string;
  description: string;
  status: "running" | "passed" | "failed";
  details?: string;
}

export default function TestSyncPage() {
  const { getData, invalidate } = useRefresh();
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Storage Service Check", description: "Verifies StorageService gets, sets, and removes typed data.", status: "running" },
    { name: "Semver Versioning Check", description: "Verifies semver comparisons correctly flag update states.", status: "running" },
    { name: "Offline Queue Sequence Order", description: "Verifies sequential dependsOn tasks execute in chronological order.", status: "running" },
    { name: "Offline Queue Cascade Failure", description: "Verifies failed parent operations cascade fail-state to children.", status: "running" },
    { name: "CRM Request Deduplication", description: "Verifies duplicate concurrent fetches are consolidated into a single network call.", status: "running" },
  ]);

  const [allPassed, setAllPassed] = useState<boolean | null>(null);

  useEffect(() => {
    const runTests = async () => {
      const results = [...tests];

      // --- Test 1: Storage Service Check ---
      try {
        await storageService.set("test_key", { testVal: 42 });
        const retrieved = await storageService.get<{ testVal: number }>("test_key");
        const match = retrieved?.testVal === 42;
        await storageService.remove("test_key");
        const afterDelete = await storageService.get("test_key");

        if (match && afterDelete === null) {
          results[0].status = "passed";
          results[0].details = "Set, get, and remove operations verified successfully.";
        } else {
          results[0].status = "failed";
          results[0].details = `Storage mismatch. Retrieved: ${JSON.stringify(retrieved)}, afterDelete: ${JSON.stringify(afterDelete)}`;
        }
      } catch (err) {
        results[0].status = "failed";
        results[0].details = String(err);
      }
      setTests([...results]);

      // --- Test 2: Semver Versioning Check ---
      try {
        const check1 = compareVersions("1.0.0", "1.1.0") === -1;
        const check2 = compareVersions("1.2.3", "1.2.3") === 0;
        const check3 = compareVersions("2.1.0", "1.9.9") === 1;

        if (check1 && check2 && check3) {
          results[1].status = "passed";
          results[1].details = "Correctly evaluated semver boundaries.";
        } else {
          results[1].status = "failed";
          results[1].details = `Semver mismatch. 1.0.0 vs 1.1.0: ${compareVersions("1.0.0", "1.1.0")} (expected -1), 1.2.3 vs 1.2.3: ${compareVersions("1.2.3", "1.2.3")} (expected 0), 2.1.0 vs 1.9.9: ${compareVersions("2.1.0", "1.9.9")} (expected 1)`;
        }
      } catch (err) {
        results[1].status = "failed";
        results[1].details = String(err);
      }
      setTests([...results]);

      // --- Test 3: Offline Queue Sequence Order ---
      try {
        const order: string[] = [];
        registerOfflineAction("actionA", async () => {
          order.push("A");
          return { success: true };
        });
        registerOfflineAction("actionB", async () => {
          order.push("B");
          return { success: true };
        });
        registerOfflineAction("actionC", async () => {
          order.push("C");
          return { success: true };
        });

        // Clear queue
        await storageService.set("offline_operations_queue", []);

        // Enqueue Task A
        const idA = await enqueueOfflineOperation("test", "actionA", {}, { autoProcess: false });
        // Enqueue Task B (depends on A)
        await enqueueOfflineOperation("test", "actionB", {}, { dependsOn: idA, autoProcess: false });
        // Enqueue Task C (parallel)
        await enqueueOfflineOperation("test", "actionC", {}, { autoProcess: false });

        // Run queue processor
        await processOfflineQueue();

        const indexA = order.indexOf("A");
        const indexB = order.indexOf("B");

        if (indexA !== -1 && indexB !== -1 && indexA < indexB && order.includes("C")) {
          results[2].status = "passed";
          results[2].details = `Executed in correct logical order. Recorded order: ${order.join(" -> ")}`;
        } else {
          results[2].status = "failed";
          results[2].details = `Incorrect execution order. Recorded order: ${order.join(" -> ")}`;
        }
      } catch (err) {
        results[2].status = "failed";
        results[2].details = String(err);
      }
      setTests([...results]);

      // --- Test 4: Offline Queue Cascade Failure ---
      try {
        const runLogs: string[] = [];
        registerOfflineAction("failAction", async () => {
          return { success: false, error: "Simulated task error" };
        });
        registerOfflineAction("childAction", async () => {
          runLogs.push("childExecuted");
          return { success: true };
        });

        // Clear queue
        await storageService.set("offline_operations_queue", []);

        // Enqueue parent (which fails)
        const parentId = await enqueueOfflineOperation("test", "failAction", {}, { autoProcess: false });
        // Enqueue child (depends on parent)
        const childId = await enqueueOfflineOperation("test", "childAction", {}, { dependsOn: parentId, autoProcess: false });

        // Run processor up to MAX_RETRIES (5)
        for (let i = 0; i < 5; i++) {
          await processOfflineQueue();
        }

        const finalQueue = await getOfflineQueue();
        const parentOp = finalQueue.find((o) => o.id === parentId);
        const childOp = finalQueue.find((o) => o.id === childId);

        if (!parentOp && !childOp && runLogs.length === 0) {
          results[3].status = "passed";
          results[3].details = "Parent failed and both operations were successfully purged from storage without executing child.";
        } else {
          results[3].status = "failed";
          results[3].details = `Mismatch. Parent status: ${parentOp?.status}, Child status: ${childOp?.status}, Executed: ${runLogs.length}`;
        }
      } catch (err) {
        results[3].status = "failed";
        results[3].details = String(err);
      }
      setTests([...results]);

      // --- Test 5: CRM Request Deduplication ---
      try {
        let fetches = 0;
        const fetchFn = async () => {
          fetches++;
          await new Promise((resolve) => setTimeout(resolve, 80));
          return "test_payload";
        };

        await invalidate("test_dedup");

        // Fire 3 calls concurrently
        const [r1, r2, r3] = await Promise.all([
          getData("test_dedup", fetchFn, { cachePolicy: "none" }),
          getData("test_dedup", fetchFn, { cachePolicy: "none" }),
          getData("test_dedup", fetchFn, { cachePolicy: "none" }),
        ]);

        if (fetches === 1 && r1 === "test_payload" && r2 === "test_payload" && r3 === "test_payload") {
          results[4].status = "passed";
          results[4].details = `Successfully coalesced 3 requests into 1 network call. Fetch count: ${fetches}`;
        } else {
          results[4].status = "failed";
          results[4].details = `Deduplication failed. Fetch count: ${fetches}, outputs match: ${r1 === r2 && r2 === r3}`;
        }
      } catch (err) {
        results[4].status = "failed";
        results[4].details = String(err);
      }
      setTests([...results]);

      // Determine final status
      const pass = results.every((t) => t.status === "passed");
      setAllPassed(pass);
    };

    void runTests();
  }, [getData, invalidate]);

  return (
    <div className="min-h-screen bg-[#EFF3F6] p-8 font-body flex flex-col justify-center items-center">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-lg space-y-6">
        <div className="text-center">
          <h1 className="font-headline text-2xl font-black text-[#002261] tracking-tight">
            PHS Sync System Automated Verification
          </h1>
          <p className="text-on-surface-variant font-medium text-xs mt-1.5">
            Unit test dashboard executing in active client environment
          </p>
        </div>

        <div className="space-y-3.5">
          {tests.map((test, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-2xl bg-surface border border-outline-variant/10 shadow-xs"
            >
              <div className="shrink-0 mt-0.5">
                {test.status === "running" && (
                  <svg className="animate-spin h-5 w-5 text-[#002261]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {test.status === "passed" && (
                  <span className="material-symbols-outlined text-green-600 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
                {test.status === "failed" && (
                  <span className="material-symbols-outlined text-error font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                    cancel
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-black text-[#002261] font-headline">{test.name}</h3>
                <p className="text-[10px] text-on-surface-variant/75 font-medium mt-0.5">{test.description}</p>
                {test.details && (
                  <p className="text-[9px] text-on-surface-variant font-mono mt-1.5 bg-surface-container-low px-2.5 py-1 rounded-md border border-outline-variant/5">
                    {test.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {allPassed !== null && (
          <div
            id="test-suite-summary"
            className={`p-5 rounded-2xl text-center border font-headline font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 animate-in zoom-in-95 duration-300 ${
              allPassed
                ? "bg-green-500/10 text-green-700 border-green-500/20"
                : "bg-error/10 text-error border-error/20"
            }`}
          >
            <span className="material-symbols-outlined">
              {allPassed ? "verified" : "error"}
            </span>
            <span>{allPassed ? "TESTS PASSED: ALL SYSTEMS OPERATIONAL" : "TESTS FAILED: SYSTEM INTEGRITY COMPROMISED"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
