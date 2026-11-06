import CompanyPage, { COMPANY_PAGE_SIZES, COMPANY_PAGE_TYPES } from "../models/CompanyPage.js";
import Post from "../models/Post.js";
import Job from "../models/Job.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import { destroyCloudinaryAsset, uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import mongoose from "mongoose";

const COMPANY_POST_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const COMPANY_POST_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const COMPANY_PAGE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COMPANY_PAGE_BUTTON_LABELS = ["Contact us", "Request demo", "Learn more", "Register", "Sign up", "Visit website", "Visit portfolio", "Visit store"];
const WORKPLACE_POLICIES = ["On-site", "Hybrid", "Remote"];
const COMPANY_PAGE_ADMIN_ROLES = ["content_admin", "analyst"];

const getCompanyPageAdminRole = async (companyPageId, userId) => {
  const companyPage = await CompanyPage.findById(companyPageId).select("owner admins").lean();
  if (!companyPage) return null;
  if (companyPage.owner.toString() === userId.toString()) return "super_admin";
  return companyPage.admins?.find((admin) => admin.user.toString() === userId.toString())?.role || null;
};

const validationError = (message) => Object.assign(new Error(message), { statusCode: 400 });

const cleanText = (value, field, maxLength, { required = false } = {}) => {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw validationError(`${field} must be text`);
  }

  const cleaned = value.trim();
  if (required && !cleaned) throw validationError(`${field} is required`);
  if (cleaned.length > maxLength) throw validationError(`${field} must be ${maxLength} characters or fewer`);
  return cleaned;
};

const uploadCompanyPostMedia = async (file, options) => {
  let uploaded;
  try {
    uploaded = await uploadBufferToCloudinary(file, options);
  } catch (error) {
    console.error("Company page post media upload failed:", error);
    throw Object.assign(new Error("Media upload failed. Please try a supported file under 25 MB."), { statusCode: 502 });
  }
  if (!uploaded?.secure_url) {
    if (uploaded?.public_id) {
      await destroyCloudinaryAsset(
        uploaded.public_id,
        options.resource_type === "video" ? { resource_type: "video" } : {},
      );
    }
    throw Object.assign(new Error("Media upload failed. Please try again."), { statusCode: 502 });
  }
  return uploaded;
};

const cleanWebsite = (value) => {
  const website = cleanText(value, "Website", 300);
  if (!website) return "";

  const normalized = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw validationError("Website must be a valid web address");
  }

  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".") || parsed.username || parsed.password) {
    throw validationError("Website must be a valid web address");
  }

  return parsed.toString();
};

const parseBoolean = (value, field) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  throw validationError(`${field} must be true or false`);
};

const uploadCompanyPageImage = async (file, folder) => {
  if (!file) return null;
  if (!COMPANY_PAGE_IMAGE_TYPES.has(file.mimetype)) {
    throw validationError("Page images must be JPG, PNG, or WEBP");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw validationError("Page images must be 10 MB or smaller");
  }
  const uploaded = await uploadBufferToCloudinary(file, {
    folder,
    resource_type: "image",
  });
  if (!uploaded?.secure_url) {
    if (uploaded?.public_id) await destroyCloudinaryAsset(uploaded.public_id);
    throw Object.assign(new Error("Image upload failed. Please try again."), { statusCode: 502 });
  }
  return { url: uploaded.secure_url, publicId: uploaded.public_id || "" };
};

export const updateCompanyPage = async (req, res) => {
  const uploadedAssets = [];
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }

    const companyPage = await CompanyPage.findOne({
      _id: req.params.companyPageId,
      owner: req.user._id,
    });
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });

    const name = cleanText(req.body.name, "Name", 120, { required: true });
    const publicUrlSlug = cleanText(req.body.publicUrlSlug, "Public URL", 80, { required: true }).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicUrlSlug)) {
      throw validationError("Public URL can contain lowercase letters, numbers, and single hyphens");
    }

    const industry = cleanText(req.body.industry, "Industry", 100, { required: true });
    const companySize = cleanText(req.body.companySize, "Organization size", 40, { required: true });
    const companyType = cleanText(req.body.companyType, "Organization type", 40, { required: true });
    if (!COMPANY_PAGE_SIZES.includes(companySize)) throw validationError("Select a valid organization size");
    if (!COMPANY_PAGE_TYPES.includes(companyType)) throw validationError("Select a valid organization type");

    let specialties;
    try {
      specialties = JSON.parse(req.body.specialties || "[]");
    } catch {
      throw validationError("Specialties must be a valid list");
    }
    if (!Array.isArray(specialties) || specialties.length > 20) {
      throw validationError("Add no more than 20 specialties");
    }
    specialties = specialties.map((specialty) => cleanText(specialty, "Specialty", 100, { required: true }));

    const enabled = parseBoolean(req.body.customButtonEnabled, "Custom button");
    const buttonLabel = cleanText(req.body.customButtonLabel, "Button name", 40, { required: enabled });
    if (enabled && !COMPANY_PAGE_BUTTON_LABELS.includes(buttonLabel)) {
      throw validationError("Select a valid custom button");
    }
    const customButtonUrl = enabled ? cleanWebsite(req.body.customButtonUrl) : "";
    if (enabled && !customButtonUrl) throw validationError("Button URL is required");

    const workplaceEnabled = parseBoolean(req.body.workplaceEnabled, "Workplace module");
    const workplacePolicy = cleanText(req.body.workplacePolicy, "Workplace policy", 20);
    if (workplaceEnabled && !WORKPLACE_POLICIES.includes(workplacePolicy)) {
      throw validationError("Select a valid workplace policy");
    }

    const files = req.files || {};
    const logoFile = files.logo?.[0];
    if (logoFile && logoFile.size > 5 * 1024 * 1024) {
      throw validationError("Logo must be 5 MB or smaller");
    }
    const logo = await uploadCompanyPageImage(logoFile, "careerlink/company-page-logos");
    if (logo?.publicId) uploadedAssets.push(logo.publicId);
    const banner = await uploadCompanyPageImage(files.banner?.[0], "careerlink/company-page-banners");
    if (banner?.publicId) uploadedAssets.push(banner.publicId);

    const previousLogoPublicId = companyPage.logo?.publicId;
    const previousBannerPublicId = companyPage.banner?.publicId;
    companyPage.name = name;
    companyPage.publicUrlSlug = publicUrlSlug;
    companyPage.website = cleanWebsite(req.body.website);
    companyPage.industry = industry;
    companyPage.companySize = companySize;
    companyPage.companyType = companyType;
    companyPage.overview = cleanText(req.body.overview, "Overview", 2000);
    companyPage.phone = cleanText(req.body.phone, "Phone", 30);
    const yearFounded = req.body.yearFounded ? Number(req.body.yearFounded) : null;
    if (yearFounded !== null && (!Number.isInteger(yearFounded) || yearFounded < 1800 || yearFounded > new Date().getFullYear())) {
      throw validationError("Enter a valid year founded");
    }
    companyPage.yearFounded = yearFounded;
    companyPage.specialties = specialties;
    companyPage.tagline = cleanText(req.body.tagline, "Tagline", 120);
    companyPage.messagingEnabled = parseBoolean(req.body.messagingEnabled, "Message button");
    companyPage.customButton = { enabled, label: buttonLabel || "Visit website", url: customButtonUrl };
    companyPage.workplace = { enabled: workplaceEnabled, policy: workplaceEnabled ? workplacePolicy : "" };
    if (logo) companyPage.logo = logo;
    if (banner) companyPage.banner = banner;
    if (req.body.removeLogo === "true") companyPage.logo = { url: "", publicId: "" };
    if (req.body.removeBanner === "true") companyPage.banner = { url: "", publicId: "" };

    await companyPage.save();
    uploadedAssets.length = 0;
    if (logo && previousLogoPublicId) await destroyCloudinaryAsset(previousLogoPublicId);
    if (banner && previousBannerPublicId) await destroyCloudinaryAsset(previousBannerPublicId);
    if (req.body.removeLogo === "true" && previousLogoPublicId) await destroyCloudinaryAsset(previousLogoPublicId);
    if (req.body.removeBanner === "true" && previousBannerPublicId) await destroyCloudinaryAsset(previousBannerPublicId);

    return res.json({
      companyPage: {
        _id: companyPage._id,
        name: companyPage.name,
        publicUrlSlug: companyPage.publicUrlSlug,
        website: companyPage.website,
        industry: companyPage.industry,
        companySize: companyPage.companySize,
        companyType: companyPage.companyType,
        overview: companyPage.overview,
        phone: companyPage.phone,
        yearFounded: companyPage.yearFounded,
        specialties: companyPage.specialties,
        logo: companyPage.logo,
        banner: companyPage.banner,
        tagline: companyPage.tagline,
        messagingEnabled: companyPage.messagingEnabled,
        customButton: companyPage.customButton,
        workplace: companyPage.workplace,
        active: companyPage.active !== false,
        createdAt: companyPage.createdAt,
      },
    });
  } catch (error) {
    await Promise.all(uploadedAssets.map((publicId) => destroyCloudinaryAsset(publicId)));
    if (error.code === 11000 && error.keyPattern?.publicUrlSlug) {
      return res.status(409).json({ message: "This public URL is already in use. Choose another one." });
    }
    const status = error.statusCode || 500;
    if (status === 500) console.error("Failed to update company page:", error);
    return res.status(status).json({
      message: status === 500 ? "Unable to update the company page" : error.message,
    });
  }
};

export const getCompanyPageSettings = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) return res.status(400).json({ message: "Invalid company page ID" });
    const companyPage = await CompanyPage.findOne({
      _id: req.params.companyPageId,
      owner: req.user._id,
    })
      .populate("owner", "name")
      .populate("admins.user", "name headline profilePicture")
      .populate("blockedMembers", "name headline profilePicture")
      .populate("blockedPages", "name publicUrlSlug logo industry")
      .populate("followedPages", "name publicUrlSlug logo industry");
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });
    return res.json({
      settings: {
        messagingEnabled: companyPage.messagingEnabled,
        conversationTopics: companyPage.conversationTopics,
        followedPages: companyPage.followedPages,
        blockedMembers: companyPage.blockedMembers,
        blockedPages: companyPage.blockedPages,
        jobPostingDomains: companyPage.jobPostingDomains,
        basicJobPostingEnabled: companyPage.basicJobPostingEnabled,
        shareNewJobs: companyPage.shareNewJobs,
        active: companyPage.active !== false,
        owner: companyPage.owner,
        admins: companyPage.admins,
        currentRole: await getCompanyPageAdminRole(companyPage._id, req.user._id),
      },
    });
  } catch (error) {
    console.error("Get company page settings error:", error);
    return res.status(500).json({ message: "Unable to load Company Page settings" });
  }
};

export const updateCompanyPageSettings = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) return res.status(400).json({ message: "Invalid company page ID" });
    const companyPage = await CompanyPage.findOne({ _id: req.params.companyPageId, owner: req.user._id });
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });

    const { messagingEnabled, conversationTopics, jobPostingDomains, basicJobPostingEnabled, shareNewJobs } = req.body;
    if (typeof messagingEnabled !== "boolean" || typeof basicJobPostingEnabled !== "boolean" || typeof shareNewJobs !== "boolean") {
      return res.status(400).json({ message: "Settings toggles must be true or false" });
    }
    const allowedTopics = ["Service request", "Request a demo", "Support", "Careers", "Other"];
    if (!Array.isArray(conversationTopics) || conversationTopics.length > allowedTopics.length
      || conversationTopics.some((topic) => !allowedTopics.includes(topic))
      || (messagingEnabled && conversationTopics.length < 2)) {
      return res.status(400).json({ message: "Choose at least two valid conversation topics when messaging is enabled" });
    }
    if (!Array.isArray(jobPostingDomains) || jobPostingDomains.length > 50
      || jobPostingDomains.some((domain) => typeof domain !== "string"
        || domain.trim().length > 253
        || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain.trim()))) {
      return res.status(400).json({ message: "Enter valid email domains (for example, example.com)" });
    }
    companyPage.messagingEnabled = messagingEnabled;
    companyPage.conversationTopics = [...new Set(conversationTopics)];
    companyPage.jobPostingDomains = [...new Set(jobPostingDomains.map((domain) => domain.trim().toLowerCase()))];
    companyPage.basicJobPostingEnabled = basicJobPostingEnabled;
    companyPage.shareNewJobs = shareNewJobs;
    await companyPage.save();
    return res.json({ settings: {
      messagingEnabled: companyPage.messagingEnabled,
      conversationTopics: companyPage.conversationTopics,
      jobPostingDomains: companyPage.jobPostingDomains,
      basicJobPostingEnabled: companyPage.basicJobPostingEnabled,
      shareNewJobs: companyPage.shareNewJobs,
    } });
  } catch (error) {
    console.error("Update company page settings error:", error);
    return res.status(500).json({ message: "Unable to save Company Page settings" });
  }
};

export const addCompanyPageAdmin = async (req, res) => {
  try {
    const { companyPageId } = req.params;
    const { userId, role } = req.body;
    if (!mongoose.isValidObjectId(companyPageId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Choose a valid Company Page and member" });
    }
    if (!COMPANY_PAGE_ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ message: "Choose a valid admin role" });
    }
    const companyPage = await CompanyPage.findOne({ _id: companyPageId, owner: req.user._id });
    if (!companyPage) return res.status(404).json({ message: "Company Page not found or you are not its Super admin" });
    if (companyPage.owner.toString() === userId || (companyPage.admins || []).some((admin) => admin.user.toString() === userId)) {
      return res.status(409).json({ message: "This member already manages the Company Page" });
    }
    const user = await User.findOne({ _id: userId, accountStatus: { $ne: "deactivated" } }).select("_id");
    if (!user) return res.status(404).json({ message: "Member not found" });
    const result = await CompanyPage.updateOne(
      { _id: companyPageId, owner: req.user._id, "admins.user": { $ne: user._id } },
      { $push: { admins: { user: user._id, role, addedBy: req.user._id } } },
    );
    if (!result.modifiedCount) return res.status(409).json({ message: "This member already manages the Company Page" });
    return res.status(201).json({ message: "Page admin added" });
  } catch (error) {
    console.error("Add Company Page admin error:", error);
    return res.status(500).json({ message: "Unable to add this page admin" });
  }
};

export const updateCompanyPageAdminRole = async (req, res) => {
  try {
    const { companyPageId, adminId } = req.params;
    const { role } = req.body;
    if (![companyPageId, adminId].every(mongoose.isValidObjectId)) return res.status(400).json({ message: "Invalid Company Page or admin ID" });
    if (!COMPANY_PAGE_ADMIN_ROLES.includes(role)) return res.status(400).json({ message: "Choose a valid admin role" });
    const result = await CompanyPage.updateOne(
      { _id: companyPageId, owner: req.user._id, "admins.user": adminId },
      { $set: { "admins.$.role": role } },
    );
    if (!result.matchedCount) return res.status(404).json({ message: "Page admin not found or you are not the Super admin" });
    return res.json({ message: "Admin role updated" });
  } catch (error) {
    console.error("Update Company Page admin role error:", error);
    return res.status(500).json({ message: "Unable to update this admin role" });
  }
};

export const removeCompanyPageAdmin = async (req, res) => {
  try {
    const { companyPageId, adminId } = req.params;
    if (![companyPageId, adminId].every(mongoose.isValidObjectId)) return res.status(400).json({ message: "Invalid Company Page or admin ID" });
    const result = await CompanyPage.updateOne(
      { _id: companyPageId, owner: req.user._id, "admins.user": adminId },
      { $pull: { admins: { user: adminId } } },
    );
    if (!result.modifiedCount) return res.status(404).json({ message: "Page admin not found or you are not the Super admin" });
    return res.json({ message: "Page admin removed" });
  } catch (error) {
    console.error("Remove Company Page admin error:", error);
    return res.status(500).json({ message: "Unable to remove this page admin" });
  }
};

export const transferCompanyPageSuperAdmin = async (req, res) => {
  try {
    const { companyPageId, adminId } = req.params;
    if (![companyPageId, adminId].every(mongoose.isValidObjectId)) return res.status(400).json({ message: "Invalid Company Page or admin ID" });
    const companyPage = await CompanyPage.findOne({ _id: companyPageId, owner: req.user._id, "admins.user": adminId });
    if (!companyPage) return res.status(404).json({ message: "Choose an existing page admin to receive the Super admin role" });

    const formerSuperAdmin = req.user._id;
    const transfer = await CompanyPage.updateOne(
      { _id: companyPageId, owner: formerSuperAdmin, "admins.user": adminId },
      [{ $set: {
        owner: { $toObjectId: adminId },
        admins: {
          $concatArrays: [
            {
              $filter: {
                input: "$admins",
                as: "admin",
                cond: { $ne: ["$$admin.user", { $toObjectId: adminId }] },
              },
            },
            [{
              user: formerSuperAdmin,
              role: "content_admin",
              addedBy: formerSuperAdmin,
              addedAt: new Date(),
              _id: new mongoose.Types.ObjectId(),
            }],
          ],
        },
      } }],
    );
    if (!transfer.modifiedCount) return res.status(409).json({ message: "The Super admin changed. Refresh and try again." });
    return res.json({ message: "Super admin role transferred" });
  } catch (error) {
    console.error("Transfer Company Page Super admin error:", error);
    return res.status(500).json({ message: "Unable to transfer the Super admin role" });
  }
};

export const toggleCompanyPageRelationship = async (req, res) => {
  try {
    const { companyPageId, kind, targetId } = req.params;
    if (![companyPageId, targetId].every(mongoose.isValidObjectId)) return res.status(400).json({ message: "Invalid page or member ID" });
    if (!["following", "blocked-members", "blocked-pages"].includes(kind)) return res.status(400).json({ message: "Invalid relationship type" });
    const companyPage = await CompanyPage.findOne({ _id: companyPageId, owner: req.user._id }).select("followedPages blockedMembers blockedPages");
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });

    const isMember = kind === "blocked-members";
    const field = kind === "following" ? "followedPages" : isMember ? "blockedMembers" : "blockedPages";
    const alreadyAdded = (companyPage[field] || []).some((id) => id.toString() === targetId);
    const target = isMember
      ? await User.findOne({ _id: targetId, ...(alreadyAdded ? {} : { accountStatus: { $ne: "deactivated" } }) }).select("_id")
      : await CompanyPage.findOne({ _id: targetId, ...(alreadyAdded ? {} : { active: { $ne: false } }) }).select("_id");
    if (!target || (!isMember && target._id.toString() === companyPageId)) return res.status(404).json({ message: "Member or Company Page not found" });
    if (kind === "following" && !alreadyAdded
      && (companyPage.blockedPages || []).some((id) => id.toString() === targetId)) {
      return res.status(409).json({ message: "Unblock this Page before following it" });
    }
    const update = alreadyAdded
      ? { $pull: { [field]: targetId } }
      : { $addToSet: { [field]: targetId } };
    if (kind === "blocked-pages" && !alreadyAdded) update.$pull = { followedPages: targetId };
    if (kind === "blocked-members" && !alreadyAdded) update.$pull = { followers: { user: targetId } };
    await CompanyPage.updateOne({ _id: companyPageId, owner: req.user._id }, update);
    return res.json({ active: !alreadyAdded });
  } catch (error) {
    console.error("Update company page relationship error:", error);
    return res.status(500).json({ message: "Unable to update this Company Page setting" });
  }
};

export const setCompanyPageActive = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) return res.status(400).json({ message: "Invalid company page ID" });
    const companyPage = await CompanyPage.findOne({ _id: req.params.companyPageId, owner: req.user._id });
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });
    if (typeof req.body.active !== "boolean") return res.status(400).json({ message: "Choose whether to activate or deactivate this page" });
    if (!req.body.active && req.body.confirmation !== companyPage.name) {
      return res.status(400).json({ message: "Enter the exact Company Page name to confirm deactivation" });
    }
    companyPage.active = req.body.active;
    companyPage.deactivatedAt = req.body.active ? null : new Date();
    await companyPage.save();
    return res.json({ active: companyPage.active });
  } catch (error) {
    console.error("Change Company Page status error:", error);
    return res.status(500).json({ message: "Unable to update Company Page status" });
  }
};

export const createCompanyPage = async (req, res) => {
  let uploadedLogoPublicId = "";
  try {
    const name = cleanText(req.body.name, "Name", 120, { required: true });
    const publicUrlSlug = cleanText(req.body.publicUrlSlug, "Public URL", 80, { required: true }).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicUrlSlug)) {
      throw validationError("Public URL can contain lowercase letters, numbers, and single hyphens");
    }

    const industry = cleanText(req.body.industry, "Industry", 100, { required: true });
    const companySize = cleanText(req.body.companySize, "Organization size", 40, { required: true });
    const companyType = cleanText(req.body.companyType, "Organization type", 40, { required: true });
    if (!COMPANY_PAGE_SIZES.includes(companySize)) throw validationError("Select a valid organization size");
    if (!COMPANY_PAGE_TYPES.includes(companyType)) throw validationError("Select a valid organization type");

    const logoFile = req.file;
    if (logoFile && !["image/jpeg", "image/png"].includes(logoFile.mimetype)) {
      throw validationError("Logo must be a JPG, JPEG, or PNG image");
    }
    if (logoFile && logoFile.size > 5 * 1024 * 1024) {
      throw validationError("Logo must be 5 MB or smaller");
    }

    let logo = { url: "", publicId: "" };
    if (logoFile) {
      const uploaded = await uploadBufferToCloudinary(logoFile, {
        folder: "careerlink/company-page-logos",
        resource_type: "image",
      });
      uploadedLogoPublicId = uploaded.public_id || "";
      logo = { url: uploaded.secure_url, publicId: uploadedLogoPublicId };
    }

    const companyPage = await CompanyPage.create({
      name,
      publicUrlSlug,
      website: cleanWebsite(req.body.website),
      industry,
      companySize,
      companyType,
      logo,
      tagline: cleanText(req.body.tagline, "Tagline", 120),
      owner: req.user._id,
    });

    return res.status(201).json({
      companyPage: {
        _id: companyPage._id,
        name: companyPage.name,
        publicUrlSlug: companyPage.publicUrlSlug,
        website: companyPage.website,
        industry: companyPage.industry,
        companySize: companyPage.companySize,
        companyType: companyPage.companyType,
        logo: companyPage.logo,
        tagline: companyPage.tagline,
        createdAt: companyPage.createdAt,
      },
    });
  } catch (error) {
    if (uploadedLogoPublicId) await destroyCloudinaryAsset(uploadedLogoPublicId);
    if (error.code === 11000 && error.keyPattern?.publicUrlSlug) {
      return res.status(409).json({ message: "This public URL is already in use. Choose another one." });
    }
    const status = error.statusCode || 500;
    if (status === 500) console.error("Failed to create company page:", error);
    return res.status(status).json({
      message: status === 500 ? "Unable to create the company page" : error.message,
    });
  }
};

export const listMyCompanyPages = async (req, res) => {
  try {
    const companyPages = await CompanyPage.find({
      $or: [{ owner: req.user._id }, { "admins.user": req.user._id }],
    })
      .select("_id name publicUrlSlug logo industry createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ companyPages });
  } catch (error) {
    console.error("Failed to load company pages:", error);
    return res.status(500).json({ message: "Unable to load your company pages" });
  }
};

export const listFollowedCompanyPages = async (req, res) => {
  try {
    const companyPages = await CompanyPage.find({ "followers.user": req.user._id, active: { $ne: false } })
      .select("_id name publicUrlSlug logo industry tagline followers")
      .sort({ "followers.followedAt": -1 })
      .lean();

    return res.json({
      companyPages: companyPages.map((page) => ({
        _id: page._id,
        name: page.name,
        publicUrlSlug: page.publicUrlSlug,
        logo: page.logo,
        industry: page.industry,
        tagline: page.tagline,
        followerCount: (page.followers || []).length,
      })),
    });
  } catch (error) {
    console.error("Failed to load followed company pages:", error);
    return res.status(500).json({ message: "Unable to load followed company pages" });
  }
};

export const getPublicCompanyPage = async (req, res) => {
  try {
    let companyPage = await CompanyPage.findOne({ publicUrlSlug: req.params.publicUrlSlug }).lean();
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });
    if (companyPage.active === false && req.user?._id?.toString() !== companyPage.owner.toString()) {
      return res.status(404).json({ message: "Company page not found" });
    }

    if (!req.user || companyPage.owner.toString() !== req.user._id.toString()) {
      companyPage = await CompanyPage.findByIdAndUpdate(
        companyPage._id,
        { $inc: { pageVisits: 1 } },
        { returnDocument: "after" },
      ).lean();
    }

    const isOwner = req.user && companyPage.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      await Post.updateMany(
        { companyPage: companyPage._id, groupPostStatus: "approved" },
        { $inc: { impressions: 1 } },
      );
    }
    const posts = await Post.find({
      companyPage: companyPage._id,
      groupPostStatus: "approved",
      author: { $nin: companyPage.blockedMembers || [] },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("author", "name headline profilePicture")
      .populate("companyPage", "name publicUrlSlug logo")
      .populate("job", "title company location salary")
      .lean();
    const jobs = await Job.find({ companyPage: companyPage._id, status: "open" })
      .select("title company location type level workMode salary description tags createdAt applicantCount views")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const followers = companyPage.followers || [];
    const following = Boolean(req.user && followers.some((follower) =>
      follower.user.toString() === req.user._id.toString(),
    ));

    return res.json({
      companyPage: {
        _id: companyPage._id,
        ownerId: companyPage.owner,
        name: companyPage.name,
        publicUrlSlug: companyPage.publicUrlSlug,
        website: companyPage.website,
        industry: companyPage.industry,
        companySize: companyPage.companySize,
        companyType: companyPage.companyType,
        overview: companyPage.overview,
        phone: companyPage.phone,
        yearFounded: companyPage.yearFounded,
        specialties: companyPage.specialties,
        logo: companyPage.logo,
        banner: companyPage.banner,
        tagline: companyPage.tagline,
        messagingEnabled: companyPage.messagingEnabled,
        conversationTopics: companyPage.conversationTopics,
        customButton: companyPage.customButton,
        workplace: companyPage.workplace,
        followerCount: followers.length,
        isFollowing: following,
        isBlocked: Boolean(req.user && (companyPage.blockedMembers || []).some((id) => id.toString() === req.user._id.toString())),
        isOwner: Boolean(isOwner),
      },
      posts,
      jobs,
    });
  } catch (error) {
    console.error("Failed to load public company page:", error);
    return res.status(500).json({ message: "Unable to load this company page" });
  }
};

export const discoverCompanyPages = async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
    const filter = search
      ? {
          active: { $ne: false },
          $or: [
            { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { industry: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          ],
        }
      : { active: { $ne: false } };
    const pages = await CompanyPage.find(filter)
      .select("_id name publicUrlSlug logo industry tagline followers owner")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (search && pages.length) {
      await CompanyPage.updateMany(
        { _id: { $in: pages.map((page) => page._id) } },
        { $inc: { searchAppearances: 1 } },
      );
    }

    return res.json({
      companyPages: pages.map((page) => ({
        _id: page._id,
        name: page.name,
        publicUrlSlug: page.publicUrlSlug,
        logo: page.logo,
        industry: page.industry,
        tagline: page.tagline,
        followerCount: (page.followers || []).length,
        isFollowing: Boolean(req.user && (page.followers || []).some((follower) =>
          follower.user.toString() === req.user._id.toString(),
        )),
        isOwner: Boolean(req.user && page.owner.toString() === req.user._id.toString()),
      })),
    });
  } catch (error) {
    console.error("Failed to discover company pages:", error);
    return res.status(500).json({ message: "Unable to discover company pages" });
  }
};

export const toggleCompanyPageFollow = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }
    const companyPage = await CompanyPage.findOne({ _id: req.params.companyPageId, active: { $ne: false } });
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });

    const userId = req.user._id.toString();
    companyPage.followers = companyPage.followers || [];
    if (companyPage.owner.toString() === userId) {
      return res.status(400).json({ message: "You already manage this company page" });
    }
    if ((companyPage.blockedMembers || []).some((id) => id.toString() === userId)) {
      return res.status(403).json({ message: "This Company Page does not allow you to follow it" });
    }
    const isFollowing = companyPage.followers.some((follower) => follower.user.toString() === userId);
    if (isFollowing) {
      await CompanyPage.updateOne(
          { _id: companyPage._id, "followers.user": req.user._id },
          { $pull: { followers: { user: req.user._id } } },
      );
    } else {
      await CompanyPage.updateOne(
          { _id: companyPage._id, "followers.user": { $ne: req.user._id } },
          { $push: { followers: { user: req.user._id, followedAt: new Date() } } },
      );
    }
    const latestPage = await CompanyPage.findById(companyPage._id).select("followers").lean();
    if (!latestPage) return res.status(404).json({ message: "Company page not found" });
    const followers = latestPage.followers || [];
    return res.json({
      following: followers.some((follower) => follower.user.toString() === userId),
      followerCount: followers.length,
    });
  } catch (error) {
    console.error("Failed to update company page follow:", error);
    return res.status(500).json({ message: "Unable to update follow status" });
  }
};

export const createCompanyPagePost = async (req, res) => {
  let uploadedAsset = null;
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }
    const companyPage = await CompanyPage.findOne({
      _id: req.params.companyPageId,
      $or: [
        { owner: req.user._id },
        { admins: { $elemMatch: { user: req.user._id, role: "content_admin" } } },
      ],
    });
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });
    if (companyPage.active === false) return res.status(409).json({ message: "Reactivate this Company Page before publishing posts" });

    const text = cleanText(req.body.text, "Post", 1000);
    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];
    if (imageFile && videoFile) throw validationError("A post can contain either a photo or a video, not both");
    if (imageFile && !COMPANY_POST_IMAGE_TYPES.has(imageFile.mimetype)) {
      throw validationError("Only JPG, PNG, WEBP, HEIC, and HEIF photos are allowed");
    }
    if (videoFile && !COMPANY_POST_VIDEO_TYPES.has(videoFile.mimetype)) {
      throw validationError("Only MP4, WEBM, and MOV videos are allowed");
    }
    if (!text && !imageFile && !videoFile) {
      throw validationError("Add text, a photo, or a video to your post");
    }

    const image = { url: "", publicId: "" };
    const video = { url: "", publicId: "" };
    if (imageFile) {
      const upload = await uploadCompanyPostMedia(imageFile, {
        folder: "careerlink/company-page-posts",
        resource_type: "image",
      });
      uploadedAsset = { publicId: upload?.public_id || "", options: {} };
      image.url = upload.secure_url;
      image.publicId = upload.public_id || "";
    }
    if (videoFile) {
      const upload = await uploadCompanyPostMedia(videoFile, {
        folder: "careerlink/company-page-posts",
        resource_type: "video",
      });
      uploadedAsset = { publicId: upload?.public_id || "", options: { resource_type: "video" } };
      video.url = upload.secure_url;
      video.publicId = upload.public_id || "";
    }

    const post = await Post.create({
      author: req.user._id,
      companyPage: companyPage._id,
      text,
      image,
      video,
    });
    uploadedAsset = null;
    return res.status(201).json({
      post: {
        _id: post._id,
        companyPage: companyPage._id,
        text: post.text,
        image: post.image,
        video: post.video,
        impressions: post.impressions,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    if (uploadedAsset?.publicId) {
      await destroyCloudinaryAsset(uploadedAsset.publicId, uploadedAsset.options);
    }
    const status = error.statusCode || 500;
    if (status === 500) console.error("Failed to create company page post:", error);
    return res.status(status).json({
      message: status === 500 ? "Unable to publish the company page post" : error.message,
    });
  }
};

export const getCompanyPageManagement = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }

    const currentRole = await getCompanyPageAdminRole(req.params.companyPageId, req.user._id);
    if (!currentRole) return res.status(404).json({ message: "Company page not found" });
    const companyPage = await CompanyPage.findById(req.params.companyPageId).lean();
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });
    const followedPages = await CompanyPage.find({
      _id: { $in: companyPage.followedPages || [] },
      active: { $ne: false },
    })
      .select("_id name publicUrlSlug logo followers")
      .lean();
    const [postCount, postImpressions, recentPosts, followedPosts] = await Promise.all([
      Post.countDocuments({ companyPage: companyPage._id }),
      Post.aggregate([
        { $match: { companyPage: companyPage._id } },
        { $group: { _id: null, total: { $sum: "$impressions" } } },
      ]),
      currentRole === "analyst" ? [] : Post.find({ companyPage: companyPage._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .select("_id text image video job impressions likes reactions commentsCount commentsDisabled createdAt")
        .populate("job", "title company location salary")
        .lean(),
      followedPages.length && currentRole !== "analyst"
        ? Post.find({
          companyPage: { $in: followedPages.map((page) => page._id) },
          groupPostStatus: "approved",
          repostOf: null,
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .select("_id companyPage text image video job impressions likes reactions commentsCount createdAt")
          .populate("job", "title company location salary")
          .lean()
        : [],
    ]);
    const followedPageById = new Map(followedPages.map((page) => [page._id.toString(), page]));

    return res.json({
      companyPage: {
        _id: companyPage._id,
        name: companyPage.name,
        publicUrlSlug: companyPage.publicUrlSlug,
        website: companyPage.website,
        industry: companyPage.industry,
        companySize: companyPage.companySize,
        companyType: companyPage.companyType,
        overview: companyPage.overview,
        phone: companyPage.phone,
        yearFounded: companyPage.yearFounded,
        specialties: companyPage.specialties,
        logo: companyPage.logo,
        banner: companyPage.banner,
        tagline: companyPage.tagline,
        messagingEnabled: companyPage.messagingEnabled,
        customButton: companyPage.customButton,
        workplace: companyPage.workplace,
        active: companyPage.active !== false,
        createdAt: companyPage.createdAt,
        currentRole,
        metrics: {
          searchAppearances: companyPage.searchAppearances || 0,
          newFollowers: (companyPage.followers || []).filter((follower) =>
            follower.followedAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          ).length,
          postImpressions: postImpressions[0]?.total || 0,
          pageVisitors: companyPage.pageVisits || 0,
          totalFollowers: (companyPage.followers || []).length,
          postCount,
        },
        recentPosts,
        followedPages: followedPages.map((page) => ({
          _id: page._id,
          name: page.name,
          publicUrlSlug: page.publicUrlSlug,
          logo: page.logo,
          followerCount: (page.followers || []).length,
        })),
        followedPosts: followedPosts.map((post) => ({
          ...post,
          page: {
            ...followedPageById.get(post.companyPage.toString()),
            followerCount: (followedPageById.get(post.companyPage.toString())?.followers || []).length,
          },
        })),
      },
    });
  } catch (error) {
    console.error("Failed to load company page management:", error);
    return res.status(500).json({ message: "Unable to load this company page" });
  }
};

export const getCompanyPagePostMetrics = async (req, res) => {
  try {
    const { companyPageId, postId } = req.params;
    if (!mongoose.isValidObjectId(companyPageId) || !mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid company page or post ID" });
    }
    const role = await getCompanyPageAdminRole(companyPageId, req.user._id);
    if (!["super_admin", "content_admin"].includes(role)) return res.status(404).json({ message: "Company page not found" });
    const post = await Post.findOne({ _id: postId, companyPage: companyPageId, repostOf: null })
      .select("_id text image video impressions likes reactions commentsCount createdAt")
      .lean();
    if (!post) return res.status(404).json({ message: "Company page post not found" });
    const reposts = await Post.countDocuments({ repostOf: post._id });
    const reactions = (post.likes || []).length + (post.reactions || []).length;
    const comments = post.commentsCount || 0;
    const impressions = post.impressions || 0;
    const engagements = reactions + comments + reposts;
    return res.json({
      post,
      metrics: {
        impressions,
        membersReached: null,
        pageViewers: null,
        followersGained: null,
        engagements,
        engagementRate: impressions ? (engagements / impressions) * 100 : 0,
        clicks: null,
        clickThroughRate: null,
        reactions,
        comments,
        reposts,
      },
    });
  } catch (error) {
    console.error("Failed to load company page post metrics:", error);
    return res.status(500).json({ message: "Unable to load post metrics" });
  }
};

export const getCompanyPageAnalytics = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }

    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) {
      return res.status(400).json({ message: "Choose a valid analytics date range" });
    }
    if (endDate.getTime() - startDate.getTime() > 366 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: "Analytics date range cannot exceed 366 days" });
    }

    const role = await getCompanyPageAdminRole(req.params.companyPageId, req.user._id);
    if (!role) return res.status(404).json({ message: "Company page not found" });
    const companyPage = await CompanyPage.findById(req.params.companyPageId)
      .select("followers pageVisits searchAppearances competitors")
      .populate("followers.user", "industry location experience headline")
      .populate("competitors", "name publicUrlSlug logo followers");
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });

    const postMatch = {
      companyPage: companyPage._id,
      groupPostStatus: "approved",
      createdAt: { $gte: startDate, $lte: endDate },
    };
    const comparisonPageIds = [
      companyPage._id,
      ...(companyPage.competitors || []).filter(Boolean).map((page) => page._id),
    ];
    const [postRows, posts, comparisonPostRows] = await Promise.all([
      Post.aggregate([
        { $match: postMatch },
        {
          $project: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            impressions: 1,
            likes: { $size: { $ifNull: ["$likes", []] } },
            reactions: { $size: { $ifNull: ["$reactions", []] } },
            comments: { $ifNull: ["$commentsCount", 0] },
            postId: "$_id",
          },
        },
        {
          $lookup: {
            from: "posts",
            let: { originalPostId: "$postId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$repostOf", "$$originalPostId"] },
                      { $gte: ["$createdAt", startDate] },
                      { $lte: ["$createdAt", endDate] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "repostStats",
          },
        },
        {
          $group: {
            _id: "$day",
            posts: { $sum: 1 },
            impressions: { $sum: "$impressions" },
            reactions: { $sum: { $add: ["$likes", "$reactions"] } },
            comments: { $sum: "$comments" },
            reposts: { $sum: { $ifNull: [{ $arrayElemAt: ["$repostStats.count", 0] }, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Post.find(postMatch)
        .sort({ createdAt: -1 })
        .limit(100)
        .select("_id text image video impressions likes reactions commentsCount createdAt")
        .lean(),
      Post.aggregate([
        {
          $match: {
            companyPage: { $in: comparisonPageIds },
            groupPostStatus: "approved",
            createdAt: { $gte: startDate, $lte: endDate },
            repostOf: null,
          },
        },
        {
          $group: {
            _id: "$companyPage",
            posts: { $sum: 1 },
            comments: { $sum: { $ifNull: ["$commentsCount", 0] } },
            reactions: {
              $sum: {
                $add: [
                  { $size: { $ifNull: ["$likes", []] } },
                  { $size: { $ifNull: ["$reactions", []] } },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const recentPosts = posts.map((post) => ({
      ...post,
      reactionsCount: (post.likes || []).length + (post.reactions || []).length,
    }));
    const repostCounts = posts.length
      ? await Post.aggregate([
        { $match: { repostOf: { $in: posts.map((post) => post._id) } } },
        { $group: { _id: "$repostOf", count: { $sum: 1 } } },
      ])
      : [];
    const repostCountsByPost = new Map(repostCounts.map((row) => [row._id.toString(), row.count]));
    recentPosts.forEach((post) => {
      post.repostsCount = repostCountsByPost.get(post._id.toString()) || 0;
    });

    const followers = companyPage.followers || [];
    const newFollowers = followers.filter((follower) =>
      follower.followedAt >= startDate && follower.followedAt <= endDate,
    );
    const comparisonRowsById = new Map(
      comparisonPostRows.map((row) => [row._id.toString(), row]),
    );
    const comparison = [
      {
        _id: companyPage._id,
        name: companyPage.name,
        logo: companyPage.logo,
        followerCount: followers.length,
        newFollowers: newFollowers.length,
      },
      ...(companyPage.competitors || []).map((page) => ({
        _id: page._id,
        name: page.name,
        logo: page.logo,
        followerCount: (page.followers || []).length,
        newFollowers: (page.followers || []).filter(
          (follower) => follower.followedAt >= startDate && follower.followedAt <= endDate,
        ).length,
      })),
    ].map((page) => {
      const postStats = comparisonRowsById.get(page._id.toString()) || {};
      return {
        ...page,
        posts: postStats.posts || 0,
        comments: postStats.comments || 0,
        commentsPerDay: Number(((postStats.comments || 0) / Math.max(1, Math.ceil((endDate - startDate) / 86400000) + 1)).toFixed(1)),
        reactions: postStats.reactions || 0,
      };
    });
    const formatFollower = (follower) => ({
      followedAt: follower.followedAt,
      industry: follower.user?.industry || "",
      location: follower.user?.location || "",
      company: follower.user?.experience?.find((item) => item.currentlyWorking)?.company || "",
      jobTitle: follower.user?.experience?.find((item) => item.currentlyWorking)?.position || follower.user?.headline || "",
    });
    const daily = postRows.map((row) => ({
      date: row._id,
      posts: row.posts,
      impressions: row.impressions,
      reactions: row.reactions,
      comments: row.comments,
      reposts: row.reposts,
    }));

    return res.json({
      summary: {
        totalFollowers: followers.length,
        newFollowers: newFollowers.length,
        pageVisitsAllTime: companyPage.pageVisits || 0,
        searchAppearancesAllTime: companyPage.searchAppearances || 0,
        posts: postRows.reduce((total, row) => total + row.posts, 0),
        impressionsOnPosts: postRows.reduce((total, row) => total + row.impressions, 0),
        reactions: postRows.reduce((total, row) => total + row.reactions, 0),
        comments: postRows.reduce((total, row) => total + row.comments, 0),
        reposts: postRows.reduce((total, row) => total + row.reposts, 0),
      },
      daily,
      recentPosts,
      followers: followers.map(formatFollower),
      followerEvents: newFollowers.map(formatFollower),
      comparison,
      competitorSummary: comparison.find((page) => page._id.toString() !== companyPage._id.toString()) || null,
      competitors: (companyPage.competitors || []).filter(Boolean).map((competitor) => ({
        _id: competitor._id,
        name: competitor.name,
        publicUrlSlug: competitor.publicUrlSlug,
        logo: competitor.logo,
        followerCount: (competitor.followers || []).length,
      })),
    });
  } catch (error) {
    console.error("Failed to load company page analytics:", error);
    return res.status(500).json({ message: "Unable to load company page analytics" });
  }
};

export const getCompanyPageActivity = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }
    const role = await getCompanyPageAdminRole(req.params.companyPageId, req.user._id);
    if (!["super_admin", "content_admin"].includes(role)) return res.status(404).json({ message: "Company page not found" });
    const companyPage = await CompanyPage.findById(req.params.companyPageId).select("_id name publicUrlSlug");
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    const matchDate = { $gte: startDate, $lte: endDate };
    const pagePosts = await Post.find({
      companyPage: companyPage._id,
      groupPostStatus: "approved",
      repostOf: null,
      createdAt: matchDate,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("_id text createdAt likes reactions")
      .lean();
    const [comments, reposts] = await Promise.all([
      Comment.aggregate([
        { $match: { createdAt: matchDate } },
        { $lookup: { from: "posts", localField: "post", foreignField: "_id", as: "pagePost" } },
        { $unwind: "$pagePost" },
        { $match: { "pagePost.companyPage": companyPage._id, "pagePost.groupPostStatus": "approved" } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "activityAuthor" } },
        { $unwind: { path: "$activityAuthor", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            text: 1,
            author: {
              _id: "$activityAuthor._id",
              name: "$activityAuthor.name",
              profilePicture: "$activityAuthor.profilePicture",
            },
            post: { text: "$pagePost.text" },
          },
        },
      ]),
      Post.aggregate([
        { $match: { repostOf: { $ne: null }, createdAt: matchDate } },
        { $lookup: { from: "posts", localField: "repostOf", foreignField: "_id", as: "originalPost" } },
        { $unwind: "$originalPost" },
        { $match: { "originalPost.companyPage": companyPage._id, "originalPost.groupPostStatus": "approved" } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        { $lookup: { from: "users", localField: "repostedBy", foreignField: "_id", as: "activityAuthor" } },
        { $unwind: { path: "$activityAuthor", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            repostedBy: {
              _id: "$activityAuthor._id",
              name: "$activityAuthor.name",
              profilePicture: "$activityAuthor.profilePicture",
            },
            postText: "$originalPost.text",
          },
        },
      ]),
    ]);

    const mentionPattern = new RegExp(
      `@(?:${[companyPage.publicUrlSlug, companyPage.name.replace(/\s+/g, "[-\\s]?")]
        .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")})(?![\\w-])`,
      "i",
    );
    const events = [
      ...comments.map((comment) => ({
        _id: comment._id,
        type: "comment",
        createdAt: comment.createdAt,
        actor: comment.author,
        text: comment.text,
        postText: comment.post?.text || "",
      })),
      ...comments
        .filter((comment) => mentionPattern.test(comment.text))
        .map((comment) => ({
          _id: `mention-comment-${comment._id}`,
          type: "mention",
          createdAt: comment.createdAt,
          actor: comment.author,
          text: comment.text,
          postText: comment.post?.text || "",
        })),
      ...pagePosts
        .filter((post) => mentionPattern.test(post.text || ""))
        .map((post) => ({
          _id: `mention-post-${post._id}`,
          type: "mention",
          createdAt: post.createdAt,
          actor: null,
          text: post.text,
          postText: "",
        })),
      ...pagePosts
        .filter((post) => (post.likes || []).length + (post.reactions || []).length > 0)
        .map((post) => ({
          _id: `reaction-post-${post._id}`,
          type: "reaction",
          createdAt: post.createdAt,
          actor: null,
          text: `${(post.likes || []).length + (post.reactions || []).length} current reactions`,
          postText: post.text,
        })),
      ...reposts.map((post) => ({
        _id: post._id,
        type: "repost",
        createdAt: post.createdAt,
        actor: post.repostedBy,
        text: "Reposted your page post",
        postText: post.postText || "",
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);

    return res.json({
      events,
      message: "Reaction events use current totals because individual reaction timestamps are not stored.",
    });
  } catch (error) {
    console.error("Failed to load company page activity:", error);
    return res.status(500).json({ message: "Unable to load company page activity" });
  }
};

export const searchCompanyPageCompetitors = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }
    const companyPage = await CompanyPage.findOne({ _id: req.params.companyPageId, owner: req.user._id })
      .select("_id competitors")
      .lean();
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
    if (!search) return res.json({ companyPages: [] });
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const companyPages = await CompanyPage.find({
      _id: { $ne: companyPage._id, $nin: companyPage.competitors || [] },
      name: { $regex: safeSearch, $options: "i" },
    })
      .select("_id name publicUrlSlug logo industry")
      .limit(10)
      .lean();
    return res.json({ companyPages });
  } catch (error) {
    console.error("Failed to search company page competitors:", error);
    return res.status(500).json({ message: "Unable to search company pages" });
  }
};

export const updateCompanyPageCompetitors = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }
    const competitorIds = req.body.competitorIds;
    if (!Array.isArray(competitorIds) || competitorIds.length > 1 || competitorIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "Choose up to one valid company page competitor" });
    }
    const companyPage = await CompanyPage.findOne({ _id: req.params.companyPageId, owner: req.user._id });
    if (!companyPage) return res.status(404).json({ message: "Company page not found" });
    if (competitorIds.length) {
      if (competitorIds[0] === companyPage._id.toString()) {
        return res.status(400).json({ message: "A company page cannot compete with itself" });
      }
      const competitorExists = await CompanyPage.exists({ _id: competitorIds[0] });
      if (!competitorExists) return res.status(400).json({ message: "Choose another existing company page" });
    }
    companyPage.competitors = competitorIds;
    await companyPage.save();
    return res.json({ message: "Competitors updated" });
  } catch (error) {
    console.error("Failed to update company page competitors:", error);
    return res.status(500).json({ message: "Unable to update company page competitors" });
  }
};
