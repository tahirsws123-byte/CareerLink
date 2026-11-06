import { fileTypeFromBuffer } from "file-type";
import multer from "multer";

const storage = multer.memoryStorage();

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const POST_MEDIA_TYPES = new Set([
  ...IMAGE_TYPES,
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MESSAGE_ATTACHMENT_TYPES = new Set([
  ...POST_MEDIA_TYPES,
  "image/gif",
  ...RESUME_TYPES,
]);

const filesFromRequest = (req) => {
  if (req.file) return [req.file];
  if (!req.files) return [];
  return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
};

const isLegacyWordDocument = (buffer) => {
  const compoundFileSignature = Buffer.from("d0cf11e0a1b11ae1", "hex");
  if (!buffer.subarray(0, compoundFileSignature.length).equals(compoundFileSignature)) {
    return false;
  }

  const wordStreamAscii = Buffer.from("WordDocument");
  const wordStreamUtf16 = Buffer.from("WordDocument", "utf16le");
  return buffer.includes(wordStreamAscii) || buffer.includes(wordStreamUtf16);
};

const detectMimeType = async (file) => {
  if (isLegacyWordDocument(file.buffer)) return "application/msword";
  const detected = await fileTypeFromBuffer(file.buffer);
  return detected?.mime || null;
};

const validateFile = async (file, allowedTypes) => {
  const detectedMimeType = await detectMimeType(file);
  if (!detectedMimeType || !allowedTypes.has(detectedMimeType)) {
    throw new Error("Unsupported or invalid file type");
  }

  file.mimetype = detectedMimeType;
};

const uploadErrorResponse = (error, res) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File exceeds the upload size limit" });
  }

  const message = error instanceof multer.MulterError
    ? "Unable to receive this file. Please check the upload and try again."
    : error.message || "Unable to validate this file";
  return res.status(400).json({ message });
};

export const createUploader = ({ fileSize, maxFiles, allowedTypes }) => {
  const parser = multer({
    storage,
    limits: {
      fileSize,
      files: maxFiles,
    },
  });

  const wrap = (parse) => (req, res, next) => {
    parse(req, res, (parseError) => {
      if (parseError) return uploadErrorResponse(parseError, res);

      Promise.all(filesFromRequest(req).map((file) => validateFile(file, allowedTypes)))
        .then(() => next())
        .catch((validationError) => uploadErrorResponse(validationError, res));
    });
  };

  return {
    single: (field) => wrap(parser.single(field)),
    fields: (fields) => wrap(parser.fields(fields)),
  };
};

export const imageUpload = createUploader({
  fileSize: 10 * 1024 * 1024,
  maxFiles: 2,
  allowedTypes: IMAGE_TYPES,
});

export const commentImageUpload = createUploader({
  fileSize: 10 * 1024 * 1024,
  maxFiles: 1,
  allowedTypes: new Set([...IMAGE_TYPES, "image/gif"]),
});

export const postMediaUpload = createUploader({
  fileSize: 25 * 1024 * 1024,
  maxFiles: 2,
  allowedTypes: POST_MEDIA_TYPES,
});

export const resumeUpload = createUploader({
  fileSize: 10 * 1024 * 1024,
  maxFiles: 1,
  allowedTypes: RESUME_TYPES,
});

export const attachmentUpload = createUploader({
  fileSize: 25 * 1024 * 1024,
  maxFiles: 1,
  allowedTypes: MESSAGE_ATTACHMENT_TYPES,
});

export const companyLogoUpload = createUploader({
  fileSize: 5 * 1024 * 1024,
  maxFiles: 1,
  allowedTypes: new Set(["image/jpeg", "image/png"]),
});

export const companyPageMediaUpload = createUploader({
  fileSize: 10 * 1024 * 1024,
  maxFiles: 2,
  allowedTypes: IMAGE_TYPES,
});

export const handleCompanyPageMediaUploadError = (error, req, res, next) => {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Page images must be 10 MB or smaller" });
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: "Unable to receive page images. Please try another file." });
  }
  return res.status(400).json({ message: error.message || "Unable to receive page images" });
};

export const handleCompanyLogoUploadError = (error, req, res, next) => {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Logo must be 5 MB or smaller" });
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: "Unable to receive this logo file. Please try another file." });
  }
  return res.status(400).json({ message: error.message || "Unable to receive this logo file" });
};

export const handlePostUploadError = (error, req, res, next) => {
  if (!error) return next();
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Each photo or video must be 25 MB or smaller"
      : "Unable to receive this media file. Please try another file.";
    return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message });
  }
  return res.status(400).json({ message: error.message || "Unable to receive this media file" });
};

export default imageUpload;
