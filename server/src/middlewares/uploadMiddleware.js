import multer from 'multer';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('Image must be JPG, PNG, or WEBP'));
    }
    callback(null, true);
  },
});

export const uploadAvatar = imageUpload.single('avatar');
export const uploadDeviceImage = imageUpload.single('image');
