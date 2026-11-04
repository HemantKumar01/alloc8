import { Navigate, useLocation } from "react-router";
import { preservePasscode } from "@/lib/passcode";

export default function AllocationRedirect() {
  const { search } = useLocation();
  return <Navigate to={preservePasscode("/success", search)} replace />;
}
