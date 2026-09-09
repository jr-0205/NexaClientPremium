import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import "./styles/workflows.css";
import "./styles/brand.css";
import "./styles/interaction.css";
import "./styles/profile-tools.css";
import "./styles/live-console.css";
import "./styles/profile-actions.css";
import "./styles/build-manager.css";
import "./styles/build-family.css";
import "./styles/installed-content-icons.css";
import "./styles/account.css";
import "./styles/redesign.css";
import "./styles/instance-redesign.css";
import "./styles/account-session-redesign.css";
import "./styles/settings-redesign.css";
import "./styles/profile-modules.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
