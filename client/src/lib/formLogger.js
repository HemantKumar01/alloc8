// Keep events ordered within a form visit. Failures are retried once without
// blocking navigation or booking; eventId makes retries idempotent in MongoDB.
export function createFormLogger(idToken, sessionId) {
  let sequence = 0;
  let pending = Promise.resolve();
  return (event, step, details = {}) => {
    const body = JSON.stringify({ eventId: crypto.randomUUID(), sequence: ++sequence, event, step, details });
    pending = pending.then(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/nonfresher/form-logs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Alloc8-IDToken": idToken,
              "X-Alloc8-FormSession": sessionId,
            },
            body,
            keepalive: true,
            signal: AbortSignal.timeout(5000),
          });
          if (response.ok) return;
          if (response.status < 500) break;
        } catch {
          // Retry transient network failures with the same event ID.
        }
      }
      console.warn("Could not store form step", event);
    });
    return pending;
  };
}
