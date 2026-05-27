const db = require('./db');

async function test() {
  try {
    console.log('1. Inserting vehicle_sales...');
    const res1 = await db.query(
      "INSERT INTO vehicle_sales (vehicle_id, lead_id, selling_price, sale_date, payment_method) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [2, 5, 7250000, '2026-05-27', 'Bank']
    );
    console.log('INSERT SUCCESS:', res1.rows[0]);

    console.log('2. Updating vehicle stock...');
    const res2 = await db.query("UPDATE vehicles SET stock = stock - 1 WHERE id = $1", [2]);
    console.log('UPDATE SUCCESS:', res2.rowCount);

    console.log('3. Inserting cash_flow...');
    const res3 = await db.query(
      "INSERT INTO cash_flow (type, account, amount, description, date) VALUES ('Income', $1, $2, $3, $4)",
      ['Bank', 7250000, `Vehicle Sale ID: 2`, '2026-05-27']
    );
    console.log('CASH FLOW SUCCESS:', res3.rowCount);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
}

test();
