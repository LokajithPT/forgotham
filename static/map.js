let map;
let pickupMarker = null;
let destinationMarker = null;
let driversMarkers = [];
let routeLine = null;
let selectedDriver = null;

// Initialize Mapbox map
function initMap() {
  mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN"; // replace with your token
  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
    center: [76.9558, 11.0168], // Coimbatore default
    zoom: 13,
  });

  map.addControl(new mapboxgl.NavigationControl());

  map.on("click", onMapClick);
}

// Handle map clicks
function onMapClick(e) {
  const coords = [e.lngLat.lng, e.lngLat.lat];

  if (!pickupMarker) {
    setPickupLocation(coords);
    updateAddress("pickup", coords);
  } else if (!destinationMarker) {
    setDestinationLocation(coords);
    updateAddress("destination", coords);
    calculateRoute();
  } else {
    clearMarkers();
    setPickupLocation(coords);
    updateAddress("pickup", coords);
  }
}

// Set pickup location
function setPickupLocation(coords) {
  if (pickupMarker) pickupMarker.remove();

  const el = document.createElement("div");
  el.className = "pickup-marker";
  el.style.cssText =
    "background-color:#4caf50;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);";
  el.innerHTML = '<i class="fas fa-map-marker-alt"></i>';

  pickupMarker = new mapboxgl.Marker(el).setLngLat(coords).addTo(map);
}

// Set destination location
function setDestinationLocation(coords) {
  if (destinationMarker) destinationMarker.remove();

  const el = document.createElement("div");
  el.className = "destination-marker";
  el.style.cssText =
    "background-color:#f44336;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);";
  el.innerHTML = '<i class="fas fa-flag-checkered"></i>';

  destinationMarker = new mapboxgl.Marker(el).setLngLat(coords).addTo(map);
}

// Update input fields
function updateAddress(type, coords) {
  document.getElementById(type).value =
    `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
}

// Use user's location
function useMyLocation() {
  if (!navigator.geolocation)
    return showStatus("Geolocation not supported", "error");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = [pos.coords.longitude, pos.coords.latitude];
      setPickupLocation(coords);
      updateAddress("pickup", coords);
      map.flyTo({ center: coords, zoom: 15 });
      showStatus("Location found! Click on map to set destination.", "success");
    },
    (err) => showStatus("Error: " + err.message, "error"),
  );
}

// Find nearby drivers (dummy example or via API)
async function findRide() {
  if (!pickupMarker) return showStatus("Please set pickup first!", "error");

  const drivers = [
    {
      id: 1,
      name: "Rajesh",
      lat: 11.02,
      lng: 76.96,
      vehicle: "bike",
      distance_to_pickup: 1.2,
      eta: 3,
    },
    {
      id: 2,
      name: "Priya",
      lat: 11.018,
      lng: 76.97,
      vehicle: "auto",
      distance_to_pickup: 1.5,
      eta: 4,
    },
  ];

  displayDrivers(drivers);
  showDriversOnMap(drivers);
  showStatus(`Found ${drivers.length} drivers nearby!`, "success");
}

// Display drivers in sidebar
function displayDrivers(drivers) {
  const list = document.getElementById("driversList");
  list.innerHTML = '<h3><i class="fas fa-users"></i> Available Drivers</h3>';

  drivers.forEach((driver) => {
    const card = document.createElement("div");
    card.className = "driver-card";
    card.onclick = () => selectDriver(driver, card);

    const icon = driver.vehicle === "bike" ? "fa-motorcycle" : "fa-car";
    card.innerHTML = `
      <div class="driver-info">
        <div class="driver-details">
          <h4>${driver.name}</h4>
          <p>${driver.distance_to_pickup.toFixed(1)} km away</p>
          <p>ETA: ${driver.eta} mins</p>
        </div>
        <div class="driver-meta">
          <div class="vehicle-icon ${driver.vehicle}">
            <i class="fas ${icon}"></i>
          </div>
          <p>${driver.vehicle.toUpperCase()}</p>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  // Book button
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.id = "bookRideBtn";
  btn.style.display = "none";
  btn.innerHTML = '<i class="fas fa-check-circle"></i> Book Selected Driver';
  btn.onclick = bookRide;
  list.appendChild(btn);
}

// Show drivers on map
function showDriversOnMap(drivers) {
  driversMarkers.forEach((m) => m.remove());
  driversMarkers = [];

  drivers.forEach((driver) => {
    const el = document.createElement("div");
    el.style.cssText =
      "background-color:#ff9800;color:white;width:35px;height:35px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);";
    el.innerHTML = `<i class="fas ${driver.vehicle === "bike" ? "fa-motorcycle" : "fa-car"}"></i>`;

    const marker = new mapboxgl.Marker(el)
      .setLngLat([driver.lng, driver.lat])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          `<b>${driver.name}</b><br>Vehicle: ${driver.vehicle.toUpperCase()}<br>Distance: ${driver.distance_to_pickup.toFixed(1)} km<br>ETA: ${driver.eta} mins`,
        ),
      )
      .addTo(map);

    driversMarkers.push(marker);
  });
}

// Select driver
function selectDriver(driver, card) {
  selectedDriver = driver;
  document
    .querySelectorAll(".driver-card")
    .forEach((c) => c.classList.remove("selected"));
  card.classList.add("selected");
  document.getElementById("bookRideBtn").style.display = "block";
  showStatus(
    `Selected ${driver.name} - ${driver.vehicle.toUpperCase()}`,
    "info",
  );
}

// Calculate route (Mapbox Directions)
async function calculateRoute() {
  if (!pickupMarker || !destinationMarker) return;

  const pickup = pickupMarker.getLngLat();
  const dest = destinationMarker.getLngLat();

  const query = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dest.lng},${dest.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
  );
  const data = await query.json();
  const route = data.routes[0].geometry.coordinates;

  // Remove existing route
  if (routeLine) (map.removeLayer("routeLine"), map.removeSource("routeLine"));

  map.addSource("routeLine", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: route },
    },
  });
  map.addLayer({
    id: "routeLine",
    type: "line",
    source: "routeLine",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#667eea", "line-width": 5 },
  });

  const bounds = new mapboxgl.LngLatBounds();
  route.forEach((c) => bounds.extend(c));
  map.fitBounds(bounds, { padding: 50 });

  // Update route info
  document.getElementById("distance").textContent = (
    data.routes[0].distance / 1000
  ).toFixed(2);
  document.getElementById("duration").textContent = Math.round(
    data.routes[0].duration / 60,
  );
  document.getElementById("fare").textContent = (
    (data.routes[0].distance / 1000) *
    8
  ).toFixed(2);
  document.getElementById("routeInfo").classList.add("show");
}

// Book ride simulation
function bookRide() {
  if (!selectedDriver) return showStatus("Select a driver first!", "error");

  showStatus("Ride booked! Simulating driver...", "success");
  const driverMarker = driversMarkers.find((m) =>
    m.getPopup().getText().includes(selectedDriver.name),
  );

  if (!driverMarker) return;

  const pickup = pickupMarker.getLngLat();
  const dest = destinationMarker.getLngLat();

  const pathToPickup = generatePath(driverMarker.getLngLat(), pickup);
  moveDriver(driverMarker, pathToPickup, 200, () => {
    showStatus(`${selectedDriver.name} arrived at Pickup!`, "success");
    const pathToDest = generatePath(pickup, dest);
    moveDriver(driverMarker, pathToDest, 200, () =>
      showStatus(
        `${selectedDriver.name} dropped you at Destination!`,
        "success",
      ),
    );
  });
}

// Generate straight path
function generatePath(start, end, steps = 50) {
  const path = [];
  const latStep = (end.lat - start.lat) / steps;
  const lngStep = (end.lng - start.lng) / steps;
  for (let i = 0; i <= steps; i++)
    path.push({ lat: start.lat + latStep * i, lng: start.lng + lngStep * i });
  return path;
}

// Animate driver along path
function moveDriver(marker, path, speed = 100, cb) {
  let i = 0;
  function step() {
    if (i < path.length) {
      marker.setLngLat([path[i].lng, path[i].lat]);
      i++;
      setTimeout(step, speed);
    } else if (cb) cb();
  }
  step();
}

// Clear all markers & route
function clearMarkers() {
  pickupMarker?.remove();
  destinationMarker?.remove();
  driversMarkers.forEach((m) => m.remove());
  pickupMarker = null;
  destinationMarker = null;
  driversMarkers = [];
  selectedDriver = null;
  document.getElementById("pickup").value = "";
  document.getElementById("destination").value = "";
  document.getElementById("routeInfo").classList.remove("show");
  document.getElementById("driversList").innerHTML = "";
}

// Show status messages
function showStatus(msg, type = "info") {
  let el = document.getElementById("status");
  if (!el) {
    el = document.createElement("div");
    el.id = "status";
    el.style.cssText =
      "position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;color:white;font-weight:bold;z-index:1000;max-width:300px;word-wrap:break-word;";
    document.body.appendChild(el);
  }
  const colors = {
    success: "#4caf50",
    error: "#f44336",
    warning: "#ff9800",
    info: "#2196f3",
  };
  el.style.backgroundColor = colors[type] || colors.info;
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 4000);
}

// Init on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.style.background = "linear-gradient(45deg,#f44336,#d32f2f)";
  resetBtn.innerHTML = '<i class="fas fa-refresh"></i> Reset Map';
  resetBtn.onclick = clearMarkers;
  document.querySelector(".controls-panel").appendChild(resetBtn);
  showStatus("Click on map to set pickup location!", "info");
});
