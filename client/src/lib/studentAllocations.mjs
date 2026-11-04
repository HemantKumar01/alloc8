// Parse CSV exports, including quoted commas, escaped quotes and CRLF rows.
export function parseStudentsCsv(csv) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === "," || char === "\n" || char === "\r")) {
      row.push(field.trim());
      field = "";
      if (char !== ",") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === "\r" && source[i + 1] === "\n") i++;
      }
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("Unterminated quoted field in student CSV");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() || [];
  for (const required of ["rollnum", "name", "room", "roomnum", "occupancy"]) {
    if (!headers.includes(required)) throw new Error(`Student CSV missing ${required}`);
  }
  return rows.map((values) => Object.fromEntries(headers.map((key, i) => [key, values[i] || ""])));
}

export function createStudentLookup(csv) {
  const students = parseStudentsCsv(csv);
  const byRoll = new Map();
  const byRoom = new Map();
  for (const student of students) {
    const roll = student.rollnum.toLowerCase();
    if (!roll || byRoll.has(roll)) throw new Error("Student CSV has a missing or duplicate roll number");
    byRoll.set(roll, student);
    if (student.room) {
      const occupants = byRoom.get(student.room) || [];
      occupants.push(student);
      byRoom.set(student.room, occupants);
    }
  }
  return (rollNumber) => {
    const student = byRoll.get(rollNumber?.trim().toLowerCase());
    if (!student) return null;
    const occupants = byRoom.get(student.room) || [];
    return {
      ...student,
      roomNum: student.roomnum || student.room.split("-")[1] || "",
      occupancy: student.occupancy || occupants.length,
      roommates: occupants
        .filter((occupant) => occupant !== student)
        .map(({ rollnum, name }) => ({ rollnum, name })),
    };
  };
}
