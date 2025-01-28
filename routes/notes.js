const express = require('express');
const router = express.Router();
const pool = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [notes] = await pool.execute(
      'SELECT * FROM Notes WHERE user_id = ? ORDER BY created_at DESC', 
      [req.user.user_id]
    );
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags, folder, is_pinned } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO Notes (user_id, title, content, tags, folder, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [req.user.user_id, title, content, JSON.stringify(tags), folder || false, is_pinned || false]
    );

    res.status(201).json({ note_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [notes] = await pool.execute(
      'SELECT * FROM Notes WHERE note_id = ? AND user_id = ?', 
      [req.params.id, req.user.user_id]
    );

    if (notes.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(notes[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags, folder, is_pinned } = req.body;

    // Get existing note first
    const [existingNote] = await pool.execute(
      'SELECT * FROM Notes WHERE note_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );

    if (existingNote.length === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    // Use existing values if not provided in request
    const updatedNote = {
      title: title ?? existingNote[0].title,
      content: content ?? existingNote[0].content,
      tags: tags ? JSON.stringify(tags) : existingNote[0].tags,
      folder: folder ?? existingNote[0].folder,
      is_pinned: is_pinned ?? existingNote[0].is_pinned
    };

    const [result] = await pool.execute(
      'UPDATE Notes SET title = ?, content = ?, tags = ?, folder = ?, is_pinned = ?, updated_at = NOW() WHERE note_id = ? AND user_id = ?',
      [updatedNote.title, updatedNote.content, updatedNote.tags, updatedNote.folder, updatedNote.is_pinned, req.params.id, req.user.user_id]
    );

    res.json({ message: 'Note updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM Notes WHERE note_id = ? AND user_id = ?', 
      [req.params.id, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;