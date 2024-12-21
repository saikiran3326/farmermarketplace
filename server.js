import express from 'express';
import bodyParser from 'body-parser';
import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;
dotenv.config();
const pool = new Pool({
  user: process.env.name,
  host: process.env.host,
  database: process.env.database,
  password: process.env.password,
  port: process.env.port,
});
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/login', async (req, res) => {
    console.log(req.body.email);
    const result = await pool.query(
        'SELECT * FROM buyers WHERE email=$1 AND password=$2',
        [req.body.email, req.body.password]
    );
    if (result.rows.length == 0) {
        res.json({ error: 'Invalid credentials' });
    } else {
        res.json({ name: result.rows[0].name });
    }
    });




    app.listen(9000, () => {
        console.log('Server is running on port 9000');
    });