import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Buffer } from "buffer";
import App from "./App.jsx";
import "./index.css";

window.Buffer = window.Buffer || Buffer;
globalThis.Buffer = globalThis.Buffer || Buffer;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
