import { useEffect, useState } from "react";
import Spinner from "./spinner";

export default function BackendGate({ children }) {
  const [available, setAvailable] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    let stopped = false;
    let retryTimer;
    let controller;

    async function checkBackend() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const base = (import.meta.env.VITE_SERVER_URL || "http://localhost:8500").replace(/\/$/, "");
        const response = await fetch(`${base}/`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!stopped) {
          setAvailable(response.ok);
          if (response.ok) setHasConnected(true);
        }
      } catch {
        if (!stopped) setAvailable(false);
      } finally {
        clearTimeout(timeout);
        if (!stopped) retryTimer = setTimeout(checkBackend, 5000);
      }
    }

    checkBackend();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      controller?.abort();
    };
  }, []);

  return (
    <>
      {!available && (
        <div role="status" aria-live="polite" aria-label="Loading">
          <Spinner loading={true} />
        </div>
      )}
      {/* Preserve form state when connectivity drops after the app has loaded. */}
      {hasConnected && <div hidden={!available}>{children}</div>}
    </>
  );
}
