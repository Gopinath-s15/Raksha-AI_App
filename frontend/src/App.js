import React, { useEffect, useState } from "react";

function App() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAlerts((prev) => [data, ...prev]);
    };
    return () => ws.close();
  }, []);
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">RAKSHA AI Dashboard</h1>
      {alerts.map((alert, idx) => (
        <div key={idx} className="bg-white shadow p-4 mb-4 rounded">
          <div className="font-bold">{alert.message}</div>
          <div>Vehicle: {alert.vehicle_id}</div>
          <div>Location: {alert.location}</div>
        </div>
      ))}
    </div>
  );
}

export default App;