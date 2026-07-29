import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

const Bootloader = () => {
  const [AppMod, setAppMod] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Dynamically import polyfills FIRST to guarantee they evaluate before Solana SDKs
    import('./polyfills.js')
      .then(() => import('./AppWithProviders.jsx'))
      .then((mod) => {
        setAppMod(() => mod.default);
      })
      .catch((err) => {
        console.error("Bootloader caught error:", err);
        setError(err);
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: 24, color: "#EF4444", fontSize: 13, fontFamily: "monospace", whiteSpace: "pre-wrap", overflow: "auto", height: "100vh", background: "#FFFFFF" }}>
        <strong>Fatal Module Evaluation Crash:</strong>{"\n"}{error.message}{"\n\n"}{error.stack}
      </div>
    );
  }

  if (!AppMod) {
    return <div style={{ padding: 24, fontFamily: "sans-serif" }}>Booting application...</div>;
  }

  const App = AppMod;
  return <App />;
};

ReactDOM.createRoot(document.getElementById("root")).render(<Bootloader />);
