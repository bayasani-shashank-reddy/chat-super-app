const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Single file upload
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  try {
    res.json({ fileUrl: req.file.path, fileType: req.file.mimetype.split('/')[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;