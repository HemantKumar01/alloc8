import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getRollNumber } from "./auth_utility.js";
import { createStudentLookup, parseStudentsCsv } from "./studentAllocations.mjs";

const csv = readFileSync(new URL("../../../alloc8.students.csv", import.meta.url), "utf8");

test("every exported student resolves with room numbers and matching roommates", () => {
  const students = parseStudentsCsv(csv);
  const lookup = createStudentLookup(csv);
  assert.ok(students.length > 0);
  for (const student of students) {
    const details = lookup(` ${student.rollnum.toLowerCase()} `);
    assert.equal(details.name, student.name);
    assert.equal(details.roomNum, student.roomnum);
    const roommates = students.filter((other) => other.room === student.room && other.rollnum !== student.rollnum);
    assert.deepEqual(details.roommates, roommates.map(({ name, rollnum }) => ({ name, rollnum })));
    assert.equal(Number(details.occupancy), Number(student.occupancy) || roommates.length + 1);
  }
  assert.equal(lookup("missing-student"), null);
  assert.equal(lookup(undefined), null);
});

test("room assignments remain visible with blank allocation and occupancy fields", () => {
  const lookup = createStudentLookup("rollnum,name,room,roomnum,occupancy,allocated\n2301AA01,A,KalamC-035-btech23,035,,\n2301AA02,B,KalamC-035-btech23,035,,\n");
  assert.equal(lookup("2301aa01").roomNum, "035");
  assert.equal(lookup("2301aa01").occupancy, 2);
  assert.deepEqual(lookup("2301aa01").roommates, [{ rollnum: "2301AA02", name: "B" }]);
});

test("CSV parser handles BOM, quoted commas, quotes, newlines and CRLF", () => {
  const rows = parseStudentsCsv('\uFEFFrollnum,name,room,roomnum,occupancy\r\n2301AA01,"Doe, ""Jane""\nJunior",KalamC-035,035,1\r\n\r\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Doe, "Jane"\nJunior');
  assert.equal(rows[0].roomnum, "035");
  assert.throws(() => parseStudentsCsv('rollnum,name\n1,"unclosed'), /Unterminated/);
  assert.throws(() => parseStudentsCsv("rollnum,name\n1,A"), /missing room/);
});

test("Outlook account formats resolve roll numbers without acquiring a backend token", () => {
  assert.equal(getRollNumber({ email: "2301AA01@iitp.ac.in" }), "2301AA01");
  assert.equal(getRollNumber({ email: "student_2301aa01@iitp.ac.in" }), "2301aa01");
  assert.equal(getRollNumber({ preferred_username: "2301aa01@iitp.ac.in" }), "2301aa01");
  assert.equal(getRollNumber({}), "");
  assert.equal(getRollNumber(undefined), "");
});
