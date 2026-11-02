import test from "node:test";
import assert from "node:assert/strict";
import { buildHostelOptions, buildRoomFilter } from "./roomSelection.mjs";

const allocation = {
  btech23: { male: { hostels: {
    Kalam: { D: ["001-007", "101-136"], C: ["101-121", "701-715", "717-721"], B: ["401-421", "701-721"] },
  } } },
};

test("hostel choices separate blocks and floors come from room ranges", () => {
  const options = buildHostelOptions(allocation.btech23.male.hostels);
  assert.deepEqual(Object.keys(options), ["Kalam B", "Kalam C", "Kalam D"]);
  assert.deepEqual(options["Kalam B"].floors, ["4", "7"]);
  assert.deepEqual(options["Kalam C"].floors, ["1", "7"]);
  assert.deepEqual(options["Kalam D"].floors, ["0", "1"]);
  assert.deepEqual(buildHostelOptions(), {});
});

test("a floor query cannot mix the same room number across blocks or batches", () => {
  const where = buildRoomFilter(allocation, {
    batch: "btech23", gender: "male", hostel: "Kalam", block: "C", floor: "1",
  });
  const rooms = [
    { batch: "btech23", gender: "male", hostel: "Kalam", floor: "1", roomId: "KalamC-101-btech23" },
    { batch: "btech23", gender: "male", hostel: "Kalam", floor: "1", roomId: "KalamD-101-btech23" },
    { batch: "btech22", gender: "male", hostel: "Kalam", floor: "1", roomId: "KalamC-101-btech22" },
  ];
  const matches = rooms.filter(room => Object.entries(where).every(([key, value]) =>
    key === "roomId" ? room.roomId.startsWith(value.startsWith) : room[key] === value,
  ));
  assert.deepEqual(matches.map(room => room.roomId), ["KalamC-101-btech23"]);
});

test("ground floor is valid, while missing blocks and unallocated floors are rejected", () => {
  const request = { batch: "btech23", gender: "male", hostel: "Kalam", block: "D", floor: "0" };
  assert.ok(buildRoomFilter(allocation, request));
  for (const invalid of [{ block: undefined }, { block: "A" }, { floor: "D" }, { floor: "7" }, { gender: "female" }, { hostel: "kalam" }]) {
    assert.equal(buildRoomFilter(allocation, { ...request, ...invalid }), null);
  }
});
