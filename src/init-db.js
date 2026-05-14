const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'ozi-db1.c306iyoqqj8p.ap-south-1.rds.amazonaws.com',
    port: 3306,
    user: 'admin',
    password: 'rLfcu9Y80S8X',
    multipleStatements: true,
  });

  const sqlPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await connection.query(sql);
  await connection.end();
  console.log('DB and table created successfully.');
}

run().catch((err) => {
  console.error('Failed to initialize DB:', err.message);
  process.exit(1);
});
