require('dotenv').config();
const db = require('./db');

async function seed() {
  console.log('Seeding dummy data...');

  // ─── Get first user id for assignments ───
  const { rows: users } = await db.query('SELECT id FROM users LIMIT 3');
  const uid1 = users[0]?.id || 1;
  const uid2 = users[1]?.id || 1;
  const uid3 = users[2]?.id || 1;

  // ─── TASKS ───────────────────────────────
  await db.query(`
    INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by) VALUES
    ('Follow up with Ahmed Al-Rashid', 'Call the lead who enquired about BMW 5 Series. Offer a test drive slot.', 'Pending', 'High', NOW() + INTERVAL '2 days', $1, $2),
    ('Prepare vehicle inspection report', 'Complete the detailed inspection checklist for Toyota Land Cruiser before listing.', 'In Progress', 'Medium', NOW() + INTERVAL '1 day', $2, $1),
    ('Update showroom display', 'Rearrange front showroom layout and add new price tags for the latest arrivals.', 'Pending', 'Low', NOW() + INTERVAL '5 days', $3, $1),
    ('Process sale documentation', 'Complete transfer of ownership paperwork for Nissan Patrol sold to Khalid Mohammed.', 'Completed', 'High', NOW() - INTERVAL '1 day', $1, $2),
    ('Social media post for new arrivals', 'Create and schedule Instagram posts showcasing the three new vehicles in stock.', 'In Progress', 'Medium', NOW() + INTERVAL '3 days', $2, $1),
    ('Service appointment scheduling', 'Book the Mitsubishi Montero for its pre-sale service check at the authorized service center.', 'Pending', 'Medium', NOW() + INTERVAL '4 days', $3, $2),
    ('Negotiate trade-in value', 'Meet with client Ravi Perera to discuss trade-in price for his 2019 Honda Vezel.', 'Pending', 'High', NOW() + INTERVAL '1 day', $1, $1)
    ON CONFLICT DO NOTHING
  `, [uid1, uid2, uid3]);
  console.log('✅ Tasks inserted');

  // ─── EXPENSES ────────────────────────────
  await db.query(`
    INSERT INTO expenses (category, amount, description, date, account) VALUES
    ('Fuel', 12500, 'Fuel for vehicle transport from Colombo port', CURRENT_DATE - 5, 'Cash'),
    ('Repair', 85000, 'Engine overhaul and full service for Toyota Land Cruiser 200', CURRENT_DATE - 10, 'Bank'),
    ('Advertising', 45000, 'Facebook & Instagram ad campaign for May promotions', CURRENT_DATE - 3, 'Bank'),
    ('Office', 18000, 'Monthly office rent and utilities', CURRENT_DATE - 15, 'Bank'),
    ('Transport', 9500, 'Delivery of Nissan Patrol to customer location in Kandy', CURRENT_DATE - 2, 'Cash'),
    ('Repair', 32000, 'Full body repaint and dent removal for BMW 5 Series', CURRENT_DATE - 7, 'Bank'),
    ('Fuel', 8000, 'Test drive vehicle fuel top-ups for the week', CURRENT_DATE - 1, 'Cash'),
    ('Office', 5500, 'Stationery, printing and documentation costs', CURRENT_DATE, 'Cash'),
    ('Advertising', 22000, 'Ikman.lk premium listing for 4 vehicles', CURRENT_DATE - 4, 'Bank')
    ON CONFLICT DO NOTHING
  `);
  console.log('✅ Expenses inserted');

  // ─── CASH FLOW ───────────────────────────
  await db.query(`
    INSERT INTO cash_flow (type, account, amount, description, date) VALUES
    ('Income',  'Bank', 8500000, 'Sale of Toyota Land Cruiser 200 to Mr. Sampath', CURRENT_DATE - 12),
    ('Income',  'Bank', 5200000, 'Sale of BMW 530i to Ms. Dilrukshi Fernando', CURRENT_DATE - 8),
    ('Expense', 'Bank', 85000,   'Engine overhaul for Land Cruiser', CURRENT_DATE - 10),
    ('Expense', 'Cash', 12500,   'Port transport fuel', CURRENT_DATE - 5),
    ('Income',  'Cash', 3800000, 'Cash sale of Honda Vezel to walk-in customer', CURRENT_DATE - 3),
    ('Expense', 'Bank', 45000,   'Digital marketing campaign spend', CURRENT_DATE - 3),
    ('Income',  'Bank', 6900000, 'Nissan Patrol sold to Mr. Khalid', CURRENT_DATE - 1),
    ('Expense', 'Bank', 18000,   'Monthly office rent', CURRENT_DATE - 15),
    ('Expense', 'Cash', 9500,    'Delivery transport cost', CURRENT_DATE - 2),
    ('Income',  'Bank', 4100000, 'Mitsubishi Montero sale — bank transfer', CURRENT_DATE)
    ON CONFLICT DO NOTHING
  `);
  console.log('✅ Cash flow inserted');

  console.log('\n🎉 Seeding complete!');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
