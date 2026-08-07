const baseUrl = (process.env.JOB_WORKER_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const secret = process.env.INTERNAL_JOB_SECRET?.trim();
const intervalMs = Math.min(60_000, Math.max(5_000, Number(process.env.JOB_WORKER_INTERVAL_MS ?? 10_000)));
if (!baseUrl) throw new Error("JOB_WORKER_URL or NEXT_PUBLIC_APP_URL is required.");
if (!secret || secret.length < 32) throw new Error("INTERNAL_JOB_SECRET must be configured with at least 32 characters.");

let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

console.log(`Job worker polling ${baseUrl}/api/internal/jobs/run every ${intervalMs}ms.`);
while (!stopping) {
  await pollOnce();
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
console.log("Job worker stopped.");

async function pollOnce() {
  try {
    const response = await fetch(`${baseUrl}/api/internal/jobs/run`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-job-secret": secret },
      body: JSON.stringify({ limit: 10 }),
    });
    if (!response.ok) {
      console.error(`Job worker request failed with HTTP ${response.status}.`);
      return;
    }
    const payload = await response.json();
    const results = Array.isArray(payload.results) ? payload.results : [];
    if (results.some((result) => result.status !== "idle")) {
      console.log(`Job worker processed ${results.filter((result) => result.status !== "idle").length} item(s).`);
    }
  } catch (error) {
    console.error(`Job worker poll failed: ${error instanceof Error ? error.name : "unknown"}.`);
  }
}

