import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { preservePasscode } from "./passcode";

export function usePasscodeNavigate() {
  const navigate = useNavigate();
  const { search } = useLocation();
  return useCallback((to, options) => navigate(preservePasscode(to, search), options), [navigate, search]);
}
