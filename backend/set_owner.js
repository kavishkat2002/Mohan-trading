const db = require('./db');

async function manageUsers() {
  try {
    const { rows } = await db.query('SELECT id, email, role FROM users');
    console.log('Current users:', rows);
    if (rows.length > 0) {
      // Set first user to owner if they aren't already
      const adminEmail = rows[0].email;
      await db.query(`UPDATE users SET role = 'owner' WHERE email = $1`, [adminEmail]);
      console.log(`Set ${adminEmail} to owner`);
    } else {
      console.log('No users found in database');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

manageUsers();
