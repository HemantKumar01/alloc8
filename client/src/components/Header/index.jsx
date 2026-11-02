import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useMsal, AuthenticatedTemplate } from "@azure/msal-react";
import { useState } from "react";
import { InteractionStatus } from "@azure/msal-browser";

function Header({ name }) {
  const { instance, accounts, inProgress } = useMsal();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    if (isLoggingOut || inProgress !== InteractionStatus.None) return;

    setIsLoggingOut(true);
    setLogoutError("");
    try {
      await instance.logoutRedirect({
        account: instance.getActiveAccount() ?? accounts[0],
        postLogoutRedirectUri: new URL("/", window.location.origin).href,
      });
    } catch {
      setLogoutError("Could not complete Microsoft sign-out. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="flex min-h-[60px] w-full items-center justify-between gap-3 bg-slate-100 px-5 py-2">
        <img src="/logo.png" className="h-[30px] shrink-0" alt="Alloc8" />
        <div className="flex min-w-0 items-center gap-3">
          <AuthenticatedTemplate>
            <div className="truncate capitalize">{name}</div>
          </AuthenticatedTemplate>
          <User className="shrink-0" aria-hidden="true" />
          <AuthenticatedTemplate>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={handleLogout}
              disabled={isLoggingOut || inProgress !== InteractionStatus.None}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {isLoggingOut ? "Logging out…" : "Log out"}
            </Button>
          </AuthenticatedTemplate>
        </div>
      </div>
      {logoutError && (
        <div role="alert" className="flex items-center justify-end gap-3 px-5 py-2 text-sm text-red-700">
          <span>{logoutError}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleLogout}
            disabled={isLoggingOut || inProgress !== InteractionStatus.None}>
            Retry sign-out
          </Button>
        </div>
      )}
    </>
  );
}
export default Header;
/* vi: set et sw=2: */
