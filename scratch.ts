const backendUrl = 'https://crazy-poets-flow.loca.lt';
const inventoryRes = await fetch(`${backendUrl}/api/vehicles`, {
  headers: {
    "Bypass-Tunnel-Reminder": "true",
    "User-Agent": "curl/7.68.0"
  }
});
console.log("Status:", inventoryRes.status);
const text = await inventoryRes.text();
console.log("Response:", text.substring(0, 200));
