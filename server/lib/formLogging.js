import { randomUUID } from "node:crypto";

const istFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function formatTimestampIST(date = new Date()) {
  const parts = Object.fromEntries(istFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}.${String(date.getUTCMilliseconds()).padStart(3, "0")} IST`;
}

const clientEvents = {
  step_viewed: ["hostel", "room"],
  hostel_selected: ["hostel"],
  hostel_completed: ["hostel"],
  validation_failed: ["hostel", "room"],
  previous_clicked: ["room"],
  floor_selected: ["room"],
  room_selected: ["room"],
  booking_submitted: ["room"],
  request_failed: ["room"],
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Deliberately exclude tokens, roommate codes, and arbitrary client payloads.
function selectionDetails(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(["hostel", "block", "floor", "roomId"].flatMap(key =>
    typeof input[key] === "string" && input[key].length <= 100 ? [[key, input[key]]] : [],
  ));
}

export function formLogData(req, res, event, step, details = {}, now = new Date()) {
  const sessionId = req.get("X-Alloc8-FormSession");
  return {
    eventId: randomUUID(),
    sessionId: uuidPattern.test(sessionId ?? "") ? sessionId : null,
    rollnum: res.locals.rollNumber,
    batch: res.locals.batch,
    gender: res.locals.gender,
    form: "room_allocation",
    source: "server",
    event,
    step,
    details,
    createdAt: now,
    timestampIST: formatTimestampIST(now),
  };
}

async function persistLog(prisma, data) {
  try {
    await prisma.formLogs.create({ data });
  } catch (error) {
    // Auxiliary telemetry must not prevent students from using the form.
    console.error("Could not store form log", { event: data.event, error: error.name });
  }
}

export function createRequestAudit(prisma, event, step) {
  return async (req, res, next) => {
    const details = selectionDetails(req.body);
    const startedAt = Date.now();
    res.once("finish", () => {
      void persistLog(prisma, formLogData(req, res,
        `${event}_${res.statusCode < 400 ? "completed" : "failed"}`, step,
        { ...details, statusCode: res.statusCode, durationMs: Date.now() - startedAt },
      ));
    });
    await persistLog(prisma, formLogData(req, res, `${event}_started`, step, details));
    next();
  };
}

export function createStepLogger(prisma) {
  return async (req, res) => {
    const { eventId, event, step, sequence, details } = req.body ?? {};
    if (!uuidPattern.test(eventId ?? "") || !uuidPattern.test(req.get("X-Alloc8-FormSession") ?? "") ||
        !Object.hasOwn(clientEvents, event) || !clientEvents[event].includes(step) ||
        !Number.isSafeInteger(sequence) || sequence < 1 || sequence > 2147483647) {
      return res.status(422).json({ error: "Invalid form log event" });
    }
    const data = {
      ...formLogData(req, res, event, step, selectionDetails(details ?? {})),
      eventId, source: "client", sequence,
    };
    try {
      // A retry of an acknowledged or interrupted request must not duplicate a log.
      await prisma.formLogs.upsert({
        where: { rollnum_eventId: { rollnum: data.rollnum, eventId } },
        create: data,
        update: {},
      });
      return res.status(201).json({ message: "Form step logged" });
    } catch (error) {
      console.error("Could not store form step", { event, error: error.name });
      return res.status(503).json({ error: "Could not store form step" });
    }
  };
}
