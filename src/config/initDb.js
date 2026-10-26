"use strict";

const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initializeDatabase() {
  const sqlPath = path.join(__dirname, '..', '..', 'database.sql');
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('PostgreSQL schema and seeds successfully initialized from database.sql.');
    return true;
  } catch (error) {
    console.error('Error executing database initialization script:', error.message);
    throw error;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Initialization failed:', err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
