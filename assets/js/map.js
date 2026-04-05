const map = L.map('map').setView([11.775, 124.886], 13);

// OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// DRIVER MARKER
L.marker([11.775, 124.886]).addTo(map)
  .bindPopup("Driver");

// CUSTOMER MARKER
L.marker([11.770, 124.880]).addTo(map)
  .bindPopup("Customer");

// ROUTE (SIMPLE LINE)
L.polyline([
  [11.775, 124.886],
  [11.770, 124.880]
], { color: 'blue', dashArray: '5,10' }).addTo(map);