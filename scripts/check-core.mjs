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
  check("Deposit only for ceramic groups from ten people", () => {
    assert.equal(rules.getDepositAmount(9, settings, "cafe_atelier"), 0);
    assert.equal(rules.getDepositAmount(10, settings, "cafe_atelier"), 100);
    assert.equal(rules.getDepositAmount(10, settings, "brunch_atelier"), 0);
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
    assert.equal(at(busy, "11:30", 2, "carbet").unitId, "carbet-1");
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
  console.log(`${passed} core checks passed`);
} finally {
  await server.close();
}
