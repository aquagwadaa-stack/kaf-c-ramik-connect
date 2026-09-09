import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import path from "node:path";
const { PDFDocument, StandardFonts, rgb } = createRequire(import.meta.url)("pdf-lib");

const source = fs.readFileSync("supabase/functions/kafe-emails/index.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
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
let handler;
const ctx = vm.createContext({
  console,
  URL,
  Request,
  Response,
  Intl,
  crypto,
  TextEncoder,
  Uint8Array,
  btoa,
  StandardFonts,
  rgb,
  PDFDocument: {
    create: async () => {
      const pdf = await PDFDocument.create();
      const addPage = pdf.addPage.bind(pdf);
      pdf.addPage = (size) => {
        const page = addPage(Array.from(size));
        const drawLine = page.drawLine.bind(page);
        page.drawLine = (options) =>
          drawLine({ ...options, start: { ...options.start }, end: { ...options.end } });
        return page;
      };
      return pdf;
    },
  },
  Date: TestDate,
  exports: {},
  Deno: {
    env: {
      get: (key) =>
        ({
          SUPABASE_URL: "https://database.test.invalid",
          RESEND_API_KEY: "test",
          KAFE_EMAIL_FROM: "test@example.invalid",
          SUPABASE_SERVICE_ROLE_KEY: "service-test",
        })[key],
    },
    serve: (fn) => {
      handler = fn;
    },
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
    if (url.includes("kafe_settings")) return Response.json([{ value: settings }]);
    if (url.includes("kafe_reservations?")) {
      queries.push(url);
      return Response.json(rows);
    }
    throw new Error(`Unexpected mock request: ${url}`);
  },
});
const shared = ts.transpileModule(
  fs.readFileSync("supabase/functions/_shared/gift-validity.ts", "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText;
vm.runInContext(shared.replace(/^export /gm, ""), ctx);
vm.runInContext(outputText.replace(/^export \{\};?$/m, ""), ctx);
const settings = {
  manualConfirmationThreshold: 8,
  adminNotificationEmail: "team@example.invalid",
};
function row(patch = {}) {
  const r = {
    id: "test",
    date: "2026-09-15",
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
    row({ id: "already", date: "2026-09-08", value: { reminderEmailSentAt: "2026-09-07" } }),
  ];
  assert.equal(await ctx.processReminders(settings, "https://kafeceramik.fr"), 2);
  assert.match(queries[0], /status=eq.confirmed/);
  assert.match(sent[0].subject, /aujourd'hui/);
  assert.match(sent[1].subject, /demain/);
});
await run("short-notice confirmation sends the one reminder immediately", async () => {
  const booking = row({ date: "2026-09-08" });
  await ctx.reservationCreated(booking, settings, "https://kafeceramik.fr");
  assert.equal(sent.filter((mail) => mail.subject.startsWith("Rappel")).length, 1);
  await ctx.reservationCreated(booking, settings, "https://kafeceramik.fr");
  assert.equal(sent.length, 3);
});
await run("paid receipt after initial request sends once", async () => {
  const booking = row({
    people: 8,
    status: "deposit_paid",
    value: {
      depositPaid: true,
      reservationCreatedEmailSentAt: "2026-09-07",
      adminAlertEmailSentAt: "2026-09-07",
    },
  });
  await ctx.reservationCreated(booking, settings, "https://kafeceramik.fr");
  assert.equal(sent.length, 1);
  assert.match(sent[0].html, /reste en attente/);
  await ctx.reservationCreated(booking, settings, "https://kafeceramik.fr");
  assert.equal(sent.length, 1);
});
await run("wrong-state triggers cannot send misleading messages", async () => {
  await ctx.reservationCreated(row({ status: "cancelled" }), settings, "https://kafeceramik.fr");
  await ctx.reservationCancelled(row(), settings, "https://kafeceramik.fr");
  await ctx.groupDecision(row({ status: "pending" }), settings, "https://kafeceramik.fr", true, "");
  await ctx.sendReminder(
    row({ status: "pending", date: "2026-09-08" }),
    settings,
    "https://kafeceramik.fr",
  );
  assert.equal(sent.length, 0);
});
await run(
  "all preview templates use the real renderers without database writes or delivery",
  async () => {
    const suite = await ctx.buildEmailPreviewSuite(settings);
    assert.equal(suite.length, 19);
    assert.equal(sent.length, 0);
    assert.equal(values.size, 0);
    for (const mail of suite) {
      if (mail.key.startsWith("equipe")) {
        assert.match(mail.html, /Ouvrir les réservations/);
        assert.doesNotMatch(mail.html, /Accéder à ma réservation|guide de peinture/);
      }
      if (mail.key.includes("annulation") || mail.key.includes("refuse"))
        assert.doesNotMatch(mail.html, /Avant de venir|guide de peinture/);
      for (const attachment of mail.attachments) {
        const pdf = await PDFDocument.load(Buffer.from(attachment.content, "base64"));
        assert.equal(pdf.getPageCount(), 1);
      }
    }
    if (process.env.KAFE_PREVIEW_OUTPUT) {
      const folder = process.env.KAFE_PREVIEW_OUTPUT;
      fs.mkdirSync(folder, { recursive: true });
      for (const mail of suite) {
        fs.writeFileSync(path.join(folder, `${mail.key}.html`), mail.html);
        for (const attachment of mail.attachments)
          fs.writeFileSync(
            path.join(folder, `${mail.key}-${attachment.filename}`),
            Buffer.from(attachment.content, "base64"),
          );
      }
      fs.writeFileSync(
        path.join(folder, "index.json"),
        JSON.stringify(
          suite.map(({ key, subject }) => ({ key, subject })),
          null,
          2,
        ),
      );
    }
  },
);
await run("preview endpoint denies public callers and restricts the recipient", async () => {
  const call = (auth, body) =>
    handler(
      new Request("https://function.example.invalid", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  assert.equal(
    (await call("Bearer anon", { action: "send-preview", previewKey: "client-annulation" })).status,
    401,
  );
  const result = await call("Bearer service-test", {
    action: "send-preview",
    previewKey: "client-annulation",
    to: "outsider@example.invalid",
  });
  assert.equal(result.status, 200);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["gwada.web.studio@gmail.com"]);
  assert.match(sent[0].subject, /TEST Kafé/);
});
await run("gift PDF handles long names, accented text and unsupported symbols", async () => {
  const attachment = await ctx.createGiftCardPdf({
    code: "TEST",
    amount: 35.5,
    expires_at: "2027-03-09T03:59:59.999Z",
    value: {
      recipientName: "Élodie ".repeat(12),
      senderName: "François 🎁",
      message: "Joyeux anniversaire 🎨 " + "A".repeat(160),
    },
  });
  assert.equal(
    (await PDFDocument.load(Buffer.from(attachment.content, "base64"))).getPageCount(),
    1,
  );
});
await run("PDF attachments are identical across retries", async () => {
  const first = await ctx.buildEmailPreviewSuite(settings);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const retry = await ctx.buildEmailPreviewSuite(settings);
  assert.equal(
    JSON.stringify(first.map((mail) => mail.attachments)),
    JSON.stringify(retry.map((mail) => mail.attachments)),
  );
});
console.log("14 email checks passed; no message sent and no provider contacted");
