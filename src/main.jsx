import "./storageShim.js"; // must run before App's first render
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./GVAJourney.jsx";

createRoot(document.getElementById("root")).render(<App />);
