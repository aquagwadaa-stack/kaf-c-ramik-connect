import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("supabase/functions/sumup-checkout/index.ts", "utf8");
const compiled = ts
  .transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  .outputText.replace(/^import .*;$/gm, "");
let handler,
  order,
  checkout,
  providerCalls = 0,
  notifications = 0,
  emails = 0,
  emailFails = false;
const settings = {
  giftCardPaymentsEnabled: true,
  giftCardCustomMin: 20,
  giftCardValidityMonths: 6,
};
const ctx = vm.createContext({
  console: { log() {}, error() {} },
  Response,
  Request,
  Headers,
  URL,
  Date,
  JSON,
  crypto,
  AbortSignal,
  giftExpiryFromPurchase: () => "2027-03-10T23:59:59-04:00",
  Deno: {
    env: {
      get: (key) =>
        ({
          SUPABASE_URL: "https://db.invalid",
          SUMUP_SERVICE_ROLE_KEY: "test",
          SUMUP_API_KEY: "test-secret",
          SUMUP_MERCHANT_CODE: "TEST",
        })[key],
    },
    serve: (fn) => {
      handler = fn;
    },
  },
  fetch: async (url, init = {}) => {
    const path = String(url);
    const body = init.body ? JSON.parse(init.body) : {};
    if (path.startsWith("https://api.sumup.com")) {
      providerCalls++;
      if (init.method === "POST")
        checkout = {
          id: "checkout-test",
          ...body,
          status: "PENDING",
          hosted_checkout_url: "https://checkout.sumup.com/pay/test",
        };
      return Response.json(checkout);
    }
    if (path.includes("kafe_settings")) return Response.json([{ value: settings }]);
    if (path.includes("/rpc/apply_kafe_gift_payment")) {
      assert.equal(body.p_amount, order.amount);
      const firstPaid = order.status !== "paid" && body.p_status === "PAID";
      if (order.status !== "paid") {
        order.status = body.p_status.toLowerCase();
        order.value.status = order.status;
        if (firstPaid) {
          order.expires_at = body.p_expires_at;
          order.value.paidAt = new Date().toISOString();
        }
      }
      return Response.json({ firstPaid, order });
    }
    if (path.includes("kafe_gift_card_orders")) {
      if (init.method === "POST") order = structuredClone(body);
      else if (init.method === "PATCH") Object.assign(order, body);
      else return Response.json(order ? [order] : []);
    } else if (path.includes("kafe_payments")) return Response.json([]);
    else if (path.includes("kafe_admin_notifications")) notifications++;
    else if (path.includes("/kafe-emails")) {
      emails++;
      return Response.json({ delivered: !emailFails }, { status: emailFails ? 503 : 200 });
    } else throw new Error(`Unexpected request: ${path}`);
    return new Response(null, { status: 204 });
  },
});
vm.runInContext(compiled, ctx);
const call = (body) =>
  handler(new Request("https://edge.invalid", { method: "POST", body: JSON.stringify(body) }));
const valid = {
  action: "create-gift",
  amount: 42.5,
  recipientName: "Test recipient",
  recipientEmail: "test@example.invalid",
  senderName: "Test sender",
};
for (const patch of [
  { amount: 19 },
  { amount: 20.001 },
  { recipientEmail: "bad" },
  { recipientName: "" },
]) {
  assert.equal((await call({ ...valid, ...patch })).status, 400);
}
assert.equal(providerCalls, 0);
console.log("OK gift validation prevents invalid provider requests");
const result = await (await call(valid)).json();
assert.equal(result.configured, true);
assert.equal(checkout.amount, 42.5);
assert.equal(order.amount, 42.5);
assert.ok(checkout.checkout_reference.length <= 64);
assert.equal(checkout.redirect_url.startsWith("https://kafeceramik.fr/cadeau?giftToken="), true);
assert.equal(emails, 0);
console.log("OK custom amount creates an unpaid checkout without sending a PDF");
const webhook = { event_type: "CHECKOUT_STATUS_CHANGED", id: checkout.id };
checkout.status = "PAID";
checkout.amount = 20;
assert.equal((await call(webhook)).status, 500);
assert.equal(order.status, "pending");
checkout.amount = 42.5;
checkout.merchant_code = "OTHER";
assert.equal((await call(webhook)).status, 500);
assert.equal(emails, 0);
checkout.merchant_code = "TEST";
emailFails = true;
assert.equal((await call(webhook)).status, 500);
assert.equal(order.status, "paid");
emailFails = false;
assert.equal((await call(webhook)).status, 200);
assert.equal(notifications, 1);
assert.equal(emails, 2);
const expiry = order.expires_at;
checkout.status = "PENDING";
assert.equal((await call(webhook)).status, 200);
assert.equal(order.status, "paid");
assert.equal(order.expires_at, expiry);
console.log("OK mismatched payments rejected; email retry and paid state preserved");
const status = await (
  await call({ action: "gift-status", managementToken: order.management_token })
).json();
assert.equal(status.order.status, "paid");
assert.equal(status.order.expiresAt, expiry);
assert.equal((await call({ action: "mark-paid" })).status, 400);
console.log("OK return status reconciles with SumUp; clients cannot mark orders paid");
console.log("Gift payment checks passed; provider/database/email entirely simulated");
