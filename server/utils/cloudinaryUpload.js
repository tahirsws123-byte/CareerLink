import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const uploadBufferToCloudinary = (file, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(new Error("Cloudinary asset upload failed"));
        resolve(result);
      },
    );

    const source = streamifier.createReadStream(file.buffer);
    source.on("error", reject);
    stream.on("error", () => reject(new Error("Cloudinary asset upload failed")));
    source.pipe(stream);
  });

export const destroyCloudinaryAsset = async (publicId, options = {}) => {
  if (!publicId) return null;

  try {
    return await cloudinary.uploader.destroy(publicId, options);
  } catch {
    console.error("Cloudinary cleanup failed");
    return null;
  }
};
