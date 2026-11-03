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

for (const occupancy of [1, 2]) {
  test(`roommates for occupancy ${occupancy} include only students with the same full room ID`, async () => {
    const student = {
      rollnum: "2301cs99", name: "Current student", allocated: true,
      room: "KalamB-401-btech23", hostel: "Kalam", roomnum: "401", occupancy,
    };
    const sameRoom = { ...student, rollnum: "2301cs98", name: "Same room" };
    const otherBlock = {
      ...student, rollnum: "2301cs97", name: "Other block", room: "KalamC-401-btech23",
    };
    const otherBatch = {
      ...student, rollnum: "2401cs99", name: "Other batch", room: "KalamB-401-btech24",
    };
    const occupants = occupancy === 1 ? [student] : [student, sameRoom];
    const allStudents = [...occupants, otherBlock, otherBatch];
    database.students.findUnique = async () => student;
    database.students.findMany = async ({ where, select }) => allStudents
      .filter(record => Object.entries(where).every(([key, value]) => record[key] === value))
      .map(record => Object.fromEntries(Object.keys(select).map(key => [key, record[key]])));
    database.rooms.findUnique = async () => ({ roomId: student.room, roommateCode: null });

    const res = response();
    await controller.showDetails({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.roommates, occupants.map(({ rollnum, name }) => ({ rollnum, name })));
  });
}
