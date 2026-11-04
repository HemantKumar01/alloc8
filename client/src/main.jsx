import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router";
import Spinner from "./components/spinner.jsx";
import AllocationRedirect from "./components/AllocationRedirect.jsx";

const Home = React.lazy(() => import("./pages/Home"));
const Success = React.lazy(() => import("./pages/Success"));
const Error = React.lazy(() => import("./pages/Error"));
// Outlook Auth
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "./authConfig.js";

const router = createBrowserRouter([
  {
    errorElement: <Error />,
    children: [
      { path: "/", element: <Home />, errorElement: <Error /> },
      { path: "/success", element: <Success />, errorElement: <Error /> },
      // Old booking, registration and SMP links all open the static results.
      { path: "*", element: <AllocationRedirect /> },
    ],
  },
]);

/**
 * MSAL should be instantiated outside of the component tree to prevent it from being re-instantiated on re-renders.
 * For more, visit: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/docs/getting-started.md
 */
const msalInstance = new PublicClientApplication(msalConfig);

// Default to using the first account if no account is active on page load
if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
  // Account selection logic is app dependent. Adjust as needed for different use cases.
  msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

// Listen for sign-in event and set active account
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
    const account = event.payload.account;
    msalInstance.setActiveAccount(account);
  }
});

msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <Suspense fallback={<Spinner loading={true} />}>
          <RouterProvider router={router} />
        </Suspense>
      </MsalProvider>
    </React.StrictMode>
  );
});
/* vi: set et sw=2: */
