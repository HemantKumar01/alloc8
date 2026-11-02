import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Test the controller without connecting to MongoDB or Redis.
const database = { students: {}, rooms: {} };
mock.module("@prisma/client", {
  namedExports: { PrismaClient: class { constructor() { return database; } } },
});
mock.module("ioredis", { defaultExport: class {} });
const { default: controller } = await import("./nonfresherController.js");

function response() {
  return {
    locals: { rollNumber: "2301cs99" },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("a student with no booking receives an explicit NO_ALLOCATION response", async () => {
  database.students.findUnique = async () => null;
  database.rooms.findUnique = mock.fn();
  const res = response();
  await controller.showDetails({}, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, "NO_ALLOCATION");
  assert.equal(database.rooms.findUnique.mock.callCount(), 0);
});

test("an unallocated student does not trigger a room lookup", async () => {
  database.students.findUnique = async () => ({ allocated: false, room: "" });
  database.rooms.findUnique = mock.fn();
  const res = response();
  await controller.showDetails({}, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, "NO_ALLOCATION");
  assert.equal(database.rooms.findUnique.mock.callCount(), 0);
});

test("a booked student receives the existing room ID used for the success redirect", async () => {
  database.students.findUnique = async () => ({
    allocated: true, room: "KalamB-401-btech23", hostel: "Kalam", roomnum: "401", occupancy: 2,
  });
  database.students.findMany = async () => [];
  database.rooms.findUnique = async () => ({ roomId: "KalamB-401-btech23", roommateCode: null });
  const res = response();
  await controller.showDetails({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.room, "KalamB-401-btech23");
  assert.equal(res.body.roomNum, "401");
});

test("a missing booked room is a server error, not permission to book another room", async () => {
  database.students.findUnique = async () => ({ allocated: true, room: "missing" });
  database.rooms.findUnique = async () => null;
  const res = response();
  await controller.showDetails({}, res);
  assert.equal(res.statusCode, 500);
  assert.notEqual(res.body.code, "NO_ALLOCATION");
});
