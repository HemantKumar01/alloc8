import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTimestampIST } from "./bookingTimestamp.js";

test("IST timestamps convert UTC across midnight and year boundaries", () => {
  assert.equal(formatTimestampIST(new Date("2026-12-31T18:30:00.123Z")), "2027-01-01 00:00:00.123 IST");
  assert.equal(formatTimestampIST(new Date("2026-11-03T10:05:09.000Z")), "2026-11-03 15:35:09.000 IST");
});
