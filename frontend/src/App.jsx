import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Full Stack Platform V1</h1>
      <p>Early iteration (archived). Frontend calls <code>/api</code> via Nginx proxy.</p>

      <pre style={{ background: "#111", color: "#0f0", padding: 16, borderRadius: 8 }}>
        {data ? JSON.stringify(data, null, 2) : "Loading..."}
      </pre>
    </div>
  );
}

