import React from "react"; // Import React
import ReactDOM from "react-dom"; // Import ReactDOM
import App from "./App"; // Import your main App component
import FHIR from "fhirclient"; // Import the FHIR client
import "./index.css"; // Import CSS
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS

const rootElement = document.getElementById("root");

const smartLaunch = () => {
  const sandboxIss = "https://fhir.epic.com/interconnect-fhir-oauth"; // Epic Sandbox URL
  const clientId = "3e610e34-4728-487f-affc-2111b103b7d8"; // Replace with your app's client ID

  const urlParams = new URLSearchParams(window.location.search);
  const iss = urlParams.get("iss") || sandboxIss;

  if (!iss) {
    console.error("No FHIR server URL found. Please specify it as `iss`.");
    return;
  }

  // Authorize application
  FHIR.oauth2
    .init({
      clientId: clientId,
      scope: "launch/patient patient/*.read patient/*.write openid profile",
      redirectUri: "http://localhost:3000", // Replace with your redirect URI
      iss: iss,
    })
    .then((client) => {
      ReactDOM.render(<App client={client} />, rootElement);
    })
    .catch((error) => {
      console.error("FHIR initialization failed:", error);
    });
};

smartLaunch();
