import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../supabase/functions/sumup-checkout/index.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
for (const current of ["pending", "cancelled", "confirmed", "arrived"]) {
  const changes = [];
  let emails = 0;
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
        return Response.json({ ok: true });
      }
      if (path.includes("/kafe_reservations?") && !init.method)
        return Response.json([{ id: "test", status: current, value: { depositPaid: false } }]);
      if (path.includes("/rpc/apply_kafe_deposit_payment")) {
        const first = changes.length === 0;
        const result = {
          changed: first,
          status: current === "pending" ? "deposit_paid" : current,
          value: { depositPaid: true, refundRequired: current === "cancelled" },
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
  vm.runInContext(compiled, context);
  await vm.runInContext(
    `processReservationPayment({id:'checkout-test',status:'PAID',amount:100},{reservation_id:'test'})`,
    context,
  );
  assert.equal(changes[0].p_status, "PAID");
  assert.equal(changes[0].p_checkout_id, "checkout-test");
  if (current === "cancelled") {
    assert.equal(emails, 0);
  }
  const firstEmails = emails;
  await vm.runInContext(
    `processReservationPayment({id:'checkout-test',status:'PAID',amount:100},{reservation_id:'test'})`,
    context,
  );
  assert.equal(emails, firstEmails);
  console.log(`OK paid webhook preserves ${current} booking state`);
}
console.log("4 payment-state checks passed; no SumUp call or real payment");
