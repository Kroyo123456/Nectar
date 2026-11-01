import "./mock/tauriMock";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DynamicThemeProvider } from "./context/DynamicThemeContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DynamicThemeProvider>
      <App />
    </DynamicThemeProvider>
  </React.StrictMode>,
);
