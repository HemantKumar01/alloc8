import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequestAudit, createStepLogger, formatTimestampIST } from "./formLogging.js";

const sessionId = "b9a8f4c0-a2b3-4c5d-8e9f-001122334455";
const eventId = "c9a8f4c0-a2b3-4c5d-8e9f-001122334455";
function response() {
  return Object.assign(new EventEmitter(), {
    locals: { rollNumber: "2301cs99", batch: "btech23", gender: "male" },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
}
const request = body => ({ body, get: () => sessionId });

test("IST timestamps convert UTC across midnight and year boundaries", () => {
  assert.equal(formatTimestampIST(new Date("2026-12-31T18:30:00.123Z")), "2027-01-01 00:00:00.123 IST");
  assert.equal(formatTimestampIST(new Date("2026-11-03T10:05:09.000Z")), "2026-11-03 15:35:09.000 IST");
});

test("step logs trust authenticated identity and server time and exclude secrets", async () => {
  const upsert = mock.fn(async () => ({}));
  const log = createStepLogger({ formLogs: { upsert } });
  const body = {
    eventId, event: "room_selected", step: "room", sequence: 3,
    rollnum: "someone-else", source: "server", timestampIST: "forged",
    details: { roomId: "KalamB-401-btech23", roommateCode: "secret", token: "secret", floor: "4" },
  };
  const res = response();
  await log(request(body), res);
  await log(request(body), response());
  assert.equal(res.statusCode, 201);
  const { create, where, update } = upsert.mock.calls[0].arguments[0];
  assert.equal(create.rollnum, "2301cs99");
  assert.equal(create.source, "client");
  assert.equal(create.sessionId, sessionId);
  assert.deepEqual(create.details, { floor: "4", roomId: "KalamB-401-btech23" });
  assert.equal(create.timestampIST, formatTimestampIST(create.createdAt));
  assert.deepEqual(where, { rollnum_eventId: { rollnum: "2301cs99", eventId } });
  assert.deepEqual(where, upsert.mock.calls[1].arguments[0].where);
  assert.deepEqual(update, {});
});

test("invalid or forged authoritative events are rejected without a database write", async () => {
  const upsert = mock.fn();
  const log = createStepLogger({ formLogs: { upsert } });
  for (const overrides of [
    { event: "booking_succeeded" }, { event: "toString" }, { step: "unknown" },
    { eventId: "invalid" }, { sequence: -1 }, { sequence: 1.5 }, { sequence: 2147483648 },
  ]) {
    const res = response();
    await log(request({ eventId, event: "step_viewed", step: "room", sequence: 1, ...overrides }), res);
    assert.equal(res.statusCode, 422);
  }
  assert.equal(upsert.mock.callCount(), 0);
});

test("request audit records unsuccessful outcomes without including roommate codes", async () => {
  const create = mock.fn(async () => ({}));
  const audit = createRequestAudit({ formLogs: { create } }, "booking", "room");
  const res = response();
  const next = mock.fn();
  await audit(request({ roomId: "room-1", roommateCode: "secret" }), res, next);
  assert.equal(next.mock.callCount(), 1);
  res.status(400).emit("finish");
  const records = create.mock.calls.map(call => call.arguments[0].data);
  assert.deepEqual(records.map(record => record.event), ["booking_started", "booking_failed"]);
  assert.equal(records[1].details.statusCode, 400);
  assert.equal(records[1].details.roomId, "room-1");
  assert.equal(JSON.stringify(records).includes("secret"), false);
});

test("step log storage failures return a retryable response", async () => {
  const log = createStepLogger({ formLogs: { upsert: async () => { throw new Error("offline"); } } });
  const res = response();
  await log(request({ eventId, event: "step_viewed", step: "hostel", sequence: 1 }), res);
  assert.equal(res.statusCode, 503);
});
