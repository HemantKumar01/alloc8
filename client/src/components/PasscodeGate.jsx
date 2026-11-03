import { Outlet, useLocation } from "react-router";
import { hasValidPasscode } from "@/lib/passcode";

export default function PasscodeGate({ errorElement }) {
  const { search } = useLocation();
  if (!hasValidPasscode(search)) {
    return <main className="flex min-h-screen items-center justify-center p-5 text-center">Access denied. A valid passcode is required in the URL.</main>;
  }
  return errorElement || <Outlet />;
}
