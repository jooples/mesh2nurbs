import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Compile the actual TypeScript modules in a sandbox with no network access.
function loadModule(path, overrides = {}) {
  const source = readFileSync(resolve(path), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Error, Uint8Array, TextDecoder, AbortController, URLSearchParams,
    FormData, crypto, process: { env: {} },
    fetch: () => { throw new Error("Unexpected network request"); },
    require: (name) => { throw new Error(`Unexpected module: ${name}`); },
    ...overrides,
  }, { filename: path });
  return exports;
}

test("retries share a key until the payload changes or the request succeeds", () => {
  const { RetryableRequest } = loadModule("lib/retryable-request.ts");
  const request = new RetryableRequest();
  const first = request.keyFor({ amount: 50, userId: "alice" });
  assert.equal(request.keyFor({ amount: 50, userId: "alice" }), first);
  const changed = request.keyFor({ amount: 50, userId: "bob" });
  assert.notEqual(changed, first);
  assert.notEqual(request.keyFor({ amount: 60, userId: "bob" }), changed);
  request.complete();
  assert.notEqual(request.keyFor({ amount: 50, userId: "alice" }), first);
});

test("uploads accept matching JPEG, PNG and WebP headers", async () => {
  const { validateImageUpload } = loadModule("lib/image-upload.ts");
  await validateImageUpload(new File([new Uint8Array([255, 216, 255, 224])], "photo.jpg", { type: "image/jpeg" }));
  await validateImageUpload(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "photo.png", { type: "image/png" }));
  await validateImageUpload(new File(["RIFF0000WEBP"], "photo.webp", { type: "image/webp" }));
});

test("uploads reject empty, oversized, unsupported and disguised files", async () => {
  const { validateImageUpload, MAX_IMAGE_BYTES } = loadModule("lib/image-upload.ts");
  await assert.rejects(validateImageUpload(new File([], "empty.png", { type: "image/png" })), /non-empty/);
  await assert.rejects(validateImageUpload({ size: MAX_IMAGE_BYTES + 1 }), /16 MB/);
  await assert.rejects(validateImageUpload(new File(["GIF89a"], "animated.gif", { type: "image/gif" })), /JPEG, PNG, or WebP/);
  await assert.rejects(validateImageUpload(new File(["not an image"], "fake.png", { type: "image/png" })), /does not contain/);
  await assert.rejects(validateImageUpload(new File([new Uint8Array([255, 216, 255])], "wrong.png", { type: "image/png" })), /does not contain/);
});

test("every paid or credit-changing UI request forwards its idempotency key", async () => {
  const requests = [];
  const { jobsApi, creditsApi, adminApi } = loadModule("lib/api.ts", {
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ id: "existing-job" }) };
    },
  });
  await jobsApi.createTextTo3D({ prompt: "test" }, "text-retry");
  await jobsApi.createTextTo3D({ prompt: "test" }, "text-retry");
  await jobsApi.createImageTo3D(new File(["PNG"], "test.png"), { auto_post_process: false }, "image-retry");
  await jobsApi.postProcess("existing-job", { alpha: 0.05, offset: 0.005 }, "conversion-retry");
  await creditsApi.topUp(50, "topup-retry");
  await adminApi.adjustCredits("alice", 20, "test grant", "grant-retry");
  assert.deepEqual(requests.map((r) => r.options.headers["Idempotency-Key"]), [
    "text-retry", "text-retry", "image-retry", "conversion-retry", "topup-retry", "grant-retry",
  ]);
  assert.equal(requests[0].options.body, requests[1].options.body);
  assert.equal(requests[2].options.body.get("auto_post_process"), "false");
});

test("gallery queries pass pagination, album filters and cancellation to fetch", async () => {
  const requests = [];
  const { jobsApi } = loadModule("lib/api.ts", {
    fetch: async (url, options) => {
      requests.push({ url: new URL(url), options });
      return { ok: true, status: 200, json: async () => ({ items: [], total: 0 }) };
    },
  });
  const controller = new AbortController();
  await jobsApi.listJobs({ page: 3, per_page: 12, status: "completed", search: "red vase", album: "Client A" }, controller.signal);
  await jobsApi.listJobs({ page: 1, unfiled: true }, controller.signal);
  await jobsApi.listPublicJobs({ page: 2, per_page: 12, search: "vase" }, controller.signal);
  await jobsApi.listAlbums(controller.signal);
  assert.equal(requests[0].url.searchParams.get("album"), "Client A");
  assert.equal(requests[0].url.searchParams.get("search"), "red vase");
  assert.equal(requests[0].url.searchParams.get("page"), "3");
  assert.equal(requests[0].url.searchParams.get("per_page"), "12");
  assert.equal(requests[1].url.searchParams.get("unfiled"), "true");
  assert.equal(requests[1].url.searchParams.has("album"), false);
  assert.equal(requests[2].url.pathname, "/v1/jobs/public");
  assert.equal(requests[3].url.pathname, "/v1/jobs/albums");
  for (const request of requests) assert.equal(request.options.signal, controller.signal);
});

test("late search responses cannot replace a newer query or leak another user's data", async () => {
  let state = null;
  let dependencies;
  let pendingEffect;
  let cleanup;
  const react = {
    useState: () => [state, (value) => { state = value; }],
    useEffect: (effect, deps) => {
      if (!dependencies || deps.some((dep, i) => dep !== dependencies[i])) {
        dependencies = deps;
        pendingEffect = effect;
      }
    },
  };
  const { useRemoteData: invokeHook } = loadModule("lib/use-remote-data.ts", { require: () => react });
  const render = (key, load) => {
    const result = invokeHook(key, load);
    if (pendingEffect) {
      cleanup?.();
      cleanup = pendingEffect();
      pendingEffect = null;
    }
    return result;
  };
  const waiting = [];
  const load = (signal) => new Promise((resolve) => waiting.push({ signal, resolve }));
  assert.equal(render("alice:old-search", load).loading, true);
  assert.equal(render("alice:new-search", load).loading, true);
  assert.equal(waiting[0].signal.aborted, true);
  waiting[1].resolve("new results");
  await Promise.resolve();
  waiting[0].resolve("stale results");
  await Promise.resolve();
  assert.equal(render("alice:new-search", load).data, "new results");
  assert.equal(render("bob:new-search", load).data, undefined);
  assert.equal(render(null, load).data, undefined);
  waiting[2].resolve("signed-out user data");
  await Promise.resolve();
  assert.equal(render(null, load).data, undefined);
});

test("polling covers queued automatic and manual runs, but stops at every terminal stage", () => {
  const { isJobActive, isPostProcessPending } = loadModule("lib/job-status.ts");
  const job = (status, auto, operationId) => ({
    status: "completed", generation_params: { auto_post_process: auto },
    pipeline_definition: [{ stage: 2, type: "post_process", status, operation_id: operationId }],
  });
  assert.equal(isJobActive(job("pending", true)), true);
  assert.equal(isPostProcessPending(job("pending", false, "queued-manual-run")), true);
  assert.equal(isJobActive(job("pending", false)), false);
  assert.equal(isJobActive(job("processing", false)), true);
  for (const stage of ["completed", "failed", "skipped"]) {
    assert.equal(isJobActive(job(stage, true, "run")), false, stage);
  }
  assert.equal(isJobActive({ ...job("pending", false), status: "processing" }), true);
});
