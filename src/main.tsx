import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./app/AppContext";
import App from "./App";
import "./styles/global.css";

// The heavy lettering of every call (Riichi! Pon! ...): Inter Black, bundled
// (public/fonts, OFL) so it looks the same on every phone; system fonts often
// have no 900 weight and fall back to bold. Until it loads, the system font.
if (typeof FontFace !== "undefined") {
  const url = new URL("./fonts/inter-black-call.woff", window.location.href).href;
  const face = new FontFace("Riichi Call", `url(${url}) format("woff")`, { weight: "900", style: "normal" });
  face
    .load()
    .then((f) => document.fonts.add(f))
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
