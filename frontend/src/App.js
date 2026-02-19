import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker, Circle, DirectionsRenderer } from "@react-google-maps/api";

/* ========================================================================== */
/* 1. CONSTANTS & CONFIGURATION                                               */
/* ========================================================================== */

const GOOGLE_MAPS_API_KEY = "AIzaSyCluNUrBDx91SkH6pg8QRzU9g8tnqFYsto"; // <-- INSERT KEY HERE

const MAP_CENTER = { lat: 28.6139, lng: 77.2090 };

const MAP_STYLES = {
  disableDefaultUI: true,
  mapTypeId: "hybrid",
  styles: [
    { elementType: "geometry", stylers: [{ color: "#121b2b" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1f304a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#080c14" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#4f7b91" }] },
    { elementType: "labels.text.stroke", stylers: [{ visibility: "off" }] }
  ]
};

const INITIAL_ZONES = [
  { id: "z1", name: "Connaught Place", lat: 28.6315, lng: 77.2167, aqi: 180 },
  { id: "z2", name: "Anand Vihar", lat: 28.6469, lng: 77.3153, aqi: 295 },
  { id: "z3", name: "Dwarka", lat: 28.5921, lng: 77.0460, aqi: 140 },
  { id: "z4", name: "Rohini", lat: 28.7041, lng: 77.1025, aqi: 220 }
];

const INITIAL_BOTS = [
  { id: "b1", name: "Auto-Drone Alpha", lat: 28.61, lng: 77.22, score: 3200, fuel: 100, water: 100, bot: true },
  { id: "b2", name: "Auto-Drone Beta", lat: 28.65, lng: 77.15, score: 2150, fuel: 100, water: 100, bot: true }
];

const getAqiColor = (aqi) => {
  if (aqi > 250) return "#ff0055"; // Severe
  if (aqi > 150) return "#ffaa00"; // Moderate
  return "#00ff88"; // Safe
};

/* ========================================================================== */
/* 2. ROOT APP (STATE & SIMULATION ENGINE)                                    */
/* ========================================================================== */

export default function App() {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [drivers, setDrivers] = useState(INITIAL_BOTS);
  const [logs, setLogs] = useState(["[SYS] Core systems online."]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ["geometry"]
  });

  const addLog = useCallback((msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 8));
  }, []);

  // GLOBAL SIMULATION: Bots move & AQI fluctuates
  useEffect(() => {
    const simInterval = setInterval(() => {
      // 1. Fluctuate AQI randomly
      setZones(prevZones => prevZones.map(z => ({
        ...z,
        aqi: Math.max(50, z.aqi + (Math.random() > 0.5 ? 2 : -1))
      })));

      // 2. Bots slowly move toward the highest AQI zone autonomously
      setDrivers(prevDrivers => {
        // We need the current highest zone to guide bots
        const currentHighestZone = [...zones].sort((a, b) => b.aqi - a.aqi)[0];
        
        return prevDrivers.map(d => {
          if (!d.bot) return d; // Ignore human players
          
          // Simple linear interpolation towards target
          const latDiff = currentHighestZone.lat - d.lat;
          const lngDiff = currentHighestZone.lng - d.lng;
          
          // If close enough, they "sprinkle" and gain score automatically
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          if (distance < 0.01) {
             return { ...d, score: d.score + 5 };
          }
          
          return {
            ...d,
            lat: d.lat + latDiff * 0.02,
            lng: d.lng + lngDiff * 0.02
          };
        });
      });
    }, 2000);

    return () => clearInterval(simInterval);
  }, [zones]); // Depend on zones to know the current highest

  if (loadError) return <div style={styles.errorScreen}>API Key Invalid or Network Error.</div>;
  if (!isLoaded) return <div style={styles.loaderScreen}>LINKING WITH SATELLITE...</div>;

  return (
    <Router>
      <div style={styles.appWrapper}>
        <Routes>
          <Route path="/" element={<Login setDrivers={setDrivers} addLog={addLog} />} />
          <Route path="/admin" element={<AdminPanel zones={zones} drivers={drivers} logs={logs} />} />
          <Route 
            path="/driver/:id" 
            element={<DriverUI zones={zones} setZones={setZones} drivers={drivers} setDrivers={setDrivers} addLog={addLog} logs={logs} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

/* ========================================================================== */
/* 3. LOGIN SCREEN                                                            */
/* ========================================================================== */

function Login({ setDrivers, addLog }) {
  const navigate = useNavigate();
  const [callsign, setCallsign] = useState("");

  const handleLogin = (role) => {
    if (role === "admin") {
      addLog("Command Center Access Granted.");
      navigate("/admin");
    } else {
      if (!callsign.trim()) return alert("Callsign required for deployment.");
      const newId = `human_${Date.now()}`;
      setDrivers(prev => [
        ...prev.filter(d => d.bot), // Keep bots, remove old humans if any
        { id: newId, name: callsign, lat: 28.52, lng: 77.20, score: 0, fuel: 100, water: 100, bot: false }
      ]);
      addLog(`Unit ${callsign} linked to global grid.`);
      navigate(`/driver/${newId}`);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.glassBox}>
        <h1 style={{ fontSize: '42px', letterSpacing: '6px', color: '#fff', margin: 0 }}>SKYNET C2</h1>
        <p style={{ color: '#00d4ff', letterSpacing: '3px', marginBottom: '30px' }}>ENVIRONMENTAL RECON</p>
        <input 
          style={styles.inputField} 
          placeholder="ENTER PILOT CALLSIGN" 
          value={callsign}
          onChange={e => setCallsign(e.target.value)}
        />
        <button style={styles.btnPrimary} onClick={() => handleLogin("driver")}>INITIATE DEPLOYMENT</button>
        <button style={styles.btnSecondary} onClick={() => handleLogin("admin")}>ACCESS ADMIN PANEL</button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 4. ADMIN PANEL (LEADERBOARD & OMNI-VIEW)                                   */
/* ========================================================================== */

function AdminPanel({ zones, drivers, logs }) {
  const navigate = useNavigate();
  
  // Sort drivers for Leaderboard
  const sortedDrivers = [...drivers].sort((a, b) => b.score - a.score);

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <div style={styles.brand}>
          <h2>COMMAND CENTER</h2>
          <span style={{ color: '#ffaa00', fontSize: '12px' }}>OMNI-VIEW ACTIVE</span>
        </div>

        <div style={styles.panelSection}>
          <h4 style={styles.panelHeader}>GLOBAL LEADERBOARD</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {sortedDrivers.map((d, index) => (
              <div key={d.id} style={styles.leaderboardRow}>
                <span style={{ color: d.bot ? '#94a3b8' : '#00d4ff', fontWeight: 'bold' }}>
                  {index + 1}. {d.name} {d.bot ? '(AI)' : '(PILOT)'}
                </span>
                <span style={{ color: '#00ff88' }}>{d.score} XP</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.panelSection}>
          <h4 style={styles.panelHeader}>CRITICAL ZONES</h4>
          {zones.sort((a,b) => b.aqi - a.aqi).map(z => (
            <div key={z.id} style={styles.zoneRow}>
              <span>{z.name}</span>
              <span style={{ color: getAqiColor(z.aqi), fontWeight: 'bold' }}>{z.aqi} AQI</span>
            </div>
          ))}
        </div>

        <div style={styles.terminal}>
          {logs.map((log, i) => <div key={i} style={styles.logLine}>{log}</div>)}
        </div>
        
        <button onClick={() => navigate("/")} style={styles.btnDanger}>DISCONNECT TERMINAL</button>
      </div>

      <div style={styles.mapArea}>
        <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={MAP_CENTER} zoom={11} options={MAP_STYLES}>
          {zones.map(z => (
            <React.Fragment key={z.id}>
              <Circle center={{ lat: z.lat, lng: z.lng }} radius={2500} options={{ fillColor: getAqiColor(z.aqi), fillOpacity: 0.25, strokeColor: getAqiColor(z.aqi), strokeWeight: 2 }} />
              <Marker position={{ lat: z.lat, lng: z.lng }} label={{ text: `${z.aqi}`, color: 'white', fontWeight: 'bold' }} />
            </React.Fragment>
          ))}
          {drivers.map(d => (
            <Marker key={d.id} position={{ lat: d.lat, lng: d.lng }} label={{ text: d.bot ? "🤖" : "🚀", fontSize: '20px' }} />
          ))}
        </GoogleMap>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 5. DRIVER UI (MOVEMENT & LOGIC ENGINE)                                     */
/* ========================================================================== */

function DriverUI({ zones, setZones, drivers, setDrivers, addLog, logs }) {
  const navigate = useNavigate();
  // Extract the ID from the URL (we passed it during login)
  const driverId = window.location.pathname.split("/").pop();
  
  const me = useMemo(() => drivers.find(d => d.id === driverId), [drivers, driverId]);
  const targetZone = useMemo(() => [...zones].sort((a, b) => b.aqi - a.aqi)[0], [zones]);

  const [routeInfo, setRouteInfo] = useState(null);
  const [movementState, setMovementState] = useState("IDLE"); // IDLE, EN_ROUTE, ARRIVED
  const [isSprinkling, setIsSprinkling] = useState(false);
  
  // Ref to hold the active path coordinates
  const activePathRef = useRef([]);

  // --- MAP ROUTING LOGIC (Bulletproof) ---
  useEffect(() => {
    if (!me || movementState !== "IDLE") return; // Only fetch route if we are idle

    const fetchRoute = async () => {
      const ds = new window.google.maps.DirectionsService();
      try {
        const result = await ds.route({
          origin: { lat: me.lat, lng: me.lng },
          destination: { lat: targetZone.lat, lng: targetZone.lng },
          travelMode: "DRIVING"
        });
        
        setRouteInfo(result);
        
        // Extract the exact polyline points for our custom movement engine
        const path = result.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
        activePathRef.current = path;
        
      } catch (error) {
        console.error("Routing Error:", error);
      }
    };

    fetchRoute();
  }, [targetZone.id]); // ONLY recalculate when the global target changes.

  // --- MOVEMENT ENGINE ---
  useEffect(() => {
    if (movementState !== "EN_ROUTE" || !me) return;

    let pathIndex = 0;
    const path = activePathRef.current;

    if (!path || path.length === 0) {
      setMovementState("ARRIVED");
      return;
    }

    const moveInterval = setInterval(() => {
      if (pathIndex >= path.length) {
        clearInterval(moveInterval);
        setMovementState("ARRIVED");
        addLog(`Arrived at objective: ${targetZone.name}`);
        setRouteInfo(null); // Clear the blue line
        return;
      }

      const nextPoint = path[pathIndex];
      
      setDrivers(prev => prev.map(d => 
        d.id === me.id ? { 
          ...d, 
          lat: nextPoint.lat, 
          lng: nextPoint.lng,
          fuel: Math.max(0, d.fuel - 0.2) // Deplete fuel while moving
        } : d
      ));

      pathIndex++;
    }, 200); // Speed of marker movement (lower is faster)

    return () => clearInterval(moveInterval);
  }, [movementState, targetZone.name, addLog, setDrivers]);

  // --- SPRINKLING LOGIC ---
  useEffect(() => {
    if (!isSprinkling || !me) return;

    if (me.water <= 0) {
      setIsSprinkling(false);
      addLog("WARNING: Water reserves depleted.");
      return;
    }

    const sprayInterval = setInterval(() => {
      // Lower AQI
      setZones(prev => prev.map(z => z.id === targetZone.id ? { ...z, aqi: Math.max(50, z.aqi - 4) } : z));
      // Increase XP & Decrease Water
      setDrivers(prev => prev.map(d => d.id === me.id ? { ...d, water: d.water - 1, score: d.score + 25 } : d));
    }, 1000);

    return () => clearInterval(sprayInterval);
  }, [isSprinkling, targetZone.id, me, addLog, setZones, setDrivers]);

  // Handle Deploy Click
  const handleDeploy = () => {
    if (me.fuel <= 5) return alert("Insufficient fuel to deploy.");
    setMovementState("EN_ROUTE");
    addLog(`Navigating to ${targetZone.name}...`);
  };

  if (!me) return <div style={styles.errorScreen}>Connection Lost. Return to Login. <button onClick={()=>navigate("/")}>Login</button></div>;

  return (
    <div style={styles.layout}>
      {/* SIDEBAR TELEMETRY */}
      <div style={styles.sidebar}>
         <div style={styles.brand}>
          <h2>HUD // {me.name.toUpperCase()}</h2>
          <span style={{ color: '#00ff88', fontSize: '12px' }}>STATUS: {movementState}</span>
        </div>

        <div style={styles.panelSection}>
          <h4 style={styles.panelHeader}>UNIT DIAGNOSTICS</h4>
          <TelemetryBar label="WATER SUPPLY" value={me.water} color="#00d4ff" />
          <TelemetryBar label="FUEL LEVEL" value={me.fuel} color="#ffaa00" />
          <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>COMBAT XP</span>
            <strong style={{ color: '#00ff88', fontSize: '18px' }}>{me.score}</strong>
          </div>
        </div>

        <div style={styles.panelSection}>
          <h4 style={styles.panelHeader}>PRIMARY OBJECTIVE</h4>
          <h3 style={{ margin: '0 0 5px 0', color: '#ff0055' }}>{targetZone.name}</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>Current AQI: {targetZone.aqi}</p>
        </div>

        <div style={styles.terminal}>
          {logs.map((log, i) => <div key={i} style={styles.logLine}>{log}</div>)}
        </div>

        <button onClick={() => navigate("/")} style={styles.btnDanger}>EJECT PILOT</button>
      </div>

      {/* MAP AREA */}
      <div style={styles.mapArea}>
        <GoogleMap 
          mapContainerStyle={{ width: '100%', height: '100%' }} 
          center={{ lat: me.lat, lng: me.lng }} 
          zoom={14} 
          options={MAP_STYLES}
        >
          {zones.map(z => (
             <Circle key={z.id} center={{ lat: z.lat, lng: z.lng }} radius={2000} options={{ fillColor: getAqiColor(z.aqi), fillOpacity: 0.3, strokeWeight: 0 }} />
          ))}

          {/* All Units */}
          {drivers.map(d => (
            <Marker 
              key={d.id} 
              position={{ lat: d.lat, lng: d.lng }} 
              label={{ text: d.id === me.id ? "YOU" : "BOT", color: '#fff', fontSize: '10px', fontWeight: 'bold' }} 
              icon={{
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: d.id === me.id ? 6 : 4,
                fillColor: d.id === me.id ? "#00d4ff" : "#94a3b8",
                fillOpacity: 1,
                strokeWeight: 2,
                rotation: 0
              }}
            />
          ))}

          {/* Render the calculated route ONLY if we are IDLE or EN_ROUTE */}
          {routeInfo && movementState !== "ARRIVED" && (
            <DirectionsRenderer directions={routeInfo} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#00d4ff", strokeWeight: 4 } }} />
          )}
        </GoogleMap>

        {/* BOTTOM ACTION BAR */}
        <div style={styles.bottomControls}>
          {movementState === "IDLE" && (
            <button style={styles.btnActionBlue} onClick={handleDeploy}>DEPLOY TO TARGET</button>
          )}
          {movementState === "EN_ROUTE" && (
            <button style={{...styles.btnActionBlue, background: '#475569', color: '#94a3b8', cursor: 'not-allowed'}} disabled>
              EN ROUTE...
            </button>
          )}
          {movementState === "ARRIVED" && (
            <button 
              style={{ ...styles.btnActionBlue, background: isSprinkling ? '#ff0055' : '#00ff88', color: '#000' }}
              onClick={() => {
                setIsSprinkling(!isSprinkling);
                addLog(isSprinkling ? "Sprayer Deactivated." : "Sprayer Engaged. Neutralizing Dust.");
              }}
            >
              {isSprinkling ? "CEASE SPRAYER" : "ENGAGE SPRAYER"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 6. REUSABLE UI WIDGETS & STYLES                                            */
/* ========================================================================== */

const TelemetryBar = ({ label, value, color }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
      <span>{label}</span>
      <span style={{ color: '#fff' }}>{Math.floor(value)}%</span>
    </div>
    <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
    </div>
  </div>
);

const styles = {
  // Screens
  loaderScreen: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#00d4ff', letterSpacing: '4px', fontFamily: "monospace" },
  errorScreen: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#ff0055', fontFamily: "monospace" },
  overlay: { height: '100vh', background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "monospace" },
  
  // Login
  glassBox: { textAlign: 'center', padding: '60px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', borderRadius: '12px', backdropFilter: 'blur(10px)' },
  inputField: { width: '300px', padding: '15px', marginBottom: '20px', background: '#020617', border: '1px solid #00d4ff', color: '#00d4ff', textAlign: 'center', letterSpacing: '2px', outline: 'none' },
  btnPrimary: { display: 'block', width: '332px', padding: '15px', marginBottom: '15px', background: '#00d4ff', border: 'none', color: '#020617', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer' },
  btnSecondary: { display: 'block', width: '332px', padding: '15px', background: 'transparent', border: '1px solid #00d4ff', color: '#00d4ff', cursor: 'pointer', letterSpacing: '1px' },
  
  // Dashboard Layout
  layout: { display: 'flex', height: '100vh', background: '#020617', color: '#f8fafc', fontFamily: "monospace", overflow: 'hidden' },
  sidebar: { width: '320px', background: '#0f172a', borderRight: '1px solid #1e293b', padding: '25px', display: 'flex', flexDirection: 'column', zIndex: 10 },
  mapArea: { flex: 1, position: 'relative' },
  brand: { borderBottom: '1px solid #1e293b', paddingBottom: '15px', marginBottom: '20px' },
  panelSection: { background: 'rgba(2, 6, 23, 0.5)', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '15px' },
  panelHeader: { fontSize: '11px', color: '#64748b', margin: '0 0 10px 0', letterSpacing: '1px' },
  
  // Rows & Lists
  leaderboardRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: '13px' },
  zoneRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '12px' },
  
  // Terminal
  terminal: { flex: 1, background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px', overflowY: 'hidden', fontSize: '10px', color: '#94a3b8' },
  logLine: { marginBottom: '6px', borderLeft: '2px solid #00ff88', paddingLeft: '8px' },
  
  // Controls
  btnDanger: { marginTop: '20px', padding: '12px', background: 'transparent', border: '1px solid #ff0055', color: '#ff0055', cursor: 'pointer', fontWeight: 'bold' },
  bottomControls: { position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)' },
  btnActionBlue: { padding: '15px 40px', background: '#00d4ff', border: 'none', borderRadius: '4px', color: '#020617', fontWeight: 'bold', fontSize: '14px', letterSpacing: '2px', cursor: 'pointer', boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)' }
};