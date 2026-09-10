import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../supabase/functions/sumup-checkout/index.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
for (const current of ["pending", "unapproved", "cancelled", "confirmed", "arrived"]) {
  const changes = [];
  let emails = 0;
  let emailSent = false;
  const runWebhook = `processReservationPayment({id:'checkout-test',checkout_reference:'ref',merchant_code:'test-only',currency:'EUR',status:'PAID',amount:100},{reservation_id:'test',provider_checkout_id:'checkout-test',checkout_reference:'ref',currency:'EUR',amount:100})`;
  const context = vm.createContext({
    console,
    Response,
    Headers,
    URL,
    Date,
    JSON,
    fetch: async (url, init = {}) => {
      const path = String(url);
      if (path.includes("/functions/v1/kafe-emails")) {
        emails++;
        emailSent = true;
        return Response.json({ ok: true, delivered: true });
      }
      if (path.includes("/kafe_reservations?") && !init.method)
        return Response.json([{ id: "test", status: current, value: { depositPaid: false } }]);
      if (path.includes("/rpc/apply_kafe_deposit_payment")) {
        const first = changes.length === 0;
        const result = {
          changed: first,
          status:
            current === "pending"
              ? "confirmed"
              : current === "unapproved"
                ? "deposit_paid"
                : current,
          value: {
            depositPaid: true,
            refundRequired: current === "cancelled",
            decisionEmailSentAt: emailSent ? "sent" : undefined,
          },
        };
        changes.push(JSON.parse(init.body));
        return Response.json(result);
      }
      if (path.includes("/kafe_reservations?") && init.method === "PATCH")
        throw new Error("Payment must use atomic RPC, not a stale booking snapshot");
      return new Response(null, { status: 204 });
    },
    Deno: {
      env: { get: (key) => (key === "SUPABASE_URL" ? "https://test.invalid" : "test-only") },
      serve: () => {},
    },
  });
  vm.runInContext(compiled.replace(/^import .*;$/gm, ""), context);
  await vm.runInContext(runWebhook, context);
  assert.equal(changes[0].p_status, "PAID");
  assert.equal(changes[0].p_checkout_id, "checkout-test");
  if (current === "cancelled") {
    assert.equal(emails, 0);
  }
  const firstEmails = emails;
  await vm.runInContext(runWebhook, context);
  assert.equal(emails, firstEmails);
  console.log(`OK paid webhook preserves ${current} booking state`);
}
console.log("5 payment-state checks passed; no SumUp call or real payment");

let booking = {
  id: "test",
  status: "pending",
  value: { date: "2099-09-10", slot: "10:00", depositRequired: true, depositAmount: 100 },
};
let providerCalls = 0,
  storedPayment;
const createContext = vm.createContext({
  console,
  Response,
  Headers,
  URL,
  Date,
  JSON,
  crypto,
  TextEncoder,
  Uint8Array,
  AbortSignal,
  fetch: async (url, init = {}) => {
    const path = String(url);
    if (path.includes("api.sumup.com")) {
      providerCalls++;
      const request = JSON.parse(init.body);
      assert.equal(request.amount, 100);
      assert.ok(request.checkout_reference.length <= 64);
      assert.match(request.redirect_url, /payment=return/);
      return Response.json({
        ...request,
        id: "new-checkout",
        status: "PENDING",
        hosted_checkout_url: "https://checkout.sumup.com/pay/test",
      });
    }
    if (path.includes("kafe_settings"))
      return Response.json([{ value: { sumupPaymentsEnabled: true } }]);
    if (path.includes("kafe_reservations")) return Response.json([booking]);
    if (path.includes("kafe_payments")) {
      if (init.method === "POST") {
        storedPayment = JSON.parse(init.body);
        return new Response(null, { status: 204 });
      }
      return Response.json(storedPayment ? [storedPayment] : []);
    }
    throw new Error(path);
  },
  Deno: {
    env: { get: (key) => (key === "SUPABASE_URL" ? "https://test.invalid" : "test-only") },
    serve() {},
  },
});
vm.runInContext(compiled.replace(/^import .*;$/gm, ""), createContext);
const createCheckout = () =>
  vm.runInContext(`createReservationCheckout('token','https://kafeceramik.fr')`, createContext);
assert.equal((await createCheckout()).status, 409);
assert.equal(providerCalls, 0);
booking.value.groupApprovedAt = "2099-09-01";
assert.equal((await (await createCheckout()).json()).configured, true);
assert.equal(providerCalls, 1);
await createCheckout();
assert.equal(providerCalls, 1, "Repeated click reuses the same checkout");
booking.status = "cancelled";
assert.equal((await createCheckout()).status, 409);
booking.status = "pending";
booking.value.date = "2020-01-01";
assert.equal((await createCheckout()).status, 409);
assert.equal(providerCalls, 1);
console.log("OK approval-first, fixed amount, repeated clicks, cancellation and past-slot checks");
