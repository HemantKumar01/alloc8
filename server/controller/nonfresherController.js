import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const redis = new Redis();
import crypto from "crypto";
import availableRooms from "../../data-gen/available_rooms.json" with { type: "json" };
import { buildRoomFilter } from "../../shared/roomSelection.mjs";

const codeExpiryDelta = 10 * 60000;

async function acquireLock(key, ttl) {
  const lockKey = `lock:${key}`;
  const result = await redis.set(lockKey, "locked", "NX", "EX", ttl);
  return result === "OK";
}

async function releaseLock(key) {
  const lockKey = `lock:${key}`;
  await redis.del(lockKey);
}

async function showDetails(req, res) {
  const rollnum = res.locals.rollNumber;
  try {
    const student = await prisma.students.findUnique({
      where: { rollnum: rollnum },
    });
    if (!student || !student.allocated) {
      res.status(404).json({ code: "NO_ALLOCATION", error: "No room allocated yet" });
      return;
    }
    const room = await prisma.rooms.findUnique({
      where: { roomId: student.room },
    });
    if (!room) {
      res.status(500).json({ error: "The allocated room could not be found" });
      return;
    }

    if (room.roommateCode && room.roommateCode.length != 0) {
      const codeGeneratedAt = new Date(room.codeGeneratedAt);
      const codeExpiryTime = new Date(
        codeGeneratedAt.getTime() + codeExpiryDelta
      ); // 10 minutes tak locked
      const now = new Date();

      if (now > codeExpiryTime) {
        room.roommateCode = "";
        room.codeGeneratedAt = "";
        await prisma.rooms.update({
          where: { roomId: student.room },
          data: {
            roommateCode: null,
            codeGeneratedAt: null,
          },
        });
      }
    }
    // console.log(student);
    if (student && student.allocated) {
      const roommates = await prisma.students.findMany({
        where: {
          room: student.room,
        },
        select: {
          rollnum: true,
          name: true,
        },
      });

      return res.status(200).json({
        hostel: student.hostel,
        roomNum: student.roomnum,
        room: student.room,
        occupancy: student.occupancy,
        roommates,
        roommateCode: room.roommateCode,
      });
    } else {
      res.status(400).json({ error: "kindly wait for allocation!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

async function getRoom(req, res) {
  const where = buildRoomFilter(availableRooms, {
    hostel: req.body.hostel,
    block: req.body.block,
    floor: req.body.floor,
    batch: res.locals.batch,
    gender: res.locals.gender,
  });
  if (!where) {
    res.status(422).json({ error: "Please select a valid hostel block and floor" });
    return;
  }

  try {
    const validRooms = await prisma.rooms.findMany({
      omit: {
        roommateCode: true,
      },
      where,
    });
    let i;
    for (i = 0; i < validRooms.length; i++) {
      let room = validRooms[i];
      if (room.roommateCode && room.roommateCode.length != 0) {
        const codeGeneratedAt = new Date(room.codeGeneratedAt);
        const codeExpiryTime = new Date(
          codeGeneratedAt.getTime() + codeExpiryDelta
        ); // 10 minutes tak locked
        const now = new Date();


        if (now > codeExpiryTime) {
          room.roommateCode = null;
          room.codeGeneratedAt = null;
          await prisma.rooms.update({
            where: { roomId: room.roomId },
            data: {
              roommateCode: null,
              codeGeneratedAt: null,
            },
          });
        }
      }

//      if (room.roommateCode) {
//        room.roommateCode = "present";
//      }
    }
    return res.status(200).json({ rooms: validRooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function roomBooking(req, res) {
  const { roomId, roommateCode } = req.body;
  let batch = res.locals.batch;
  let gender = res.locals.gender;

  const name = res.locals.name;
  const studentId = res.locals.rollNumber;
  const lockKey = `room:${roomId}`;
  const studentLockKey = `student:${studentId}`;

  const studentLockAcquired = await acquireLock(studentLockKey, 30);

  if (!studentLockAcquired) {
    return res.status(400).json({
      error: "Could not acquire lock for student ID. Please try again.",
    });
  }

  const lockAcquired = await acquireLock(lockKey, 20); // TTL of 20 seconds
  if (!lockAcquired) {
    await releaseLock(studentLockKey);
    return res
      .status(400)
      .json({ error: "Could not acquire lock. Please try again." });
  }

  try {
    const room = await prisma.rooms.findUnique({
      where: { roomId },
    });

    if (!room) {
      // console.log("Room does not exist:", roomId);
      return res.status(400).json({ error: "Room does not exist" });
    }

    const student = await prisma.students.findUnique({
      where: { rollnum: studentId },
    });

    if (student && student.allocated) {
      // console.log("Student already allotted:", studentId);
      return res.status(400).json({
        error: "You have already been given a room. You cannot book any more!",
      });
    }

    // if (student.batch !== room.batch) {
    //   return res
    //     .status(400)
    //     .json({ error: "This room is not available for your batch!" });
    // }

    if (room.numFilled < room.capacity) {
      // console.log(room);
      const now = new Date();

      let generatedCode = null;

      if (room.numFilled === 0) {
        // gen a unique code if its completely empty along with "TIME stamp" stored in db
        generatedCode = crypto.randomBytes(4).toString("hex");
        room.roommateCode = generatedCode;
        room.codeGeneratedAt = now;
      } else {
        const codeGeneratedAt = new Date(room.codeGeneratedAt);
        const codeExpiryTime = new Date(
          codeGeneratedAt.getTime() + codeExpiryDelta
        ); // 10 minutes tak locked
        if (now > codeExpiryTime) {
          room.roommateCode = "";
          room.codeGeneratedAt = null;
          await prisma.rooms.update({
            where: { roomId: room.roomId },
            data: {
              roommateCode: null,
              codeGeneratedAt: null,
            },
          });
        } else if (roommateCode !== room.roommateCode) {
          return res.status(400).json({ error: "Invalid roommate code" });
        }
      }
      let students = room.students;
      students.push(studentId + " - " + name);
      await prisma.$transaction(async (prisma) => {
        let code = generatedCode || room.roommateCode;
        await prisma.rooms.update({
          where: { roomId },
          data: {
            numFilled: room.numFilled + 1,
            students: students,
            roommateCode: code,
            codeGeneratedAt: room.codeGeneratedAt,
            capacity: room.capacity,
          },
        });

        await prisma.students.create({
          data: {
            rollnum: studentId,
            name,
            allocated: true,
            roomnum: room.roomNum,
            room: roomId,
            hostel: room.hostel,
            occupancy: room.capacity,
            gender: gender,
            batch: batch,
          },
        });
      });

      return res.status(200).json({ message: "Room booked successfully" });
    } else {
      return res.status(400).json({ error: "Room is full" });
    }
  } catch (error) {
    console.error("Error during room booking:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    await releaseLock(lockKey);
    await releaseLock(studentLockKey);
  }
}

export default {
  showDetails,
  getRoom,
  roomBooking,
};
/* vi: set et sw=2: */
