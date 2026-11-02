// Read-only check of the active allocation against DATABASE_URL in server/.env.
import fs from "node:fs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildHostelOptions, buildRoomFilter } from "../../shared/roomSelection.mjs";

dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });
const readJson = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const allocation = readJson("../../data-gen/available_rooms.json");
const { batch, gender } = readJson("../../data-gen/roll_numbers.json");
const { hostels, capacity } = allocation[batch][gender];
const options = buildHostelOptions(hostels);
const prisma = new PrismaClient();
const select = { roomId: true, hostel: true, floor: true, roomNum: true, batch: true, gender: true, capacity: true };

try {
  const expected = new Map();
  const problems = [];
  for (const [hostel, blocks] of Object.entries(hostels)) {
    for (const [block, ranges] of Object.entries(blocks)) {
      for (const range of ranges) {
        const [start, end] = range.split("-");
        if (start[0] !== end[0]) throw new Error("Room range crosses floors");
        for (let number = Number(start); number <= Number(end); number++) {
          const roomNum = String(number).padStart(3, "0");
          const roomId = `${hostel}${block}-${roomNum}-${batch}`;
          if (expected.has(roomId)) problems.push(`Duplicate configured room: ${roomId}`);
          expected.set(roomId, { roomId, hostel, floor: start[0], roomNum, batch, gender, capacity });
        }
      }
    }
  }

  const actual = await prisma.rooms.findMany({ where: { batch, gender }, select });
  const actualIds = new Set(actual.map(room => room.roomId));
  for (const room of actual) {
    const wanted = expected.get(room.roomId);
    if (!wanted) problems.push(`Unexpected database room: ${room.roomId}`);
    else for (const key of Object.keys(select)) {
      if (room[key] !== wanted[key]) problems.push(`${room.roomId}: ${key} does not match seed configuration`);
    }
  }
  for (const id of expected.keys()) {
    if (!actualIds.has(id)) problems.push(`Missing database room: ${id}`);
  }

  const queriedIds = new Set();
  for (const [label, option] of Object.entries(options)) {
    const counts = [];
    for (const floor of option.floors) {
      const where = buildRoomFilter(allocation, { batch, gender, ...option, floor });
      const rooms = await prisma.rooms.findMany({ where, select });
      const wantedIds = [...expected.values()].filter(room =>
        room.hostel === option.hostel && room.floor === floor &&
        room.roomId.startsWith(`${option.hostel}${option.block}-`),
      ).map(room => room.roomId).sort();
      if (JSON.stringify(rooms.map(room => room.roomId).sort()) !== JSON.stringify(wantedIds)) {
        problems.push(`${label}, floor ${floor}: API query does not match configured room IDs`);
      }
      for (const room of rooms) {
        if (queriedIds.has(room.roomId)) problems.push(`Room appears in multiple selections: ${room.roomId}`);
        queriedIds.add(room.roomId);
      }
      counts.push(`${floor}: ${rooms.length}`);
    }
    console.log(`${label} — rooms per floor: ${counts.join(", ")}`);
  }

  if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${expected.size} rooms match for ${batch}/${gender}; all block/floor queries match, with no missing, extra, or overlapping rooms.`);
  }
} catch (error) {
  // Do not print connection strings or credentials from driver error messages.
  console.error("Verification failed:", error.name, error.code ?? "");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
