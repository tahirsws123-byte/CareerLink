import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const uploadBufferToCloudinary = (file, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    const source = streamifier.createReadStream(file.buffer);
    source.on("error", reject);
    stream.on("error", reject);
    source.pipe(stream);
  });

export const destroyCloudinaryAsset = async (publicId, options = {}) => {
  if (!publicId) return null;

  try {
    return await cloudinary.uploader.destroy(publicId, options);
  } catch (error) {
    console.error("Cloudinary cleanup failed:", error.message);
    return null;
  }
};
