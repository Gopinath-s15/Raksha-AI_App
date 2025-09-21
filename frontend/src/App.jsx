import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { api } from "./api/endpoints";

// Simple in-app router states
const ROUTES = {
  HOME: "home",
  FEATURES: "features",
  DASHBOARD: "dashboard",
  ABOUT: "about",
};

function App() {
  // App flow: splash -> auth -> app
  const [phase, setPhase] = useState("splash");
  const [route, setRoute] = useState(ROUTES.HOME);
  const [authMode, setAuthMode] = useState("login"); // or "signup"
  const [signedIn, setSignedIn] = useState(false);

  // UI/data state for dashboard
  const [alerts, setAlerts] = useState([]);
  const [panicData, setPanicData] = useState({ user_id: "", vehicle_id: "Bus #17", lang: "en", location: "Metro Station XYZ" });
  const [anomalyData, setAnomalyData] = useState({ anomaly_type: "route_deviation", vehicle_id: "Bus #17", lang: "en", current_location: "Metro Station XYZ" });
  const [escalationData, setEscalationData] = useState({ anomaly_type: "distress_voice", contacts: "", vehicle_id: "Bus #17", lang: "en", escalation_level: "family" });
  const [explanation, setExplanation] = useState("");
  const [guidance, setGuidance] = useState(null);
  const [riskLevel, setRiskLevel] = useState("medium");
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef(null);

  const websocket = useRef(null);

  // Splash screen: 5 seconds
  useEffect(() => {
    if (phase !== "splash") return;
    const t = setTimeout(() => setPhase("auth"), 5000);
    return () => clearTimeout(t);
  }, [phase]);

  // Connect WebSocket only on dashboard view when signed in
  useEffect(() => {
    if (!signedIn || route !== ROUTES.DASHBOARD) return;
    try {
      websocket.current = new WebSocket(api.wsUrl());
      websocket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setAlerts((prev) => [data, ...prev]);
      };
    } catch (e) {
      // no-op
    }
    return () => {
      if (websocket.current) {
        try { websocket.current.close(); } catch {}
      }
    };
  }, [signedIn, route]);

  // Voice panic (speech recognition)
  const voiceKeywords = ["help", "sos", "bachao", "save me", "madad"];
  const startVoice = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Voice recognition not supported in this browser.");
        return;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      const rec = new SpeechRecognition();
      rec.lang = "en-IN";
      rec.interimResults = false;
      rec.continuous = true;
      rec.onresult = (event) => {
        const transcript = Array.from(event.results).map((r) => r[0].transcript).join(" ").toLowerCase();
        if (voiceKeywords.some((k) => transcript.includes(k))) {
          try { sendPanic(); } catch (e) {}
        }
      };
      rec.onerror = () => { setVoiceListening(false); };
      rec.onend = () => { setVoiceListening(false); };
      recognitionRef.current = rec;
      rec.start();
      setVoiceListening(true);
    } catch (e) {
      setVoiceListening(false);
    }
  };
  const stopVoice = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } finally {
      setVoiceListening(false);
    }
  };

  // API handlers
  const sendPanic = async () => {
    try {
      const payload = { ...panicData, user_id: (panicData.user_id || "").trim() || "Unknown User" };
      await api.sendPanic(payload);
      alert("Panic alert sent!");
    } catch (e) {
      alert("Error sending panic alert");
    }
  };

  const sendAnomaly = async () => {
    try {
      await api.sendAnomaly(anomalyData);
      alert("Anomaly alert sent!");
    } catch (e) {
      alert("Error sending anomaly alert");
    }
  };

  const sendEscalation = async () => {
    try {
      const contacts = escalationData.contacts.split(",").map((s) => s.trim()).filter(Boolean);
      const payload = { ...escalationData, contacts };
      await api.sendEscalation(payload);
      alert("Escalation alert sent!");
    } catch (e) {
      alert("Error sending escalation alert");
    }
  };

  const fetchExplanation = async () => {
    try {
      const j = await api.getExplanation(anomalyData.anomaly_type);
      setExplanation(j.explanation);
    } catch (e) {
      alert("Error fetching explanation");
    }
  };

  const fetchGuidance = async () => {
    try {
      const j = await api.getGuidance("Metro Station XYZ", riskLevel);
      setGuidance(j);
    } catch (e) {
      alert("Error fetching guidance");
    }
  };

  // Stop voice recognition when leaving dashboard or signing out
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      setVoiceListening(false);
    };
  }, [route, signedIn]);

  // Branding logo
  const brandLogo = process.env.PUBLIC_URL + "/Raksha logo.jpg";
  const logoFallback = (e) => { e.currentTarget.src = process.env.PUBLIC_URL + "/logo192.png"; };

  // Navbar used after sign in
  const Navbar = () => (
    <nav className="navbar" style={{ background: "linear-gradient(180deg, rgba(255,240,245,0.75), rgba(255,240,245,0.6))", borderBottom: "1px solid rgba(236,72,153,0.25)", justifyContent: "flex-end" }}>
      
      <div className="nav-links">
        <button onClick={() => setRoute(ROUTES.FEATURES)} className="btn-ghost" style={{ background: "transparent" }}>Features</button>
        <button onClick={() => setRoute(ROUTES.DASHBOARD)} className="btn-ghost" style={{ background: "transparent" }}>Dashboard</button>
        <button onClick={() => setRoute(ROUTES.ABOUT)} className="btn-ghost" style={{ background: "transparent" }}>About</button>
      </div>
      <div className="nav-actions">
        <button className="btn-ghost" onClick={() => { setSignedIn(false); setPhase("auth"); }}>Logout</button>
      </div>
    </nav>
  );

  // Views
  if (phase === "splash") {
    return (
      <div className="relative" style={{ background: "#fff1f5", minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <img src={brandLogo} alt="Raksha AI" className="animate-float" style={{ width: 320, height: 320, objectFit: "contain" }} onError={logoFallback} />
          <div style={{ fontWeight: 900, fontSize: 40, letterSpacing: ".5px", color: "#db2777", textTransform: "uppercase" }}>RAKSHA AI</div>
        </div>
      </div>
    );
  }

  if (phase === "auth") {
    return (
      <div className="relative min-h-screen" style={{ background: "#fff1f5" }}>
        <div className="space-bg" aria-hidden="true" />
        <div className="particles" aria-hidden="true" />

        <nav className="navbar" style={{ background: "linear-gradient(180deg, rgba(255,240,245,0.75), rgba(255,240,245,0.6))", borderBottom: "1px solid rgba(236,72,153,0.25)", justifyContent: "flex-end" }}>
          
          <div className="nav-actions">
            <button className={authMode === "login" ? "btn-glow" : "btn-ghost"} onClick={() => setAuthMode("login")}>Login</button>
            <button className={authMode === "signup" ? "btn-glow" : "btn-ghost"} onClick={() => setAuthMode("signup")}>Sign Up</button>
          </div>
        </nav>

        <section className="center container" style={{ padding: 32 }}>
          <div className="glass hover-lift" style={{ maxWidth: 480, margin: "40px auto", padding: 24, borderRadius: 18 }}>
            <h1 style={{ fontWeight: 800, fontSize: 28, color: "#db2777", marginBottom: 12 }}>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
            {authMode === "login" ? (
              <LoginForm onSuccess={() => { setSignedIn(true); setPhase("app"); setRoute(ROUTES.HOME); }} />
            ) : (
              <SignupForm onSuccess={() => { setSignedIn(true); setPhase("app"); setRoute(ROUTES.HOME); }} />
            )}
          </div>
        </section>
      </div>
    );
  }

  // Signed-in application
  return (
    <div className="relative min-h-screen" style={{ background: "#fff1f5" }}>
      <Navbar />

      {route === ROUTES.HOME && (
        <section className="center container" style={{ padding: 24 }}>
          <div className="glass hover-lift" style={{ padding: 24, borderRadius: 18 }}>
            <h1 style={{ fontWeight: 900, fontSize: 36, color: "#db2777", marginBottom: 10 }}>Welcome to Raksha AI</h1>
            <p style={{ color: "#475569", marginBottom: 16 }}>Choose a section to continue:</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn-glow" onClick={() => setRoute(ROUTES.FEATURES)}>Explore Features</button>
              <button className="btn-glow" onClick={() => setRoute(ROUTES.DASHBOARD)}>Open Dashboard</button>
              <button className="btn-glow" onClick={() => setRoute(ROUTES.ABOUT)}>About Raksha AI</button>
            </div>
          </div>
        </section>
      )}

      {route === ROUTES.FEATURES && (
        <section className="center container" style={{ padding: 24 }}>
          <div className="glass hover-lift" style={{ padding: 24, borderRadius: 18, marginBottom: 16 }}>
            <h2 style={{ fontWeight: 800, color: "#db2777", fontSize: 28, marginBottom: 8 }}>Features</h2>
            <ul style={{ color: "#334155", lineHeight: 1.8 }}>
              <li>Instant Panic/SOS alerts with live broadcast</li>
              <li>Anomaly detection: route deviation, unsafe driving, distress voice</li>
              <li>AI explanations and actionable safety guidance</li>
              <li>Nearest support recommendations and safe route hints</li>
              <li>Real-time WebSocket alerts dashboard</li>
            </ul>
            <div style={{ marginTop: 12 }}>
              <button className="btn-ghost" onClick={() => setRoute(ROUTES.HOME)}>Home</button>
            </div>
          </div>
        </section>
      )}

      {route === ROUTES.DASHBOARD && (
        <main className="relative z-10 p-6 md:p-10 center container">
          {/* Panic */}
          <section className="glass hover-lift mb-8 max-w-2xl mx-auto p-8 animate-fadeInUp">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold" style={{ color: "#dc2626" }}>Trigger Panic Alert</h2>
              <div className="chip" title="Instant SOS">SOS</div>
            </div>

            <div className="grid gap-4 mb-6">
              <input
                placeholder="User ID"
                value={panicData.user_id}
                onChange={(e) => setPanicData({ ...panicData, user_id: e.target.value })}
                className="focus-ring w-full"
                style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.3)", background: "#fff" }}
              />
              <div className="text-xs" style={{ color: "#64748b" }}>
                Your identity is used only for alert routing. We never share it publicly.
              </div>
            </div>

            <div className="radar">
              <div className="ring" />
              <div className="ring" />
              <div className="ring" />
              <button
                onClick={sendPanic}
                className="btn-panic"
                disabled={false}
              >
                Panic Trigger
              </button>
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button onClick={voiceListening ? stopVoice : startVoice} className="btn-glow">
                {voiceListening ? 'Listening… say "help", "SOS", or "bachao"' : 'Enable Voice Panic'}
              </button>
              <span style={{ color: "#64748b", fontSize: 12 }}>
                Voice trigger sends the same alert when it hears “help”, “SOS”, or “bachao”.
              </span>
            </div>
          </section>

          {/* Anomaly */}
          <section className="glass hover-lift mb-8 max-w-2xl mx-auto p-6 animate-fadeInUp" style={{ animationDelay: "120ms" }}>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: "#b45309" }}>Send Anomaly Alert</h2>
            <select
              value={anomalyData.anomaly_type}
              onChange={(e) => setAnomalyData({ ...anomalyData, anomaly_type: e.target.value })}
              className="w-full"
              style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.3)", background: "#fff", marginBottom: 16 }}
            >
              <option value="route_deviation">Route Deviation</option>
              <option value="unsafe_driving">Unsafe Driving</option>
              <option value="distress_voice">Distress Voice</option>
            </select>
            <button onClick={sendAnomaly} className="btn-primary w-full">
              Send Anomaly
            </button>
          </section>

          {/* Escalation */}
          <section className="glass hover-lift mb-8 max-w-2xl mx-auto p-6 animate-fadeInUp" style={{ animationDelay: "220ms" }}>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: "#7c3aed" }}>Send Escalation Alert</h2>
            <label className="block mb-2 font-medium">Contacts (comma separated emails/numbers)</label>
            <input
              type="text"
              value={escalationData.contacts}
              onChange={(e) => setEscalationData({ ...escalationData, contacts: e.target.value })}
              className="w-full"
              style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.3)", background: "#fff", marginBottom: 16 }}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <select
                value={escalationData.anomaly_type}
                onChange={(e) => setEscalationData({ ...escalationData, anomaly_type: e.target.value })}
                className="w-full"
                style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.3)", background: "#fff" }}
              >
                <option value="distress_voice">Distress Voice</option>
                <option value="route_deviation">Route Deviation</option>
                <option value="unsafe_driving">Unsafe Driving</option>
              </select>
              <select
                value={escalationData.escalation_level}
                onChange={(e) => setEscalationData({ ...escalationData, escalation_level: e.target.value })}
                className="w-full"
                style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.3)", background: "#fff" }}
              >
                <option value="family">Family</option>
                <option value="fleet">Fleet</option>
                <option value="police">Police</option>
              </select>
            </div>
            <button onClick={sendEscalation} className="btn-primary w-full mt-4">
              Send Escalation
            </button>
          </section>

          {/* Explanation and Guidance */}
          <section className="mb-8 max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
            <div className="glass hover-lift p-6 animate-fadeInUp" style={{ animationDelay: "260ms" }}>
              <h2 className="text-2xl font-semibold mb-4">AI Explanation</h2>
              <button onClick={fetchExplanation} className="btn-primary mb-4">
                Get Explanation for {anomalyData.anomaly_type}
              </button>
              <p className="min-h-[60px]" style={{ color: "#334155" }}>{explanation || "Press button to load explanation"}</p>
            </div>

            <div className="glass hover-lift p-6 animate-fadeInUp" style={{ animationDelay: "300ms" }}>
              <h2 className="text-2xl font-semibold mb-4">Safety Guidance</h2>
              <select
                className="mb-4 w-full"
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.3)", background: "#fff" }}
              >
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
              <button onClick={fetchGuidance} className="btn-primary mb-4">
                Get Guidance
              </button>
              {guidance && (
                <>
                  <p className="font-medium mb-2" style={{ color: "#1f2937" }}>{guidance.guidance}</p>
                  {guidance.safe_route && guidance.safe_route.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: "#334155" }}>Safe Route Coordinates:</h3>
                      <ul className="list-disc ml-5" style={{ color: "#334155" }}>
                        {guidance.safe_route.map((point, i) => (
                          <li key={i}>
                            Lat: {point.lat.toFixed(4)}, Lng: {point.lng.toFixed(4)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Live Alerts Dashboard */}
          <section className="glass hover-lift max-w-5xl mx-auto p-6 md:p-8 mb-16 animate-fadeInUp" style={{ animationDelay: "360ms" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-extrabold" style={{ color: "#a21caf" }}>Live Alerts Dashboard</h2>
              <div className="badge" title="WebSocket live">Live</div>
            </div>
            {alerts.length === 0 && <p style={{ color: "#64748b" }}>Waiting for incoming alerts...</p>}
            <div className="grid gap-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="glass hover-lift p-4 rounded-xl border-l-4"
                  style={{ borderLeftColor: "#db2777", background: "rgba(255,255,255,0.5)" }}
                >
                  <div className="font-bold" style={{ color: "#0f172a", marginBottom: 4 }}>{alert.message}</div>
                  <div style={{ color: "#334155", fontSize: 14 }}>
                    Vehicle: {typeof alert.vehicle_id === "string" ? alert.vehicle_id : JSON.stringify(alert.vehicle_id)}
                    {" | "}Location: {typeof alert.location === "string" ? alert.location : JSON.stringify(alert.location)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button className="btn-ghost" onClick={() => setRoute(ROUTES.HOME)}>Home</button>
          </div>
        </main>
      )}

      {route === ROUTES.ABOUT && (
        <footer className="section center container">
          <div className="glass p-6" style={{ borderRadius: 18 }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#db2777" }}>About Raksha AI</h2>
            <p style={{ color: "#475569" }}>
              Raksha AI is a prototype safety platform showcasing real-time alerting via WebSocket and contextual guidance APIs.
              This UI demonstrates a clean, light-pink theme for visibility and a friendly look.
            </p>
            <div style={{ marginTop: 12 }}>
              <button className="btn-ghost" onClick={() => setRoute(ROUTES.HOME)}>Home</button>
            </div>
          </div>
          <div style={{ textAlign: "center", color: "#64748b", marginTop: 16 }}>
            © {new Date().getFullYear()} Raksha AI
          </div>
        </footer>
      )}
    </div>
  );
}

// Basic forms (no backend auth; immediate success callbacks)
function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSuccess(); }}>
      <div style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.35)", background: "#fff" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.35)", background: "#fff" }}
        />
        <button type="submit" className="btn-glow">Sign In</button>
      </div>
    </form>
  );
}

function SignupForm({ onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSuccess(); }}>
      <div style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.35)", background: "#fff" }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.35)", background: "#fff" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ height: 46, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(236,72,153,0.35)", background: "#fff" }}
        />
        <button type="submit" className="btn-glow">Create Account</button>
      </div>
    </form>
  );
}

export default App;
