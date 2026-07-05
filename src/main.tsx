import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Disable default right-click context menu
document.addEventListener("contextmenu", (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
