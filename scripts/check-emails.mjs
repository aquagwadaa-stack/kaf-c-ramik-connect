import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("supabase/functions/kafe-emails/index.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  transformers: {
    before: [
      (context) => (root) =>
        ts.visitNode(root, function visit(node) {
          return ts.isImportDeclaration(node) ? undefined : ts.visitEachChild(node, visit, context);
        }),
    ],
  },
});
const now = Date.parse("2026-09-07T18:00:00Z");
class TestDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [now]));
  }
  static now() {
    return now;
  }
}
let sent = [],
  rows = [],
  queries = [];
const values = new Map();
const ctx = vm.createContext({
  console,
  URL,
  Request,
  Response,
  Intl,
  Date: TestDate,
  exports: {},
  Deno: {
    env: {
      get: (key) =>
        ({
          SUPABASE_URL: "https://database.test.invalid",
          RESEND_API_KEY: "test",
          KAFE_EMAIL_FROM: "test@example.invalid",
        })[key],
    },
    serve: () => {},
  },
  fetch: async (url, init = {}) => {
    if (url === "https://api.resend.com/emails") {
      sent.push(JSON.parse(init.body));
      return Response.json({ id: "simulated" });
    }
    if (url.includes("/rpc/mark_kafe_reservation_email")) {
      const { p_id, p_patch } = JSON.parse(init.body);
      const value = { ...values.get(p_id), ...p_patch };
      values.set(p_id, value);
      return Response.json(value);
    }
    if (url.includes("kafe_admin_profiles")) return Response.json([]);
    if (url.includes("kafe_reservations?")) {
      queries.push(url);
      return Response.json(rows);
    }
    throw new Error(`Unexpected mock request: ${url}`);
  },
});
vm.runInContext(outputText.replace(/^export \{\};?$/m, ""), ctx);
const settings = {
  manualConfirmationThreshold: 10,
  adminNotificationEmail: "team@example.invalid",
};
function row(patch = {}) {
  const r = {
    id: "test",
    date: "2026-09-08",
    slot: "10:30",
    people: 2,
    status: "confirmed",
    ...patch,
  };
  r.value = {
    firstName: "Audit <local>",
    lastName: "Test",
    email: "test@example.invalid",
    experience: "cafe_atelier",
    managementToken: "local-token",
    ...r,
    ...patch.value,
  };
  values.set(r.id, r.value);
  return r;
}
async function run(name, action) {
  sent = [];
  queries = [];
  values.clear();
  await action();
  console.log(`OK ${name}`);
}
await run("confirmation includes portal and guide with escaped names", async () => {
  await ctx.reservationCreated(row(), settings, "https://kafeceramik.fr");
  assert.match(sent[0].html, /Accéder à ma réservation/);
  assert.match(sent[0].html, /guide de peinture/);
  assert.match(sent[0].html, /Audit &lt;local&gt;/);
  assert.equal(sent.length, 2);
});
await run("brunch confirmation has no ceramic guide", async () => {
  await ctx.reservationCreated(
    row({ value: { experience: "brunch_atelier" } }),
    settings,
    "https://kafeceramik.fr",
  );
  assert.doesNotMatch(sent[0].html, /guide de peinture/);
  assert.match(sent[0].html, /brunch/);
});
await run("group request is not presented as confirmed", async () => {
  await ctx.reservationCreated(
    row({ people: 10, status: "pending" }),
    settings,
    "https://kafeceramik.fr",
  );
  assert.match(sent[0].html, /après validation/);
  assert.match(sent[0].html, /100/);
});
await run("cancellation omits all before-visit guide reminders", async () => {
  await ctx.reservationCancelled(row({ status: "cancelled" }), settings, "https://kafeceramik.fr");
  assert.equal(sent.length, 2);
  for (const mail of sent) assert.doesNotMatch(mail.html, /Avant de venir|guide de peinture/);
});
await run("group refusal escapes optional reason and omits guide", async () => {
  await ctx.groupDecision(
    row({ people: 10, status: "cancelled" }),
    settings,
    "https://kafeceramik.fr",
    false,
    "Complet <test>",
  );
  assert.match(sent[0].html, /Complet &lt;test&gt;/);
  assert.doesNotMatch(sent[0].html, /guide de peinture/);
});
await run("group approval includes confirmed booking portal", async () => {
  await ctx.groupDecision(
    row({ people: 10, status: "confirmed", value: { depositPaid: true } }),
    settings,
    "https://kafeceramik.fr",
    true,
    "",
  );
  assert.match(sent[0].html, /demande de groupe est <strong>validée/);
  assert.match(sent[0].html, /Accéder à ma réservation/);
});
await run("reminders use confirmed filter, 24h window, local day and sent marker", async () => {
  rows = [
    row({ id: "today", date: "2026-09-07", slot: "16:00" }),
    row({ id: "tomorrow", date: "2026-09-08", slot: "10:30" }),
    row({ id: "later", date: "2026-09-08", slot: "16:00" }),
    row({ id: "already", value: { reminderEmailSentAt: "2026-09-07" } }),
  ];
  assert.equal(await ctx.processReminders(settings, "https://kafeceramik.fr"), 2);
  assert.match(queries[0], /status=eq.confirmed/);
  assert.match(sent[0].subject, /aujourd'hui/);
  assert.match(sent[1].subject, /demain/);
});
console.log("7 email checks passed; no message sent and no provider contacted");
