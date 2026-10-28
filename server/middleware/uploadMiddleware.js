import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

export const handlePostUploadError = (error, req, res, next) => {
  if (!error) return next();
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Each photo or video must be 25 MB or smaller"
      : "Unable to receive this media file. Please try another file.";
    return res.status(400).json({ message });
  }
  return res.status(400).json({ message: error.message || "Unable to receive this media file" });
};

export default upload;
