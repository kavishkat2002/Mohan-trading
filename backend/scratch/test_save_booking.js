require('dotenv').config();
const db = require('../db');
async function run() {
  const vehicleIdInt = 6;
  const leadId = 44;
  const bookingDate = new Date("2026-08-01T13:00:00.000Z");
  try {
    const { rows: conflicts } = await db.query(
      `SELECT id FROM test_drives
       WHERE vehicle_id = $1
         AND lead_id != $2
         AND status != 'Cancelled'
         AND ABS(EXTRACT(EPOCH FROM (booking_date - $3::timestamptz))) < 3600`,
      [vehicleIdInt, leadId, bookingDate.toISOString()]
    );
    console.log("Conflicts:", conflicts);
    const { rows: inserted } = await db.query(
      `INSERT INTO test_drives (lead_id, vehicle_id, booking_date, notes, status, source)
       VALUES ($1, $2, $3, $4, 'Scheduled', 'whatsapp_confirmed')
       RETURNING id`,
      [leadId, vehicleIdInt, bookingDate.toISOString(), 'Confirmed via WhatsApp AI Agent']
    );
    console.log("Inserted:", inserted);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
run();
