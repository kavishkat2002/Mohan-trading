const db = require('./db');
db.query('SELECT * FROM users', (err, res) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(res.rows, null, 2));
  process.exit();
});
