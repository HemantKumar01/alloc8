import { useEffect, useState } from "react";
import { getName, getRollNumber } from "@/lib/auth_utility";
import { useMsal } from "@azure/msal-react";
import { BrowserAuthError, InteractionRequiredAuthError } from "@azure/msal-browser";
import { useNavigate } from "react-router";

export default function GetSMP() {
  const { accounts, instance } = useMsal();
  const navigate = useNavigate();

  const [idToken, setIdToken] = useState(null);
  const [idTokenClaims, setIdTokenClaims] = useState(null);
  const [loadingToken, setLoadingToken] = useState(true);

  const [clusterData, setClusterData] = useState(null);
  const [loadingCluster, setLoadingCluster] = useState(false);
  const [error, setError] = useState(null);

  const silentRequest = { scopes: [] };
  const accessTokenRequest = { account: accounts && accounts[0] ? accounts[0] : null };

  useEffect(() => {
    let mounted = true;
    setLoadingToken(true);

    instance.acquireTokenSilent(silentRequest)
      .then((tokenResponse) => {
        if (!mounted) return;
        setIdToken(tokenResponse.idToken);
        setIdTokenClaims(tokenResponse.idTokenClaims);
      })
      .catch((err) => {
        if (err instanceof InteractionRequiredAuthError) {
          try {
            instance.acquireTokenRedirect(silentRequest);
          } catch (redirectErr) {
            console.error("Redirect failed:", redirectErr);
          }
        } else if (err instanceof BrowserAuthError) {
          navigate("/");
        } else {
          console.warn("Silent token acquisition failed:", err);
        }
      })
      .finally(() => {
        if (mounted) setLoadingToken(false);
      });

    return () => { mounted = false; };
  }, [instance]);

  const fetchCluster = async () => {
    setError(null);
    setClusterData(null);

    // require an account to be present
    if (!accessTokenRequest.account) {
      setError("No signed-in account found.");
      return;
    }

    setLoadingCluster(true);
    try {
      const tokenResponse = await instance.acquireTokenSilent(accessTokenRequest);
      const idTok = tokenResponse.idToken;

      const base = import.meta.env.VITE_SERVER_URL || "http://localhost:8500";
      const resp = await fetch(`${base}/api/smp/get-cluster`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Alloc8-IDToken": idTok,
        },
      });

      if (!resp.ok) {
        if (resp.status === 404) {
          const body = await resp.json().catch(() => ({}));
          setError(body.message || "Cluster not found for current user.");
        } else {
          const txt = await resp.text().catch(() => "");
          setError(`Server returned ${resp.status}: ${txt}`);
        }
        setClusterData(null);
      } else {
        const json = await resp.json();
        setClusterData(json);
      }
    } catch (err) {
      console.error("fetchCluster error:", err);
      setError(err.message || "Error fetching cluster");
      setClusterData(null);
    } finally {
      setLoadingCluster(false);
    }
  };

  useEffect(() => {
    if (!accessTokenRequest.account) return;
    fetchCluster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessTokenRequest.account, instance, idToken]);

  // UI for testing
  if (loadingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    ( clusterData ? <div className="bg-white p-4 rounded-lg shadow-sm max-w-3xl mx-auto md:my-16 md:px-12 px-4">
      <div className="flex justify-center mb-6">
        <img src="/SMP.svg" className="w-[25rem] p-12" alt="Logo" />
      </div>

      <div className="flex justify-between items-center mb-3">
        <h3 className="px-4 m-0 text-xl text-gray-900 font-medium">SMP Members</h3>
        <h3 className="px-4 m-0 text-md text-gray-600 font-medium">Similarity: {parseInt(clusterData?.cluster?.score)}%</h3>
      </div>

      <div>
        {[...(clusterData?.cluster?.members ?? [])]
          .sort((a, b) => {
            const ka = parseInt((a.roll || "0000").slice(0, 4), 10) || 0;
            const kb = parseInt((b.roll || "0000").slice(0, 4), 10) || 0;
            if (ka !== kb) return ka - kb;
            return String(a.roll).localeCompare(String(b.roll));
          })
          .map((m) => (
            <div
              key={m.roll}
              className={ `block w-full p-4 border border-gray-200 rounded-lg mb-2 ${m.roll[1] == 3 ? 'bg-blue-400' : m.roll[1] == 4 ? 'bg-blue-200' : 'bg-white'}` }
            >
              <div className="text-sm font-semibold text-gray-900">{m.name}</div>
              <div className="text-sm text-gray-600 mt-1">{m.roll.toUpperCase()}</div>
            </div>
          ))}
      </div>
    </div> : 
      <div className="flex justify-center text-center p-4 items-center text-xl text-black min-h-screen">
        <div>You Have Not Been Alloted Any Cluster. This may be due to large number of SMP 2nd years in your branch. </div>
      </div>
    )
  );
}
