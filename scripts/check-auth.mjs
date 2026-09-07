import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  cacheDir: "node_modules/.vite-auth-tests",
  server: { middlewareMode: true },
  appType: "custom",
});
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalStorage = globalThis.localStorage;
const storage = new Map();
const key = "kafe-ceramik-admin-session";
globalThis.window = new EventTarget();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
try {
  const auth = await server.ssrLoadModule("/src/lib/supabase-rest.ts");
  auth.supabaseConfig.url = "https://test.invalid";
  auth.supabaseConfig.anonKey = "sb_publishable_test";
  const expired = { access_token: "expired", refresh_token: "refresh-one", expires_at: 1 };
  storage.set(key, JSON.stringify(expired));
  let rotations = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("grant_type=refresh_token")) {
      rotations += 1;
      return Response.json({
        access_token: "new-access",
        refresh_token: "refresh-two",
        expires_in: 3600,
      });
    }
    assert.equal(init.headers.Authorization, "Bearer new-access");
    assert.ok(init.signal);
    return Response.json([]);
  };
  await Promise.all([
    auth.selectRows("kafe_reservations", "", true),
    auth.selectRows("kafe_waiver_signatures", "", true),
  ]);
  assert.equal(rotations, 1);
  assert.equal(auth.readAdminSession().access_token, "new-access");
  console.log("OK concurrent panels refresh the session once");
  storage.set(key, JSON.stringify(expired));
  globalThis.fetch = async () => Response.json({ error: "invalid_grant" }, { status: 400 });
  await assert.rejects(auth.selectRows("kafe_reservations", "", true), /session/);
  assert.equal(auth.readAdminSession(), null);
  console.log("OK expired credentials return to sign-in");
  globalThis.fetch = async (url, init) => {
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.headers.apikey, "sb_publishable_test");
    return Response.json({});
  };
  await auth.uploadPublicFile(
    "kafe-guestbook",
    "submissions/test.png",
    new Blob(["test"], { type: "image/png" }),
  );
  console.log("OK public image upload uses opaque keys without invalid bearer JWT");
  auth.supabaseConfig.anonKey = "legacy-jwt";
  globalThis.fetch = async (url, init) => {
    assert.equal(init.headers.Authorization, "Bearer legacy-jwt");
    return Response.json({});
  };
  await auth.uploadPublicFile(
    "kafe-guestbook",
    "submissions/test.png",
    new Blob(["test"], { type: "image/png" }),
  );
  console.log("OK legacy image upload authorization preserved");
  console.log("4 authentication/upload checks passed; no network requests sent");
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
  await server.close();
}
