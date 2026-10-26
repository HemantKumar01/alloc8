import { getName, getRollNumber } from "@/lib/auth_utility";
import Spinner from "@/components/spinner";
import Header from "@/components/Header";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import Footer from "@/components/Footer";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { BrowserAuthError, InteractionRequiredAuthError } from "@azure/msal-browser";
import { useMsal, AuthenticatedTemplate } from "@azure/msal-react";

const SuccessPage = () => {
  const { instance } = useMsal();
  const [idToken, setIdToken] = useState();
  const [idTokenClaims, setIdTokenClaims] = useState();
  const [loading, setLoading] = useState(true);
  const [studData, setStudData] = useState({});
  const navigate = useNavigate();
  const contentRef = useRef();
  const request = { scopes: [] };

  useEffect(() => {
    instance.acquireTokenSilent(request).then(tokenResponse => {
      setIdToken(tokenResponse.idToken);
      setIdTokenClaims(tokenResponse.idTokenClaims);
    }).catch(async (error) => {
      if (error instanceof InteractionRequiredAuthError) {
        // fallback to interaction when silent call fails
        return instance.acquireTokenRedirect(request);
      } else if (error instanceof BrowserAuthError) {
        navigate("/");
        return;
      }

      // handle other errors
      console.log(error);
    });
  }, [instance]);

  useEffect(() => {
    if (!idToken) return;
    fetch(
      `${import.meta.env.VITE_SERVER_URL}/api/nonfresher/allocated-details`,
      {
        headers: { "X-Alloc8-IDToken": idToken },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        // console.log(data);
        if (data.disabled) {
          alert("You cannot book room yet. Please wait for an official mail.");
          navigate("/");
        } else if (data.error) {
          navigate("/allotroom");
          return;
        }
        setLoading(false);
        setStudData(data);
      })
  }, [idToken]);

  const viewport = document.querySelector("meta[name=viewport]");
  const downloadPDF = () => {
    // window.print();
    viewport.setAttribute("content", "width=1024");

    const input = contentRef.current;
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("room_allocation_details.pdf");
      viewport.setAttribute("content", "width=device-width, initial-scale=1.0");
    });
  };

  return (
    <div className="bg-[#f1f5f9] h-full w-full">
      <Header name={getName(idTokenClaims)}></Header>
      <Spinner loading={loading}></Spinner>

      <div
        ref={contentRef}
        className="p-10 max-w-[700px] m-auto bg-white mt-10 shadow-md rounded-lg"
      >
        <div
          className=""
          style={{
            fontFamily: "Poppins, Arial, sans-serif",
            margin: "10px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <img
            src={"/gymkhana.jpg"}
            alt="Gymkhana"
            style={{ width: "100px", height: "auto", marginRight: "10px" }}
          />
          <h1
            className="mb-0 text-xl"
            style={{
              fontFamily: "Poppins, Arial, sans-serif",
              // marginBottom: "10px",
              flexGrow: 1,
              textAlign: "center",
            }}
          >
            {"Students' Gymkhana, IIT Patna"}
          </h1>
          <img
            src={"/gymkhana.jpg"}
            alt="Gymkhana"
            style={{ width: "100px", height: "auto", marginRight: "10px" }}
          />
        </div>
        <hr />
        <div className="pt-10">
          <p>Congratulations ,</p>
          <div>
            Your room has been booked successfully. The details of the booked
            room are as follows -
            <div className="p-5 text-xl font-mono border-2 my-5 capitalize">
              <div>
                <b>Name: </b> <AuthenticatedTemplate>{getName(idTokenClaims)}</AuthenticatedTemplate>
              </div>
              <div>
                <b>Roll No.: </b> <AuthenticatedTemplate>{getRollNumber(idTokenClaims).toUpperCase()}</AuthenticatedTemplate>
              </div>
              <div>
                <b>Hostel: </b> {studData?.hostel}
              </div>
              <div>
                <b>Room No.: </b> {studData?.roomNum}
              </div>
              <div>
                <b>Occupancy: </b> {studData?.occupancy}
              </div>
              <div>
                <b>PDF Generated at: </b>
                {new Date().toString()}
              </div>
              <div>
                <b>Roommates Until Now: </b>{" "}
                {studData?.roommates?.map((roommate) => {
                  return (
                    <div key={roommate.rollnum} className="px-10">
                      {roommate.rollnum} - {roommate.name}
                    </div>
                  );
                })}
              </div>
              {studData &&
              studData.roommateCode &&
              studData.roommateCode.length > 0 ? (
                <div style={{ textTransform: "lowercase" }}>
                  <b>Roommate Code: </b> {studData?.roommateCode?.toLowerCase()}
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>

          <div>Regards</div>
          <div>IIT Patna</div>
        </div>
      </div>
      <div className="flex justify-center mt-5">
        <button
          onClick={downloadPDF}
          className="px-4 py-2 bg-blue-500 text-white rounded mb-[7em]"
        >
          Download PDF
        </button>
      </div>
      <Footer></Footer>
    </div>
  );
};

export default SuccessPage;
/* vi: set et sw=2: */
