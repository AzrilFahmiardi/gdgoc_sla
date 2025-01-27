const express = require('express');
const router = express.Router();
const pool = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

// POST /notes/share/:id - Share a note
router.post('/:id', authenticateToken, async (req, res) => {
  try {
    const { shared_with_email, permission_level } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO SharedNotes (note_id, shared_by_user_id, shared_with_email, permission_level, shared_at) VALUES (?, ?, ?, ?, NOW())',
      [req.params.id, req.user.user_id, shared_with_email, permission_level || 'view']
    );

    res.status(201).json({ share_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /notes/share - Get all shared notes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [sharedNotes] = await pool.execute(
      `SELECT n.*, sn.permission_level, sn.shared_at, sn.share_id, 
              u.name as shared_by_name, u.email as shared_by_email
       FROM Notes n
       JOIN SharedNotes sn ON n.note_id = sn.note_id
       JOIN Users u ON sn.shared_by_user_id = u.user_id
       WHERE sn.shared_with_email = ?`, 
      [req.user.email]
    );

    res.json(sharedNotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /notes/share/:id/:share_id - Revoke sharing
router.delete('/:id/:share_id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM SharedNotes WHERE share_id = ? AND note_id = ? AND shared_by_user_id = ?', 
      [req.params.share_id, req.params.id, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Share not found or unauthorized' });
    }

    res.json({ message: 'Note sharing revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;