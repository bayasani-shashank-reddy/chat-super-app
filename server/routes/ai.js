const router = require('express').Router();

// Simple AI echo bot – replace with actual AI API if needed
router.post('/', (req, res) => {
  const { message } = req.body;
  res.json({ reply: `AI: I received "${message}"` });
});

module.exports = router;