const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'pdf', 'doc', 'docx'],
    resource_type: 'auto'
  }
});

const upload = multer({ storage });

module.exports = upload;