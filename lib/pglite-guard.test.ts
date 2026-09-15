import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type ServerHandle = { server: http.Server; url: string; port: number };

// The guard module reads its health URL from env at import time, so each
// scenario resets the module registry and re-imports with its own URL.
async function importGuard(healthUrl: string) {
  process.env.PGLITE_GUARD_HEALTH_URL = healthUrl;
  vi.resetModules();
  return import("../scripts/pglite-guard.mjs");
}

function listenOnRandomPort(): Promise<ServerHandle> {
  return new Promise((resolve) => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end('{"status":"ok"}');
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port, url: `http://127.0.0.1:${port}/api/health` });
    });
  });
}

function closeServer(handle: ServerHandle): Promise<void> {
  return new Promise((resolve) => {
    handle.server.close(() => resolve());
  });
}

let serving: ServerHandle;

beforeAll(async () => {
  serving = await listenOnRandomPort();
});

afterAll(async () => {
  await closeServer(serving);
});

describe("pglite guard", () => {
  it("detects a responding server as port in use", async () => {
    const guard = await importGuard(serving.url);
    await expect(guard.isPortInUse()).resolves.toBe(true);
  });

  it("treats a refused connection as a free port", async () => {
    // Bind, read the port, then close: nothing is listening on it for the
    // rest of the test, so a connect attempt is refused.
    const { server, port } = await listenOnRandomPort();
    await closeServer({ server, port, url: "" });

    const guard = await importGuard(`http://127.0.0.1:${port}/api/health`);
    await expect(guard.isPortInUse()).resolves.toBe(false);
  });

  it("treats an unreachable URL as a free port", async () => {
    const guard = await importGuard("http://127.0.0.1:1/api/health");
    await expect(guard.isPortInUse()).resolves.toBe(false);
  });
});
