import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  cacheDir: "node_modules/.vite-core-tests",
  server: { middlewareMode: true },
  appType: "custom",
});
let passed = 0;
function check(name, run) {
  run();
  passed += 1;
  console.log(`OK ${name}`);
}
try {
  const rules = await server.ssrLoadModule("/src/lib/reservations.ts");
  const { settingsSeed } = await server.ssrLoadModule("/src/lib/admin-data.ts");
  const time = await server.ssrLoadModule("/src/lib/kafe-time.ts");
  const settings = structuredClone(settingsSeed);
  const date = "2026-09-15";
  const at = (reservations, slot, people, zone = "indifferent", config = settings) =>
    rules.getSlotPlacement(reservations, [], date, slot, people, config, zone);
  const reservation = (id, slot, people, unit, status = "confirmed") => ({
    id,
    date,
    slot,
    people,
    seatingUnitId: unit,
    status,
  });
  check("Guadeloupe date remains previous day at midnight UTC", () => {
    assert.equal(time.getKafeDate(new Date("2026-09-08T02:00:00Z")), "2026-09-07");
    assert.equal(time.getKafeTime(new Date("2026-09-08T02:00:00Z")), "22:00");
  });
  check("Month and year transitions", () => {
    assert.equal(time.addIsoDays("2026-12-31", 1), "2027-01-01");
  });
  check("Deposit and approval only for ceramic groups from eight people", () => {
    assert.equal(rules.getDepositAmount(7, settings, "cafe_atelier"), 0);
    assert.equal(rules.getDepositAmount(8, settings, "cafe_atelier"), 100);
    assert.equal(rules.getDepositAmount(9, settings, "cafe_atelier"), 100);
    assert.equal(rules.getDepositAmount(10, settings, "cafe_atelier"), 100);
    assert.equal(rules.getDepositAmount(10, settings, "brunch_atelier"), 0);
    assert.equal(rules.shouldWaitForManualConfirmation(7, "cafe_atelier", settings), false);
    assert.equal(rules.shouldWaitForManualConfirmation(8, "cafe_atelier", settings), true);
  });
  check("Brunch does not request guide or team approval", () => {
    assert.equal(rules.experienceUsesCeramicGuide("brunch_atelier"), false);
    assert.equal(rules.shouldWaitForManualConfirmation(10, "brunch_atelier", settings), false);
  });
  check("Sixty seats across thirteen units", () => {
    const available = rules.getSeatingAvailability([], [], date, "09:30", settings);
    assert.equal(available.totalRemaining, 60);
    assert.equal(available.units.length, 13);
  });
  check("Two guests use a two-seat unit, five use a picnic table", () => {
    assert.match(at([], "09:30", 2).unitId, /(?:table-2|salon-2)-/);
    assert.match(at([], "09:30", 5).unitId, /pique-nique-/);
  });
  check("Zone preference is respected", () => {
    assert.equal(at([], "09:30", 2, "carbet").unitId, "carbet-1");
    assert.equal(at([], "09:30", 5, "interieur").unitId, null);
  });
  check("Overlapping slots occupy the same physical table", () => {
    const busy = [reservation("one", "09:30", 12, "carbet-1")];
    assert.equal(at(busy, "10:30", 2, "carbet").unitId, null);
    assert.equal(at(busy, "11:30", 2, "carbet").unitId, null);
    assert.equal(at(busy, "12:29", 2, "carbet").unitId, null);
    assert.equal(at(busy, "12:30", 2, "carbet").unitId, "carbet-1");
    assert.equal(
      at(busy, "11:30", 2, "carbet", { ...settings, slotDurationMinutes: 120 }).unitId,
      "carbet-1",
    );
  });
  check("Weekly occupancy starts at arrival and ends exactly three hours later", () => {
    const busy = [reservation("morning", "11:00", 2, "table-2-1")];
    for (const [slot, remaining] of [
      ["09:30", 60],
      ["10:30", 60],
      ["11:00", 58],
      ["13:30", 58],
      ["14:00", 60],
    ]) {
      assert.equal(
        rules.getSeatingAvailabilityAtTime(busy, [], date, slot, settings).totalRemaining,
        remaining,
        slot,
      );
    }
  });
  check("A new stay still checks the full interval, including future arrivals", () => {
    const busy = [reservation("morning", "11:00", 2, "table-2-1")];
    assert.equal(at(busy, "08:00", 2).totalRemaining, 60);
    assert.equal(at(busy, "09:30", 2).totalRemaining, 58);
    assert.equal(at(busy, "13:30", 2).totalRemaining, 58);
    assert.equal(at(busy, "14:00", 2).totalRemaining, 60);
  });
  check("Instant occupancy respects the configurable duration", () => {
    const busy = [reservation("morning", "09:30", 2, "table-2-1")];
    for (const [minutes, lastOccupied, firstFree] of [
      [120, "11:29", "11:30"],
      [180, "12:29", "12:30"],
      [240, "13:29", "13:30"],
    ]) {
      const config = { ...settings, slotDurationMinutes: minutes };
      assert.equal(
        rules.getSeatingAvailabilityAtTime(busy, [], date, lastOccupied, config).totalRemaining,
        58,
      );
      assert.equal(
        rules.getSeatingAvailabilityAtTime(busy, [], date, firstFree, config).totalRemaining,
        60,
      );
    }
  });
  check("Instant occupancy deduplicates remote rows and ignores cancelled bookings", () => {
    const remote = [
      { reservation_id: "morning", date, slot: "11:00", people: 2, seating_unit_id: "table-2-1" },
    ];
    const busy = [reservation("morning", "11:00", 2, "table-2-1")];
    assert.equal(
      rules.getSeatingAvailabilityAtTime([], remote, date, "10:30", settings).totalRemaining,
      60,
    );
    assert.equal(
      rules.getSeatingAvailabilityAtTime([], remote, date, "11:00", settings).totalRemaining,
      58,
    );
    assert.equal(
      rules.getSeatingAvailabilityAtTime(busy, remote, date, "11:00", settings).totalRemaining,
      58,
    );
    assert.equal(
      rules.getSeatingAvailabilityAtTime(
        [{ ...busy[0], status: "cancelled" }],
        remote,
        date,
        "11:00",
        settings,
      ).totalRemaining,
      60,
    );
    assert.equal(
      rules.getSeatingAvailabilityAtTime([], remote, date, "14:00", settings).totalRemaining,
      60,
    );
  });
  check("Cancelled bookings release capacity", () => {
    assert.equal(
      at([reservation("one", "09:30", 12, "carbet-1", "cancelled")], "09:30", 2, "carbet").unitId,
      "carbet-1",
    );
  });
  check("Scattered seats cannot accommodate a party of two", () => {
    const config = {
      ...settings,
      seatingAreas: [{ id: "two", label: "Table", quantity: 2, capacity: 2, zone: "interieur" }],
    };
    const busy = [reservation("a", "09:30", 1, "two-1"), reservation("b", "09:30", 1, "two-2")];
    assert.equal(at(busy, "09:30", 2, "indifferent", config).unitId, null);
  });
  check("Group of ten may use two five-seat tables", () => {
    const config = {
      ...settings,
      seatingAreas: [{ id: "five", label: "Table", quantity: 2, capacity: 5, zone: "exterieur" }],
    };
    assert.equal(at([], "09:30", 10, "indifferent", config).allocations.length, 2);
  });
  check("Remote split allocations are counted once each", () => {
    const occupancy = ["pique-nique-1", "pique-nique-2"].map((unit) => ({
      reservation_id: "group",
      date,
      slot: "09:30",
      people: 5,
      seating_unit_id: unit,
    }));
    assert.equal(
      rules.getSeatingAvailability([], occupancy, date, "09:30", settings).totalRemaining,
      50,
    );
  });
  check("Calendar obeys closure and configurable cadence", () => {
    assert.equal(rules.getSlotsForDate("2026-09-14", settings).length, 0);
    assert.equal(rules.getSlotsForDate(date, settings).length, 8);
    assert.equal(rules.getSlotsForDate(date, { ...settings, slotIntervalMinutes: 30 }).length, 15);
  });
  const hours = await server.ssrLoadModule("/src/lib/opening-hours.ts");
  check("Occupancy duration does not change cafe closing time", () => {
    assert.equal(hours.getPublicSchedule(settings).hours, "9h30 – 18h30");
    assert.equal(
      hours.getPublicSchedule({ ...settings, slotDurationMinutes: 240 }).hours,
      "9h30 – 18h30",
    );
  });
  const gifts = await server.ssrLoadModule("/supabase/functions/_shared/gift-validity.ts");
  check("Gift validity is six calendar months through the local final day", () => {
    assert.equal(
      gifts.giftExpiryFromPurchase("2026-08-31T12:00:00Z", 6),
      "2027-03-01T03:59:59.999Z",
    );
    assert.equal(gifts.formatGiftExpiry("2027-03-01T03:59:59.999Z"), "28/02/2027");
    assert.equal(
      gifts.formatGiftExpiry(gifts.giftExpiryFromPurchase("2027-08-31T12:00:00Z", 6)),
      "29/02/2028",
    );
    assert.equal(
      gifts.formatGiftExpiry(gifts.giftExpiryFromPurchase("2026-09-09T02:00:00Z", 6)),
      "08/03/2027",
    );
  });
  check("Only paid cards with unexpired dates are valid", () => {
    const order = { status: "paid", expiresAt: "2027-03-09T03:59:59.999Z" };
    assert.equal(gifts.giftIsValid(order, new Date("2027-03-09T03:59:59Z")), true);
    assert.equal(gifts.giftIsValid(order, new Date("2027-03-09T04:00:00Z")), false);
    assert.equal(gifts.giftIsValid({ ...order, status: "pending" }, new Date("2026-09-08")), false);
    assert.equal(gifts.giftIsValid({ status: "paid" }), false);
  });
  const giftAdmin = await server.ssrLoadModule("/src/lib/gift-cards.ts");
  check("Gift admin query filters all paid valid cards and supports pagination", () => {
    const query = new URLSearchParams(
      giftAdmin.giftOrdersQuery(true, "Camille", 100, new Date("2026-09-09")),
    );
    assert.equal(query.get("status"), "eq.paid");
    assert.equal(query.get("expires_at"), "gte.2026-09-09T00:00:00.000Z");
    assert.equal(query.get("offset"), "100");
    assert.match(query.get("or"), /recipientName/);
    assert.equal(new URLSearchParams(giftAdmin.giftOrdersQuery(false, "", 0)).has("status"), false);
  });
  console.log(`${passed} core checks passed`);
} finally {
  await server.close();
}
