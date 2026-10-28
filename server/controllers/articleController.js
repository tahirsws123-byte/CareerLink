import mongoose from "mongoose";
import Article from "../models/Article.js";
import User from "../models/User.js";
import { destroyCloudinaryAsset, uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

const articleAuthorFields = "name email headline profilePicture";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const cleanString = (value, field, maxLength, { required = false } = {}) => {
  if (value === undefined || value === null) {
    if (required) {
      throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
    }
    return "";
  }

  if (typeof value !== "string") {
    throw Object.assign(new Error(`${field} must be text`), { statusCode: 400 });
  }

  const cleaned = value.trim();

  if (required && !cleaned) {
    throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
  }

  if (cleaned.length > maxLength) {
    throw Object.assign(new Error(`${field} must be ${maxLength} characters or fewer`), { statusCode: 400 });
  }

  return cleaned;
};

const parseArticlePayload = (body) => {
  const title = cleanString(body.title, "Title", 180, { required: true });
  const content = cleanString(body.content, "Content", 20000, { required: true });

  if (title.length < 3) {
    throw Object.assign(new Error("Title must be at least 3 characters"), { statusCode: 400 });
  }

  if (content.length < 20) {
    throw Object.assign(new Error("Content must be at least 20 characters"), { statusCode: 400 });
  }

  const excerpt = cleanString(body.excerpt || "", "Excerpt", 280);

  return {
    title,
    content,
    excerpt: excerpt || content.slice(0, 180),
  };
};

const populateArticle = (query) =>
  query.populate("author", articleAuthorFields);

export const createArticle = async (req, res) => {
  let uploadedAsset = null;

  try {
    const payload = parseArticlePayload(req.body);
    const coverFile = req.file;

    if (coverFile && !IMAGE_MIME_TYPES.has(coverFile.mimetype)) {
      throw Object.assign(new Error("Only JPG, PNG, and WEBP images are allowed"), { statusCode: 400 });
    }

    let coverImage = { url: "", publicId: "" };
    if (coverFile) {
      const uploadResult = await uploadBufferToCloudinary(coverFile, {
        folder: "careerlink/article-covers",
        resource_type: "image",
      });

      uploadedAsset = { publicId: uploadResult.public_id, options: {} };
      coverImage = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id || "",
      };
    }

    const article = await Article.create({
      author: req.user._id,
      ...payload,
      coverImage,
    });

    const populatedArticle = await populateArticle(Article.findById(article._id));

    return res.status(201).json(populatedArticle);
  } catch (error) {
    if (uploadedAsset?.publicId) {
      await destroyCloudinaryAsset(uploadedAsset.publicId, uploadedAsset.options);
    }

    const status = error.statusCode || 500;
    if (status === 500) console.error("Create article error:", error);
    return res.status(status).json({
      message: status === 500 ? "Failed to create article" : error.message,
    });
  }
};

export const getArticles = async (req, res) => {
  try {
    const articles = await populateArticle(
      Article.find().sort({ createdAt: -1 }).limit(50),
    );

    return res.status(200).json({ articles });
  } catch (error) {
    console.error("Get article list error:", error);
    return res.status(500).json({ message: "Failed to load articles" });
  }
};

export const getSavedArticles = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedArticles").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const articles = await populateArticle(
      Article.find({ _id: { $in: user.savedArticles || [] }, published: true }).sort({ createdAt: -1 }),
    );
    return res.json({ articles });
  } catch (error) {
    console.error("Get saved articles error:", error);
    return res.status(500).json({ message: "Unable to load saved articles" });
  }
};

export const toggleSavedArticle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.articleId)) return res.status(400).json({ message: "Invalid article ID" });
    const article = await Article.findOne({ _id: req.params.articleId, published: true }).select("_id");
    if (!article) return res.status(404).json({ message: "Article not found" });
    const user = await User.findById(req.user._id).select("savedArticles");
    if (!user) return res.status(404).json({ message: "User not found" });
    const alreadySaved = user.savedArticles.some((savedId) => savedId.toString() === article._id.toString());
    if (alreadySaved) user.savedArticles = user.savedArticles.filter((savedId) => savedId.toString() !== article._id.toString());
    else user.savedArticles.push(article._id);
    await user.save();
    return res.json({ saved: !alreadySaved });
  } catch (error) {
    console.error("Toggle saved article error:", error);
    return res.status(500).json({ message: "Unable to update saved article" });
  }
};

export const getArticleById = async (req, res) => {
  try {
    const { articleId } = req.params;

    if (!mongoose.isValidObjectId(articleId)) {
      return res.status(400).json({ message: "Invalid article ID" });
    }

    const article = await populateArticle(Article.findById(articleId));

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const saved = await User.exists({ _id: req.user._id, savedArticles: article._id });
    return res.status(200).json({ article, saved: Boolean(saved) });
  } catch (error) {
    console.error("Get article error:", error);
    return res.status(500).json({ message: "Failed to load article" });
  }
};

export const updateArticle = async (req, res) => {
  let uploadedAsset = null;

  try {
    const { articleId } = req.params;

    if (!mongoose.isValidObjectId(articleId)) {
      return res.status(400).json({ message: "Invalid article ID" });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to edit this article" });
    }

    const payload = parseArticlePayload(req.body);
    const coverFile = req.file;

    if (coverFile && !IMAGE_MIME_TYPES.has(coverFile.mimetype)) {
      throw Object.assign(new Error("Only JPG, PNG, and WEBP images are allowed"), { statusCode: 400 });
    }

    const cleanupItems = [];
    if (article.coverImage?.publicId && (coverFile || req.body.removeCover === "true")) {
      cleanupItems.push({ publicId: article.coverImage.publicId, options: {} });
      article.coverImage = { url: "", publicId: "" };
    }

    if (coverFile) {
      const uploadResult = await uploadBufferToCloudinary(coverFile, {
        folder: "careerlink/article-covers",
        resource_type: "image",
      });

      uploadedAsset = { publicId: uploadResult.public_id, options: {} };
      article.coverImage = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id || "",
      };
    }

    article.title = payload.title;
    article.content = payload.content;
    article.excerpt = payload.excerpt;
    article.published = true;

    await article.save();
    await Promise.all(cleanupItems.map((item) => destroyCloudinaryAsset(item.publicId, item.options)));

    const updatedArticle = await populateArticle(Article.findById(article._id));
    return res.status(200).json({ article: updatedArticle });
  } catch (error) {
    if (uploadedAsset?.publicId) {
      await destroyCloudinaryAsset(uploadedAsset.publicId, uploadedAsset.options);
    }

    const status = error.statusCode || 500;
    if (status === 500) console.error("Update article error:", error);
    return res.status(status).json({
      message: status === 500 ? "Failed to update article" : error.message,
    });
  }
};

export const deleteArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    if (!mongoose.isValidObjectId(articleId)) {
      return res.status(400).json({ message: "Invalid article ID" });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this article" });
    }

    if (article.coverImage?.publicId) {
      await destroyCloudinaryAsset(article.coverImage.publicId, {});
    }

    await article.deleteOne();

    return res.status(200).json({ message: "Article deleted successfully" });
  } catch (error) {
    console.error("Delete article error:", error);
    return res.status(500).json({ message: "Failed to delete article" });
  }
};
