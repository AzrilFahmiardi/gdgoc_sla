const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('../models/database');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      'INSERT INTO Users (name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [name, email, passwordHash]
    );

    res.status(201).json({ user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute('SELECT * FROM Users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ token, user_id: user.user_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;