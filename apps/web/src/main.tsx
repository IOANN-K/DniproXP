import "./features/impact/impact.css";
import "./features/product-integration/product.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./features/design-integration/design.css";
import "./features/brand/readability.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
