import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import available_rooms from "../../data-gen/available_rooms.json" with { type: "json" };

async function main() {}

main()
  .then(async () => {
    const data = new Set();
    for (let batch in available_rooms) {
      for (let gender in available_rooms[batch]) {
        const capacity = available_rooms[batch][gender]["capacity"];
        for (let hostel in available_rooms[batch][gender]["hostels"]) {
          console.log("adding for", batch, gender, hostel, capacity);
          for (let block in available_rooms[batch][gender]["hostels"][hostel]) {
            for (let roomsRange of available_rooms[batch][gender]["hostels"][hostel][block]) {
              roomsRange = roomsRange.split("-");
              /* If floor is not same */
              if (roomsRange[0][0] !== roomsRange[1][0]) {
                throw new Error(`Both ends of the room range ${roomsRange[0]}-${roomsRange[1]} have different floors`);
              }
              const floor = roomsRange[0][0];
              const low = parseInt(roomsRange[0]);
              const high = parseInt(roomsRange[1]);
              for (let room = low; room <= high; room++) {
                console.log(
                  `${hostel}${block}-${room.toString().padStart(3, "0")}-${batch}`
                );
                const roomNum = room.toString().padStart(3, "0");
                const roomId = `${hostel}${block}-${roomNum}-${batch}`;
                data.add(
                  {
                    roomId,
                    hostel,
                    gender,
                    floor,
                    roomNum,
                    batch,
                    capacity,
                    numFilled: 0,
                    students: [],
                    roommateCode: null,
                  }
                );
              }
            }
          }
        }
      }
    }

    const findDuplicates = (arr) => {
      let sorted_arr = arr.slice().sort(); // You can define the comparing function here.
      // JS by default uses a crappy string compare.
      // (we use slice to clone the array so the
      // original array won't be modified)
      let results = [];
      for (let i = 0; i < sorted_arr.length - 1; i++) {
        if (sorted_arr[i + 1] == sorted_arr[i]) {
          results.push(sorted_arr[i]);
        }
      }
      return results;
    };
    const finalData = [];
    const ids = [];
    for (const x of data) {
      console.log(x);
      ids.push(x);
      finalData.push(x);
    }
    console.log(
      "duplicate IDs",
      findDuplicates(ids),
      ", ids length: ",
      ids.length
    );
    const createMany = await prisma.rooms.createMany({
      data: finalData,
    });
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
/* vi: set et sw=2: */
