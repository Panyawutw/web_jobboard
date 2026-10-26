"use strict";

require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 3000
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'job_board_db',
        connectionTimeoutMillis: 3000
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
