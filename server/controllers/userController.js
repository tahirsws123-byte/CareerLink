import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import generateToken from "../utils/generateToken.js";
import {
  attachConnectionStatus,
  userSummaryFields,
} from "../services/connectionService.js";
import {
  destroyCloudinaryAsset,
  uploadBufferToCloudinary,
} from "../utils/cloudinaryUpload.js";
import cloudinary from "../config/cloudinary.js";
import Connection, {
  CONNECTION_STATUS,
  makeConnectionPairKey,
} from "../models/Connection.js";
import ProfileView from "../models/ProfileView.js";
import JobApplication from "../models/JobApplication.js";
import Post from "../models/Post.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Article from "../models/Article.js";
import Comment from "../models/Comment.js";
import Event from "../models/Event.js";
import Group from "../models/Group.js";
import Job from "../models/Job.js";
import JobAlert from "../models/JobAlert.js";
import JobReport from "../models/JobReport.js";
import Newsletter from "../models/Newsletter.js";
import Notification from "../models/Notification.js";
import PostReport from "../models/PostReport.js";
import ProfileAnalyticsDaily from "../models/ProfileAnalyticsDaily.js";
import { recordProfileAnalytics } from "../utils/profileAnalytics.js";
import { isNotificationEmailConfigured } from "../utils/notificationEmail.js";
import { createNotification } from "../utils/notificationUtils.js";
import { NOTIFICATION_TYPES } from "../models/Notification.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const FIELD_LIMITS = {
  name: 80,
  headline: 160,
  bio: 2000,
  location: 120,
  skill: 60,
  company: 120,
  position: 120,
  employmentType: 40,
  entryLocation: 120,
  school: 140,
  degree: 120,
  fieldOfStudy: 120,
  grade: 80,
  description: 2000,
  projectName: 120,
  projectUrl: 500,
  language: 80,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const cleanString = (value, field, maxLength, { required = false } = {}) => {
  if (value === undefined) return undefined;

  if (value === null) {
    if (required) throw validationError(`${field} is required`);
    return "";
  }

  if (typeof value !== "string") {
    throw validationError(`${field} must be text`);
  }

  const cleaned = value.trim();

  if (required && !cleaned) {
    throw validationError(`${field} is required`);
  }

  if (cleaned.length > maxLength) {
    throw validationError(`${field} must be ${maxLength} characters or fewer`);
  }

  return cleaned;
};

const cleanDate = (value, field) => {
  if (value === undefined || value === null || value === "") return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw validationError(`${field} must be a valid date`);
  }

  return date;
};

const preserveSubdocumentId = (item, cleanedItem) => {
  if (item._id && mongoose.isValidObjectId(item._id)) {
    return {
      _id: item._id,
      ...cleanedItem,
    };
  }

  return cleanedItem;
};

const cleanSkills = (skills) => {
  if (!Array.isArray(skills)) {
    throw validationError("Skills must be a list");
  }

  if (skills.length > 50) {
    throw validationError("A profile can include up to 50 skills");
  }

  const seen = new Set();
  const cleanedSkills = [];

  skills.forEach((skill) => {
    const cleaned = cleanString(skill, "Skill", FIELD_LIMITS.skill);

    if (!cleaned) return;

    const key = cleaned.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      cleanedSkills.push(cleaned);
    }
  });

  return cleanedSkills;
};

const cleanExperience = (experience) => {
  if (!Array.isArray(experience)) {
    throw validationError("Experience must be a list");
  }

  if (experience.length > 25) {
    throw validationError("A profile can include up to 25 experience entries");
  }

  return experience.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw validationError(`Experience entry ${index + 1} is invalid`);
    }

    const startDate = cleanDate(item.startDate, "Experience start date");
    const currentlyWorking = Boolean(item.currentlyWorking);
    const endDate = currentlyWorking
      ? null
      : cleanDate(item.endDate, "Experience end date");

    if (startDate && endDate && endDate < startDate) {
      throw validationError("Experience end date cannot be before start date");
    }

    const cleanedItem = {
      company: cleanString(item.company, "Company", FIELD_LIMITS.company, {
        required: true,
      }),
      position: cleanString(item.position, "Position", FIELD_LIMITS.position, {
        required: true,
      }),
      employmentType:
        cleanString(
          item.employmentType,
          "Employment type",
          FIELD_LIMITS.employmentType,
        ) || "",
      location:
        cleanString(item.location, "Location", FIELD_LIMITS.entryLocation) ||
        "",
      startDate,
      endDate,
      currentlyWorking,
      description:
        cleanString(
          item.description,
          "Description",
          FIELD_LIMITS.description,
        ) || "",
    };

    return preserveSubdocumentId(item, cleanedItem);
  });
};

const cleanEducation = (education) => {
  if (!Array.isArray(education)) {
    throw validationError("Education must be a list");
  }

  if (education.length > 25) {
    throw validationError("A profile can include up to 25 education entries");
  }

  return education.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw validationError(`Education entry ${index + 1} is invalid`);
    }

    const startDate = cleanDate(item.startDate, "Education start date");
    const currentlyStudying = Boolean(item.currentlyStudying);
    const endDate = currentlyStudying
      ? null
      : cleanDate(item.endDate, "Education end date");

    if (startDate && endDate && endDate < startDate) {
      throw validationError("Education end date cannot be before start date");
    }

    const cleanedItem = {
      school: cleanString(item.school, "School", FIELD_LIMITS.school, {
        required: true,
      }),
      degree: cleanString(item.degree, "Degree", FIELD_LIMITS.degree) || "",
      fieldOfStudy:
        cleanString(
          item.fieldOfStudy,
          "Field of study",
          FIELD_LIMITS.fieldOfStudy,
        ) || "",
      startDate,
      endDate,
      currentlyStudying,
      grade: cleanString(item.grade, "Grade", FIELD_LIMITS.grade) || "",
      description:
        cleanString(
          item.description,
          "Description",
          FIELD_LIMITS.description,
        ) || "",
    };

    return preserveSubdocumentId(item, cleanedItem);
  });
};

const cleanProjects = (projects) => {
  if (!Array.isArray(projects)) throw validationError("Projects must be a list");
  if (projects.length > 30) throw validationError("A profile can include up to 30 projects");
  return projects.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw validationError(`Project ${index + 1} is invalid`);
    }
    const url = cleanString(item.url, "Project URL", FIELD_LIMITS.projectUrl) || "";
    if (url && !/^https?:\/\//i.test(url)) throw validationError("Project URL must start with http:// or https://");
    return preserveSubdocumentId(item, {
      name: cleanString(item.name, "Project name", FIELD_LIMITS.projectName, { required: true }),
      description: cleanString(item.description, "Project description", FIELD_LIMITS.description) || "",
      url,
      skills: cleanSkills(Array.isArray(item.skills) ? item.skills : []),
      projectDuration: cleanString(item.projectDuration, "Project duration", 80) || "",
    });
  });
};

const cleanLanguages = (languages) => {
  if (!Array.isArray(languages)) throw validationError("Languages must be a list");
  if (languages.length > 30) throw validationError("A profile can include up to 30 languages");
  const allowed = ["Basic", "Conversational", "Professional working", "Full professional", "Native or bilingual"];
  const seen = new Set();
  return languages.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw validationError(`Language ${index + 1} is invalid`);
    }
    const name = cleanString(item.name, "Language", FIELD_LIMITS.language, { required: true });
    if (seen.has(name.toLowerCase())) throw validationError(`${name} is already listed`);
    seen.add(name.toLowerCase());
    if (!allowed.includes(item.proficiency)) throw validationError("Choose a valid language proficiency");
    return preserveSubdocumentId(item, { name, proficiency: item.proficiency });
  });
};

const cleanOpenToWork = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError("Open to work preferences are invalid");
  }
  const cleanList = (items, field, limit, allowed = null) => {
    if (!Array.isArray(items)) throw validationError(`${field} must be a list`);
    if (items.length > 20) throw validationError(`${field} can contain up to 20 items`);
    return [...new Set(items.map((item) => cleanString(item, field, limit, { required: true })))].filter((item) => {
      if (allowed && !allowed.includes(item)) throw validationError(`${field} contains an invalid option`);
      return true;
    });
  };
  const locationTypes = cleanList(value.locationTypes || [], "Location types", 20, ["On-site", "Hybrid", "Remote"]);
  const employmentTypes = cleanList(value.employmentTypes || [], "Employment types", 40);
  const titles = cleanList(value.titles || [], "Job titles", 120);
  const locations = cleanList(value.locations || [], "Locations", 120);
  const visibility = value.visibility || "everyone";
  const startDate = value.startDate || "immediately";
  if (!["everyone", "recruiters", "only-me"].includes(visibility)) throw validationError("Choose a valid open-to-work visibility");
  if (!["immediately", "flexible"].includes(startDate)) throw validationError("Choose a valid start date preference");
  return {
    enabled: Boolean(value.enabled),
    titles,
    locationTypes,
    locations,
    employmentTypes,
    visibility,
    startDate,
    noticePeriod: cleanString(value.noticePeriod, "Notice period", 60) || "",
    salary: cleanString(value.salary, "Expected salary", 100) || "",
  };
};

const cleanEmail = (email) => {
  const cleaned = cleanString(email, "Email", 254, { required: true })
    .toLowerCase();

  if (!EMAIL_REGEX.test(cleaned)) {
    throw validationError("Please enter a valid email address");
  }

  return cleaned;
};

const createSecuritySession = async (user, req) => {
  const sessionId = crypto.randomUUID();
  user.securitySessions.push({
    sessionId,
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || "",
    remembered: false,
  });
  user.securitySessions = user.securitySessions.slice(-25);
  await user.save();
  return sessionId;
};

const buildAuthPayload = async (user, req) => {
  const sessionId = await createSecuritySession(user, req);
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    headline: user.headline,
    location: user.location,
    hasPassword: Boolean(user.password),
    profilePicture: user.profilePicture,
    coverPicture: user.coverPicture,
    profileViews: user.profileViews || 0,
    postImpressions: user.postImpressions || 0,
    token: generateToken(user._id, sessionId),
  };
};

const getRequestOrigin = (req) => {
  if (!req) return "";
  const host = req.get("x-forwarded-host") || req.get("host");
  if (!host) return "";

  const localHost = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i.test(host);
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
    ? forwardedProtocol
    : localHost ? req.protocol : "https";

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return "";
  }
};

const isLocalUrl = (value) => {
  try {
    return /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
};

const getConfiguredOrRequestUrl = (configuredUrl, req, fallback) => {
  const requestOrigin = getRequestOrigin(req);
  if (
    requestOrigin &&
    process.env.NODE_ENV !== "production" &&
    isLocalUrl(configuredUrl || "") &&
    !isLocalUrl(requestOrigin)
  ) {
    return requestOrigin;
  }
  return configuredUrl || requestOrigin || fallback;
};

const getClientUrl = (req) =>
  getConfiguredOrRequestUrl(
    process.env.CLIENT_URL || process.env.FRONTEND_URL,
    req,
    "http://localhost:5173",
  );

const getGoogleCallbackUrl = (req) => {
  const configuredUrl = process.env.GOOGLE_CALLBACK_URL;
  const requestOrigin = getRequestOrigin(req);
  if (
    requestOrigin &&
    process.env.NODE_ENV !== "production" &&
    isLocalUrl(configuredUrl || "") &&
    !isLocalUrl(requestOrigin)
  ) {
    return `${requestOrigin}/api/users/auth/google/callback`;
  }
  return configuredUrl || `${requestOrigin || "http://localhost:5000"}/api/users/auth/google/callback`;
};

const hasGoogleConfig = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const hasMailConfig = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD,
  );

const getMailTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const sendPasswordResetEmail = async (email, token) => {
  if (!hasMailConfig()) {
    throw new Error("Password reset email is not configured");
  }

  const resetUrl = `${getClientUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  await getMailTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Reset your CareerLink password",
    text: `Reset your CareerLink password using this link: ${resetUrl}. This link expires in one hour.`,
    html: `<p>Reset your CareerLink password using the link below.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in one hour.</p>`,
  });
};

const redirectWithOAuthError = (res, message) => {
  const url = new URL("/login", getClientUrl(res.req));
  url.searchParams.set("oauthError", message);
  return res.redirect(url.toString());
};

const redirectWithAuthPayload = async (res, user) => {
  const payload = await buildAuthPayload(user, res.req);
  const { token, ...userData } = payload;
  const encodedUser = Buffer.from(JSON.stringify(userData), "utf8").toString(
    "base64url",
  );
  const url = new URL("/oauth/google/callback", getClientUrl(res.req));

  return res.redirect(
    `${url.toString()}#token=${encodeURIComponent(token)}&user=${encodedUser}`,
  );
};

const parseGoogleTokenInfo = async (idToken) => {
  const tokenInfoResponse = await fetch(
    `${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!tokenInfoResponse.ok) {
    throw new Error("Google token verification failed");
  }

  const tokenInfo = await tokenInfoResponse.json();

  if (tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google token audience mismatch");
  }

  if (tokenInfo.iss !== "accounts.google.com" && tokenInfo.iss !== "https://accounts.google.com") {
    throw new Error("Google token issuer mismatch");
  }

  if (tokenInfo.email_verified !== true && tokenInfo.email_verified !== "true") {
    throw new Error("Google email is not verified");
  }

  return tokenInfo;
};

const getGoogleUserInfo = async (accessToken) => {
  const userInfoResponse = await fetch(GOOGLE_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error("Failed to load Google profile");
  }

  return userInfoResponse.json();
};

const getOrCreateGoogleUser = async ({ tokenInfo, userInfo }) => {
  const email = cleanEmail(userInfo.email || tokenInfo.email);
  const googleId = userInfo.sub || tokenInfo.sub;
  const name =
    cleanString(userInfo.name || tokenInfo.name || email.split("@")[0], "Name", FIELD_LIMITS.name) ||
    email.split("@")[0];
  const picture = userInfo.picture || tokenInfo.picture || "";

  if (!googleId) {
    throw new Error("Google profile is missing an account identifier");
  }

  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      emailVerified: true,
      profilePicture: picture,
    });

    return user;
  }

  let changed = false;

  if (user.accountStatus === "deactivated") {
    user.accountStatus = "active";
    changed = true;
  }

  if (!user.googleId) {
    user.googleId = googleId;
    changed = true;
  }

  if (!user.emailVerified) {
    user.emailVerified = true;
    changed = true;
  }

  if (!user.profilePicture && picture) {
    user.profilePicture = picture;
    changed = true;
  }

  if (changed) {
    await user.save();
  }

  return user;
};

const ensureImageFile = (file) => {
  if (!file) {
    throw validationError("Please select an image");
  }

  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw validationError("Only JPG, PNG, and WEBP images are allowed");
  }
};

const uploadProfileAsset = async (file, folder) => {
  const uploadResult = await uploadBufferToCloudinary(file, {
    folder,
    resource_type: "image",
  });

  if (!uploadResult?.secure_url) {
    throw new Error("Cloudinary upload failed");
  }

  return uploadResult;
};

export const registerUser = async (req, res) => {
  try {
    const name = cleanString(req.body.name, "Name", FIELD_LIMITS.name, {
      required: true,
    });
    const email = cleanEmail(req.body.email);
    const password = cleanString(req.body.password, "Password", 128, {
      required: true,
    });

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const userExists = await User.findOne({ email }).select("_id");

    if (userExists) {
      return res.status(409).json({
        message: "A user with that email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json(await buildAuthPayload(user, req));
  } catch (error) {
    const status = error.statusCode || 500;

    if (status === 500) {
      console.error("Register user error:", error);
    }

    return res.status(status).json({
      message: status === 500 ? "Unable to create account" : error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = cleanString(req.body.password, "Password", 128, {
      required: true,
    });

    const user = await User.findOne({
      $or: [
        { email },
        { securityEmails: { $elemMatch: { email, verified: true } } },
      ],
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    if (!user.password) {
      return res.status(401).json({
        message: "Use Continue with Google to sign in to this account",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.accountStatus === "deactivated") {
      user.accountStatus = "active";
      await user.save();
    }

    return res.status(200).json(await buildAuthPayload(user, req));
  } catch (error) {
    const status = error.statusCode || 500;

    if (status === 500) {
      console.error("Login user error:", error);
    }

    return res.status(status).json({
      message: status === 500 ? "Unable to login" : error.message,
    });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);

    if (!hasMailConfig()) {
      return res.status(503).json({
        message: "Password reset email is not configured",
      });
    }

    const user = await User.findOne({
      $or: [
        { email },
        { securityEmails: { $elemMatch: { email, verified: true } } },
      ],
    });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.passwordResetTokenHash = hashResetToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await user.save();
      const verifiedAddress = user.securityEmails.find(
        (item) => item.email === email && item.verified,
      )?.email;
      await sendPasswordResetEmail(verifiedAddress || user.email, token);
    }

    return res.status(200).json({
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (error) {
    if (error.message === "Password reset email is not configured") {
      return res.status(503).json({
        message: "Password reset email is not configured",
      });
    }

    const status = error.statusCode || 500;
    if (status === 500) console.error("Request password reset error:", error);
    return res.status(status).json({
      message: status === 500 ? "Unable to request password reset" : error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = cleanString(req.body.token, "Reset token", 128, { required: true });
    const password = cleanString(req.body.password, "Password", 128, { required: true });

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.accountStatus = "active";
    user.passwordResetTokenHash = "";
    user.passwordResetExpiresAt = null;
    user.securityCodeChallenge = {};
    user.securitySessions = [];
    user.enforceTrackedSessions = true;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error("Reset password error:", error);
    return res.status(status).json({
      message: status === 500 ? "Unable to reset password" : error.message,
    });
  }
};

export const startGoogleAuth = async (req, res) => {
  if (!hasGoogleConfig()) {
    return redirectWithOAuthError(
      res,
      "Google sign-in is not configured yet",
    );
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getGoogleCallbackUrl(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");

  return res.redirect(url.toString());
};

export const handleGoogleCallback = async (req, res) => {
  try {
    if (req.query.error) {
      return redirectWithOAuthError(res, "Google sign-in was cancelled");
    }

    if (!hasGoogleConfig()) {
      return redirectWithOAuthError(
        res,
        "Google sign-in is not configured yet",
      );
    }

    const code = req.query.code;

    if (!code || typeof code !== "string") {
      return redirectWithOAuthError(res, "Google sign-in code was missing");
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getGoogleCallbackUrl(req),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return redirectWithOAuthError(res, "Google sign-in could not be completed");
    }

    const tokens = await tokenResponse.json();

    if (!tokens.id_token || !tokens.access_token) {
      return redirectWithOAuthError(res, "Google did not return a valid token");
    }

    const tokenInfo = await parseGoogleTokenInfo(tokens.id_token);
    const userInfo = await getGoogleUserInfo(tokens.access_token);
    const user = await getOrCreateGoogleUser({ tokenInfo, userInfo });

    return redirectWithAuthPayload(res, user);
  } catch (error) {
    console.error("Google OAuth error:", error.message);

    return redirectWithOAuthError(res, "Google sign-in failed");
  }
};

export const getProfile = async (req, res) => {
  const user = req.user.toObject();
  delete user.securityEmails;
  delete user.securityPhoneNumbers;
  delete user.securityCodeChallenge;
  delete user.securityCodeLastSentAt;
  delete user.securitySessions;
  delete user.blockedUsers;
  return res.status(200).json({
    user,
    notificationCapabilities: {
      email: isNotificationEmailConfigured(),
      push: false,
    },
  });
};

export const exportMyData = async (req, res) => {
  try {
    const userId = req.user._id;
    const sections = {
      profile: async () => ({
        profile: await User.findById(userId)
          .select("-password -googleId -passwordResetTokenHash -passwordResetExpiresAt -securityEmails -securityPhoneNumbers -securitySessions -securityCodeChallenge -securityCodeLastSentAt")
          .lean(),
      }),
      activity: async () => {
        const [posts, comments, articles, jobs] = await Promise.all([
          Post.find({ author: userId }).select("text image video likes reactions repostOf commentsCount impressions createdAt updatedAt").lean(),
          Comment.find({ author: userId }).select("post text createdAt updatedAt").lean(),
          Article.find({ author: userId }).select("-__v").lean(),
          Job.find({ postedBy: userId }).select("-savedBy -__v").lean(),
        ]);
        return { posts, comments, articles, jobs };
      },
      applications: async () => ({
        applications: await JobApplication.find({ applicant: userId }).populate("job", "title company location").lean(),
      }),
      messages: async () => {
        const conversations = await Conversation.find({ participants: userId }).select("_id participants createdAt updatedAt").lean();
        const conversationIds = conversations.map((conversation) => conversation._id);
        const messages = await Message.find({ conversation: { $in: conversationIds }, sender: userId })
          .select("conversation text attachment post job replyTo reactions createdAt updatedAt")
          .lean();
        return { conversations, messages };
      },
      network: async () => ({
        connections: await Connection.find({ $or: [{ requester: userId }, { recipient: userId }] }).select("requester recipient status createdAt updatedAt").lean(),
      }),
      saved: async () => {
        const [savedPosts, savedArticles] = await Promise.all([
          Post.find({ _id: { $in: req.user.savedPosts || [] } }).select("text image video createdAt").lean(),
          Article.find({ _id: { $in: req.user.savedArticles || [] } }).select("title excerpt createdAt").lean(),
        ]);
        return { savedPosts, savedArticles };
      },
      notifications: async () => ({
        notifications: await Notification.find({ recipient: userId }).select("type sender job post comment read createdAt").lean(),
      }),
    };
    const requestedSections = req.query.include
      ? String(req.query.include).split(",").filter((section) => Object.prototype.hasOwnProperty.call(sections, section))
      : Object.keys(sections);
    if (!requestedSections.length) {
      throw validationError("Choose at least one data category to export");
    }
    const exportedSections = await Promise.all(requestedSections.map((section) => sections[section]()));
    return res.json(Object.assign(
      { exportedAt: new Date().toISOString(), includedSections: requestedSections },
      ...exportedSections,
    ));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Account data export failed:", error);
    return res.status(500).json({ message: "Unable to export your account data" });
  }
};

export const updateDataPrivacyPreferences = async (req, res) => {
  try {
    const allowedBooleans = [
      "allowNetworkInvitations",
      "allowMessageRequests",
      "allowRecruiterJobInvites",
      "messageReadReceipts",
      "signalRecruiterInterest",
    ];
    const updates = {};
    for (const field of allowedBooleans) {
      if (field in req.body) {
        if (typeof req.body[field] !== "boolean") {
          throw validationError(`${field} must be true or false`);
        }
        updates[field] = req.body[field];
      }
    }
    if ("connectionInvitationAudience" in req.body) {
      if (!["everyone", "network"].includes(req.body.connectionInvitationAudience)) {
        throw validationError("Choose a valid connection invitation audience");
      }
      updates.connectionInvitationAudience = req.body.connectionInvitationAudience;
    }
    if (!Object.keys(updates).length) {
      throw validationError("No data privacy preferences were provided");
    }

    req.user.dataPrivacyPreferences = {
      ...req.user.dataPrivacyPreferences?.toObject?.(),
      ...updates,
    };
    await req.user.save();

    if (updates.messageReadReceipts === false) {
      await Message.updateMany(
        { sender: { $ne: req.user._id }, readReceipts: req.user._id },
        { $pull: { readReceipts: req.user._id } },
      );
    }

    return res.json({
      dataPrivacyPreferences: req.user.dataPrivacyPreferences,
      message: "Data privacy preferences updated",
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error("Update data privacy preferences error:", error);
    return res.status(status).json({
      message: status === 500 ? "Failed to update data privacy preferences" : error.message,
    });
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const allowed = [
      "emailNotifications",
      "pushNotifications",
      "connectionNotifications",
      "messageNotifications",
      "messageEmailNotifications",
      "groupNotificationsEnabled",
      "groupInvitationsInApp",
      "groupInvitationsEmail",
      "groupUpdatesInApp",
      "groupUpdatesEmail",
      "eventNotificationsEnabled",
      "eventInvitationsInApp",
      "eventInvitationsEmail",
      "eventRemindersInApp",
      "eventRemindersEmail",
      "eventAttendeeUpdatesInApp",
      "eventAttendeeUpdatesEmail",
      "eventSpeakerInvitationsInApp",
      "eventSpeakerInvitationsEmail",
      "eventOrganizerUpdatesInApp",
      "eventOrganizerUpdatesEmail",
      "profileUpdatesEnabled",
      "profileRecommendationsInApp",
      "profileRecommendationsEmail",
      "jobRecommendationsInApp",
      "jobRecommendationsEmail",
      "searchAppearancesInApp",
      "searchAppearancesEmail",
      "connectionRecommendationsInApp",
      "connectionRecommendationsEmail",
      "followRecommendationsInApp",
      "followRecommendationsEmail",
      "networkBirthdaysInApp",
      "networkBirthdaysEmail",
      "suggestedPostsInApp",
      "suggestedPostsEmail",
      "trendingConversationsInApp",
      "trendingConversationsEmail",
      "postRemindersInApp",
      "postRemindersEmail",
      "unreadMessageRemindersInApp",
      "unreadMessageRemindersEmail",
      "inmailNotificationsInApp",
      "inmailNotificationsEmail",
      "inmailRemindersInApp",
      "inmailRemindersEmail",
      "groupRecommendationsInApp",
      "groupRecommendationsEmail",
      "eventRecommendationsInApp",
      "eventRecommendationsEmail",
      "jobAlerts",
      "jobSearchNotificationsEnabled",
      "jobAlertEmailNotifications",
      "savedJobEmailNotifications",
      "applicationUpdateEmailNotifications",
      "hiringNotificationsEnabled",
      "hiringJobPostUpdatesInApp",
      "hiringJobPostUpdatesEmail",
      "hiringCandidateMessagesInApp",
      "hiringCandidateMessagesEmail",
      "connectionInvitationsInApp",
      "connectionInvitationsEmail",
      "networkUpdatesInApp",
      "networkUpdatesEmail",
      "newFollowersInApp",
      "newFollowersEmail",
      "followedPeopleUpdatesInApp",
      "followedPeopleUpdatesEmail",
      "profileViewsInApp",
      "profileViewsEmail",
      "networkCatchupEnabled",
      "networkJobChangesInApp",
      "networkHiringInApp",
      "networkWorkAnniversariesInApp",
      "networkEducationInApp",
      "networkWeeklySummaryEmail",
      "postingNotificationsEnabled",
      "postCommentsReactionsInApp",
      "postCommentsReactionsEmail",
      "postSharesInApp",
      "postSharesEmail",
      "postMentionsInApp",
      "postMentionsEmail",
      "postNewslettersInApp",
      "postNewslettersEmail",
    ];
    const updates = {};

    allowed.forEach((field) => {
      if (field in req.body) {
        if (typeof req.body[field] !== "boolean") {
          throw validationError(`${field} must be a boolean`);
        }
        updates[field] = req.body[field];
      }
    });
    for (const field of [
      "postCommentsReactionsEmailFrequency",
      "postMentionsEmailFrequency",
      "messageEmailFrequency",
      "groupInvitationsEmailFrequency",
    ]) {
      if (field in req.body) {
        if (!["individual", "weekly", "recommended"].includes(req.body[field])) {
          throw validationError(`${field} must be individual, weekly, or recommended`);
        }
        updates[field] = req.body[field];
      }
    }
    if ("hiddenNotificationTypes" in req.body) {
      const allowedTypes = Object.values(NOTIFICATION_TYPES);
      if (!Array.isArray(req.body.hiddenNotificationTypes)
        || req.body.hiddenNotificationTypes.some((type) => !allowedTypes.includes(type))) {
        throw validationError("Notification categories contain an invalid value");
      }
      updates.hiddenNotificationTypes = [...new Set(req.body.hiddenNotificationTypes)];
    }

    if (!Object.keys(updates).length) {
      throw validationError("No notification preferences were provided");
    }

    req.user.notificationPreferences = {
      ...req.user.notificationPreferences?.toObject?.(),
      ...updates,
    };
    await req.user.save();

    return res.status(200).json({
      notificationPreferences: req.user.notificationPreferences,
      message: "Notification preferences updated",
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error("Update notification preferences error:", error);
    return res.status(status).json({
      message: status === 500 ? "Failed to update notification preferences" : error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const currentPassword = cleanString(req.body.currentPassword, "Current password", 128, {
      required: true,
    });
    const newPassword = cleanString(req.body.newPassword, "New password", 128, {
      required: true,
    });
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const userWithPassword = await User.findById(req.user._id).select("+password");
    if (!userWithPassword?.password) {
      return res.status(400).json({
        message: "Password changes are unavailable for Google accounts",
      });
    }
    const matches = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!matches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const challenge = userWithPassword.securityCodeChallenge;
    if (
      challenge?.action !== "change-password" ||
      challenge.value !== "" ||
      !challenge.verifiedAt ||
      !challenge.expiresAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= 5
    ) {
      return res.status(400).json({ message: "Verify the email security code before changing your password" });
    }

    userWithPassword.password = await bcrypt.hash(newPassword, 10);
    userWithPassword.securityCodeChallenge = {};
    if (req.body.signOutOtherDevices === true) {
      userWithPassword.securitySessions = [];
      userWithPassword.enforceTrackedSessions = true;
    }
    await userWithPassword.save();
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error("Change password error:", error);
    return res.status(status).json({
      message: status === 500 ? "Failed to change password" : error.message,
    });
  }
};

const SECURITY_CODE_TTL_MS = 10 * 60 * 1000;
const SECURITY_CODE_RESEND_MS = 60 * 1000;
const hashSecurityCode = (userId, action, value, code) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${action}:${value}:${code}`)
    .digest("hex");

const verifySecurityCode = (user, action, value, code) => {
  const challenge = user.securityCodeChallenge;
  if (
    !challenge?.codeHash ||
    challenge.action !== action ||
    challenge.value !== value ||
    !challenge.expiresAt ||
    challenge.expiresAt <= new Date() ||
    challenge.attempts >= 5
  ) {
    return false;
  }

  const suppliedHash = hashSecurityCode(user._id, action, value, code);
  return crypto.timingSafeEqual(
    Buffer.from(challenge.codeHash, "hex"),
    Buffer.from(suppliedHash, "hex"),
  );
};

const validateSecurityAction = async (user, action, rawValue) => {
  const value = cleanString(rawValue || "", "Security setting", 254);
  if (action === "add-email") {
    const email = cleanEmail(value);
    if (user.securityEmails.length >= 4) {
      throw validationError("You can add up to four additional email addresses");
    }
    const existing = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ email }, { "securityEmails.email": email }],
    }).select("_id");
    if (existing || user.email === email || user.securityEmails.some((item) => item.email === email)) {
      throw validationError("That email address is already associated with an account");
    }
    return email;
  }
  if (action === "remove-email") {
    const email = cleanEmail(value);
    if (email === user.email || !user.securityEmails.some((item) => item.email === email)) {
      throw validationError("Choose an additional email address on this account");
    }
    return email;
  }
  if (action === "add-phone") {
    const phone = cleanString(value, "Phone number", 30, { required: true });
    if (user.securityPhoneNumbers.length >= 3) {
      throw validationError("You can add up to three phone numbers");
    }
    const digits = phone.replace(/\D/g, "");
    if (!/^\+?[0-9\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      throw validationError("Enter a valid phone number, including its country code");
    }
    if (user.securityPhoneNumbers.some((item) => item.number === phone)) {
      throw validationError("That phone number is already on your account");
    }
    return phone;
  }
  if (action === "remove-phone") {
    if (!user.securityPhoneNumbers.some((item) => item.number === value)) {
      throw validationError("Choose a phone number on this account");
    }
    return value;
  }
  if (["revoke-session", "remember-device", "forget-device"].includes(action)) {
    const session = user.securitySessions.find((item) => item.sessionId === value);
    if (
      !session ||
      (action === "revoke-session" && session.sessionId === user.currentSecuritySessionId) ||
      (action === "forget-device" && !session.remembered)
    ) {
      throw validationError("Choose a different active device");
    }
    return value;
  }
  if (action === "change-password") return "";
  throw validationError("Unsupported security action");
};

export const requestSecurityCode = async (req, res) => {
  try {
    if (!hasMailConfig()) {
      return res.status(503).json({ message: "Security email delivery is not configured" });
    }
    const action = cleanString(req.body.action, "Security action", 40, { required: true });
    const value = await validateSecurityAction(req.user, action, req.body.value);
    const user = await User.findById(req.user._id);
    if (user.securityCodeLastSentAt && Date.now() - user.securityCodeLastSentAt.getTime() < SECURITY_CODE_RESEND_MS) {
      return res.status(429).json({ message: "Please wait before requesting another security code" });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    user.securityCodeChallenge = {
      action,
      value,
      codeHash: hashSecurityCode(user._id, action, value, code),
      expiresAt: new Date(Date.now() + SECURITY_CODE_TTL_MS),
      attempts: 0,
    };
    user.securityCodeLastSentAt = new Date();
    await user.save();

    const recipients = new Set([user.email]);
    if (action === "add-email") recipients.add(value);
    await getMailTransport().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: [...recipients].join(","),
      subject: "Your CareerLink security code",
      text: `Your CareerLink security code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
      html: `<p>Your CareerLink security code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`,
    });
    return res.json({ message: "A security code has been sent to your account email" });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error("Request security code error:", error);
    return res.status(status).json({
      message: status === 500 ? "Unable to send security code" : error.message,
    });
  }
};

export const confirmSecurityAction = async (req, res) => {
  try {
    const action = cleanString(req.body.action, "Security action", 40, { required: true });
    const code = cleanString(req.body.code, "Verification code", 6, { required: true });
    const value = await validateSecurityAction(req.user, action, req.body.value);
    const user = await User.findById(req.user._id);
    if (!verifySecurityCode(user, action, value, code)) {
      user.securityCodeChallenge.attempts += 1;
      if (user.securityCodeChallenge.attempts >= 5) user.securityCodeChallenge = {};
      await user.save();
      return res.status(400).json({ message: "Verification code is invalid or expired" });
    }

    if (action === "add-email") {
      if (!user.securityEmails.some((item) => item.email === value)) {
        user.securityEmails.push({ email: value, verified: true });
      }
    } else if (action === "remove-email") {
      user.securityEmails = user.securityEmails.filter((item) => item.email !== value);
    } else if (action === "add-phone") {
      if (!user.securityPhoneNumbers.some((item) => item.number === value)) {
        user.securityPhoneNumbers.push({ number: value, confirmedByEmail: true });
      }
    } else if (action === "remove-phone") {
      user.securityPhoneNumbers = user.securityPhoneNumbers.filter((item) => item.number !== value);
    } else if (action === "revoke-session") {
      user.securitySessions = user.securitySessions.filter((session) => session.sessionId !== value);
    } else if (action === "remember-device" || action === "forget-device") {
      const session = user.securitySessions.find((item) => item.sessionId === value);
      if (!session) return res.status(404).json({ message: "Device session not found" });
      session.remembered = action === "remember-device";
    } else if (action === "change-password") {
      user.securityCodeChallenge.verifiedAt = new Date();
      await user.save();
      return res.json({ verified: true, message: "Email security code verified" });
    } else {
      return res.status(400).json({ message: "Use the password form to change your password" });
    }

    user.securityCodeChallenge = {};
    await user.save();
    return res.json({ message: "Security setting updated" });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error("Confirm security action error:", error);
    return res.status(status).json({
      message: status === 500 ? "Unable to update security setting" : error.message,
    });
  }
};

export const getSecuritySettings = async (req, res) => {
  const user = req.user;
  const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allSessions = user.securitySessions.map((session) => ({
    sessionId: session.sessionId,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    remembered: session.remembered,
    createdAt: session.createdAt,
    current: session.sessionId === req.authSessionId,
  }));
  return res.json({
    emails: [
      { email: user.email, primary: true, verified: Boolean(user.emailVerified) },
      ...user.securityEmails.map((item) => ({ email: item.email, primary: false, verified: item.verified })),
    ],
    phoneNumbers: user.securityPhoneNumbers,
    sessions: allSessions.filter((session) => session.createdAt >= activeSince),
    rememberedDevices: allSessions.filter((session) => session.remembered),
  });
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = mongoose.isValidObjectId(userId)
      ? await User.findOne({ _id: userId, accountStatus: { $ne: "deactivated" } }).select("-password -passwordResetTokenHash -passwordResetExpiresAt -googleId")
      : await User.findOne({ publicProfileSlug: userId.toLowerCase(), accountStatus: { $ne: "deactivated" } }).select("-password -passwordResetTokenHash -passwordResetExpiresAt -googleId");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isOwner = req.user?._id?.toString() === user._id.toString();
    const viewerIsBlocked = req.user?.blockedUsers?.some((id) => id.toString() === user._id.toString());
    const userBlockedViewer = req.user && user.blockedUsers?.some((id) => id.toString() === req.user._id.toString());
    if (!isOwner && (viewerIsBlocked || userBlockedViewer)) {
      return res.status(404).json({ message: "User not found" });
    }
    let isConnection = false;
    if (!isOwner && req.user) {
      isConnection = Boolean(await Connection.exists({
        pairKey: makeConnectionPairKey(req.user._id, user._id),
        status: "accepted",
      }));
    }
    let isInNetwork = isConnection;
    if (!isOwner && req.user && !isConnection) {
      const viewerConnections = await Connection.find({
        status: CONNECTION_STATUS.ACCEPTED,
        $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      }).select("requester recipient").lean();
      const connectedIds = viewerConnections.map((connection) =>
        connection.requester.toString() === req.user._id.toString()
          ? connection.recipient
          : connection.requester,
      );
      if (connectedIds.length) {
        isInNetwork = Boolean(await Connection.exists({
          status: CONNECTION_STATUS.ACCEPTED,
          $or: [
            { requester: user._id, recipient: { $in: connectedIds } },
            { recipient: user._id, requester: { $in: connectedIds } },
          ],
        }));
      }
    }
    const profileVisibility = user.profileVisibility || "public";
    const contactInfoVisibility = user.contactInfoVisibility || "public";
    const publicFields = user.publicProfileFields?.toObject?.() || user.publicProfileFields || {};
    if (!isOwner && !req.user && (!user.publicProfileEnabled || !user.offPlatformVisibility)) {
      return res.status(404).json({ message: "User not found" });
    }
    const canViewProfile = profileVisibility === "public" || isOwner
      || (profileVisibility === "connections" && isConnection);
    if (!canViewProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isOwner && req.user) {
      try {
        await ProfileView.updateOne(
          { profile: user._id, viewer: req.user._id },
          { $set: { lastViewedAt: new Date() }, $setOnInsert: { firstViewedAt: new Date() }, $inc: { viewCount: 1 } },
          { upsert: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        await ProfileView.updateOne(
          { profile: user._id, viewer: req.user._id },
          { $set: { lastViewedAt: new Date() }, $inc: { viewCount: 1 } },
        );
      }
      await User.updateOne({ _id: user._id }, { $inc: { profileViews: 1 } });
      await recordProfileAnalytics([user._id], "profileViews");
      const recentProfileView = await Notification.exists({
        recipient: user._id,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.PROFILE_VIEW,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });
      if (!recentProfileView) {
        await createNotification({
          recipient: user._id,
          sender: req.user._id,
          type: NOTIFICATION_TYPES.PROFILE_VIEW,
        });
      }
      user.profileViews = (user.profileViews || 0) + 1;
    }

    const responseUser = user.toObject();
    responseUser.viewerIsConnection = isConnection;
    responseUser.isFollowing = Boolean(
      req.user?.following?.some((followingId) => followingId.toString() === user._id.toString()),
    );
    responseUser.profileVisibility = profileVisibility;
    responseUser.contactInfoVisibility = contactInfoVisibility;
    responseUser.activityVisibility = user.activityVisibility || "public";
    responseUser.publicProfileFields = publicFields;
    responseUser.followPrimary = Boolean(user.followPrimary);
    responseUser.followersCount = user.followers?.length || 0;
    responseUser.isFollowing = Boolean(
      req.user?.following?.some((followingId) => followingId.toString() === user._id.toString()),
    );
    if (!isOwner && user.lastNameVisibility === "initial" && !isConnection) {
      const names = (responseUser.name || "").trim().split(/\s+/);
      if (names.length > 1) names[names.length - 1] = `${names[names.length - 1][0]}.`;
      responseUser.name = names.join(" ");
    }
    delete responseUser.email;
    delete responseUser.passwordResetTokenHash;
    delete responseUser.passwordResetExpiresAt;
    delete responseUser.googleId;
    if (!isOwner && user.followVisibility === "public") {
      responseUser.following = (user.following || []).map((id) => id.toString());
    } else {
      delete responseUser.following;
    }
    delete responseUser.savedPosts;
    delete responseUser.savedArticles;
    delete responseUser.notificationPreferences;
    delete responseUser.resumes;
    delete responseUser.securityEmails;
    delete responseUser.securityPhoneNumbers;
    delete responseUser.securitySessions;
    delete responseUser.securityCodeChallenge;
    delete responseUser.securityCodeLastSentAt;
    delete responseUser.profileViewerVisibility;
    delete responseUser.emailVisibility;
    delete responseUser.connectionVisibility;
    delete responseUser.followVisibility;
    delete responseUser.lastNameVisibility;
    delete responseUser.representOnContent;
    delete responseUser.offPlatformVisibility;
    delete responseUser.discoverabilityEmail;
    delete responseUser.discoverabilityPhone;
    delete responseUser.blockedUsers;
    delete responseUser.activeStatusVisibility;
    delete responseUser.shareProfileUpdates;
    delete responseUser.notifyNetworkInNews;
    delete responseUser.allowMentionsTagsCollabs;
    delete responseUser.followerVisibility;
    delete responseUser.publicProfileEnabled;
    if (!isOwner && user.connectionVisibility === false && !isConnection) {
      responseUser.followers = [];
      responseUser.following = [];
      responseUser.connectionsHidden = true;
    }
    if (!isOwner && (
      user.birthdayVisibility === "private"
      || (user.birthdayVisibility === "connections" && !isConnection)
    )) {
      delete responseUser.birthDate;
    }
    if (!isOwner) delete responseUser.birthdayVisibility;
    if (!isOwner && user.followerVisibility === "connections" && !isConnection) {
      responseUser.followers = [];
      responseUser.following = [];
      responseUser.connectionsHidden = true;
    }
    if (!isOwner) {
      delete responseUser.genderIdentity;
      delete responseUser.disabilityStatus;
      delete responseUser.preferredLanguage;
      delete responseUser.contentLanguage;
      delete responseUser.excludedContentLanguages;
      delete responseUser.profilePhotoVisibility;
      delete responseUser.preferredFeedView;
    }
    if (!isOwner && (!responseUser.openToWork?.enabled || responseUser.openToWork?.visibility !== "everyone")) {
      responseUser.openToWork = { enabled: false };
    }
    if (!isOwner && contactInfoVisibility !== "public" && !(contactInfoVisibility === "connections" && isConnection)) {
      responseUser.contactEmail = "";
      responseUser.contactWebsite = "";
    }
    const canSeeContactEmail = user.emailVisibility === "public"
      || (user.emailVisibility === "connections" && isConnection)
      || (user.emailVisibility === "network" && isInNetwork);
    if (!isOwner && !canSeeContactEmail) responseUser.contactEmail = "";
    if (!isOwner && !req.user) {
      if (!publicFields.profilePhoto) responseUser.profilePicture = "";
      if (!publicFields.backgroundPhoto) responseUser.coverPicture = "";
      if (!publicFields.headline) responseUser.headline = "";
      if (!publicFields.summary) responseUser.bio = "";
      if (!publicFields.education) responseUser.education = [];
      if (!publicFields.projects) responseUser.projects = [];
      if (!publicFields.languages) responseUser.languages = [];
      if (!publicFields.activity) responseUser.activityVisibility = "private";
    }

    return res.status(200).json({ user: responseUser });
  } catch (error) {
    console.error("Get user profile error:", error);

    return res.status(500).json({
      message: "Failed to fetch user profile",
    });
  }
};

export const getProfileViewers = async (req, res) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10) || 1;
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;
    const page = Math.min(Math.max(requestedPage, 1), 100000);
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const sort = req.query.sort === "oldest" ? 1 : -1;
    const filter = { profile: req.user._id };
    const [views, total] = await Promise.all([
      ProfileView.find(filter)
      .populate("viewer", "name headline location industry profilePicture publicProfileSlug profileViewerVisibility")
        .sort({ lastViewedAt: sort })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProfileView.countDocuments(filter),
    ]);
    const privacyAdjustedViews = views.map((view) => {
      if (!view.viewer || view.viewer.profileViewerVisibility === "name-headline") return view;
      const viewer = { ...view.viewer };
      delete viewer.profileViewerVisibility;
      delete viewer.profilePicture;
      delete viewer.publicProfileSlug;
      if (view.viewer.profileViewerVisibility === "private") {
        viewer.name = "Anonymous CareerLink member";
        viewer.headline = "";
        viewer.location = "";
        viewer.industry = "";
      } else {
        viewer.name = `Someone in ${viewer.industry || "a professional"} industry`;
        viewer.headline = "";
        delete viewer.industry;
      }
      return { ...view, viewer };
    });
    return res.json({ viewers: privacyAdjustedViews, page, limit, total, hasMore: page * limit < total });
  } catch (error) {
    console.error("Get profile viewers error:", error);
    return res.status(500).json({ message: "Unable to load profile viewers" });
  }
};

export const getProfileAnalytics = async (req, res) => {
  try {
    const requestedDays = Number.parseInt(req.query.days, 10) || 7;
    const days = [7, 28, 90].includes(requestedDays) ? requestedDays : 7;
    const today = new Date();
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const previousStart = new Date(start);
    previousStart.setUTCDate(previousStart.getUTCDate() - days);
    const user = await User.findById(req.user._id).select("followers profileViews postImpressions searchAppearances");
    if (!user) return res.status(404).json({ message: "User not found" });

    const [dailyRecords, previousRecords, recentViews, posts] = await Promise.all([
      ProfileAnalyticsDaily.find({ user: user._id, day: { $gte: start, $lte: end } }).lean(),
      ProfileAnalyticsDaily.find({ user: user._id, day: { $gte: previousStart, $lt: start } }).lean(),
      ProfileView.find({ profile: user._id, lastViewedAt: { $gte: start } }).populate("viewer", "location headline").lean(),
      Post.find({ author: user._id, createdAt: { $gte: start } })
        .select("text image video impressions likes reactions commentsCount createdAt")
        .sort({ impressions: -1, createdAt: -1 }).limit(10).lean(),
    ]);

    const daily = Array.from({ length: days }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + index);
      const key = day.toISOString().slice(0, 10);
      const record = dailyRecords.find((item) => item.day.toISOString().slice(0, 10) === key);
      return {
        date: key,
        postImpressions: record?.postImpressions || 0,
        profileViews: record?.profileViews || 0,
        searchAppearances: record?.searchAppearances || 0,
        newFollowers: record?.newFollowers || 0,
      };
    });
    const sumMetric = (records, metric) => records.reduce((sum, item) => sum + (item[metric] || 0), 0);
    const totals = {
      postImpressions: sumMetric(dailyRecords, "postImpressions"),
      profileViews: sumMetric(dailyRecords, "profileViews"),
      searchAppearances: sumMetric(dailyRecords, "searchAppearances"),
      newFollowers: sumMetric(dailyRecords, "newFollowers"),
      followers: user.followers?.length || 0,
    };
    const previousTotals = {
      postImpressions: sumMetric(previousRecords, "postImpressions"),
      profileViews: sumMetric(previousRecords, "profileViews"),
      searchAppearances: sumMetric(previousRecords, "searchAppearances"),
      newFollowers: sumMetric(previousRecords, "newFollowers"),
    };

    const [repostCounts, saveCounts, sendCounts] = await Promise.all([
      Promise.all(posts.map((post) => Post.countDocuments({ repostOf: post._id }))),
      Promise.all(posts.map((post) => User.countDocuments({ savedPosts: post._id }))),
      Promise.all(posts.map((post) => Message.countDocuments({ post: post._id }))),
    ]);
    const content = posts.map((post, index) => ({
      ...post,
      likesCount: post.likes?.length || 0,
      reactionsCount: post.reactions?.length || 0,
      repostsCount: repostCounts[index],
      savesCount: saveCounts[index],
      sendsCount: sendCounts[index],
      engagement: Math.max(post.likes?.length || 0, post.reactions?.length || 0)
        + (post.commentsCount || 0) + repostCounts[index] + saveCounts[index] + sendCounts[index],
    }));

    const locationCounts = new Map();
    const headlineCounts = new Map();
    for (const view of recentViews) {
      const location = view.viewer?.location?.split(",").map((part) => part.trim()).filter(Boolean)[0];
      const industry = view.viewer?.headline?.trim();
      if (location) locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      if (industry) headlineCounts.set(industry, (headlineCounts.get(industry) || 0) + 1);
    }
    const toDemographics = (counts) => {
      const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((sum, [, count]) => sum + count, 0);
      if (total < 5) return { available: false, items: [] };
      return {
        available: true,
        items: entries.slice(0, 5).map(([label, count]) => ({
          label,
          count,
          percentage: Math.round((count / total) * 100),
        })),
      };
    };

    return res.json({
      days,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totals: {
        ...totals,
        legacyProfileViews: user.profileViews || 0,
        legacyPostImpressions: user.postImpressions || 0,
        legacySearchAppearances: user.searchAppearances || 0,
      },
      previousTotals,
      daily,
      content,
      demographics: {
        locations: toDemographics(locationCounts),
        headlines: toDemographics(headlineCounts),
      },
    });
  } catch (error) {
    console.error("Get profile analytics error:", error);
    return res.status(500).json({ message: "Unable to load profile analytics" });
  }
};

export const getFollowingUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("following");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingIds = user.following.map((userId) => userId.toString());
    const users = await User.find({ _id: { $in: followingIds } })
      .select(userSummaryFields)
      .lean();

    const usersWithConnectionStatus = await attachConnectionStatus(
      users,
      req.user._id,
    );

    return res.status(200).json({
      following: followingIds,
      users: usersWithConnectionStatus,
    });
  } catch (error) {
    console.error("Get following users error:", error);

    return res.status(500).json({
      message: "Failed to load following data",
    });
  }
};

export const getUnfollowedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("unfollowedUsers")
      .populate("unfollowedUsers", userSummaryFields)
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      users: (user.unfollowedUsers || []).filter(Boolean),
    });
  } catch (error) {
    console.error("Get unfollowed users error:", error);
    return res.status(500).json({ message: "Failed to load unfollowed people" });
  }
};

export const getFollowedJobPosters = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("following").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const followingIds = user.following || [];
    if (!followingIds.length) return res.status(200).json({ users: [] });

    const jobPosterIds = await Job.distinct("postedBy", {
      postedBy: { $in: followingIds },
    });
    const users = await User.find({
      _id: { $in: jobPosterIds },
      accountStatus: { $ne: "deactivated" },
    })
      .select(`${userSummaryFields} followers`)
      .sort({ name: 1, _id: 1 })
      .lean();

    const usersWithConnectionStatus = await attachConnectionStatus(users, req.user._id);
    return res.status(200).json({
      users: usersWithConnectionStatus.map((person) => {
        const { followers, ...safePerson } = person;
        return {
          ...safePerson,
          followerCount: followers?.length || 0,
        };
      }),
    });
  } catch (error) {
    console.error("Get followed job posters error:", error);
    return res.status(500).json({ message: "Failed to load followed job posters" });
  }
};

export const getDiscoverableJobPosters = async (req, res) => {
  try {
    const page = Math.max(0, Number.parseInt(req.query.page, 10) || 0);
    const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const currentUser = await User.findById(req.user._id).select("following blockedUsers").lean();
    if (!currentUser) return res.status(404).json({ message: "User not found" });
    const followingIds = new Set((currentUser.following || []).map((id) => id.toString()));
    const blockedIds = new Set((currentUser.blockedUsers || []).map((id) => id.toString()));
    const filter = {
      _id: { $ne: req.user._id, ...(blockedIds.size ? { $nin: [...blockedIds] } : {}) },
      accountStatus: { $ne: "deactivated" },
    };
    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select(`${userSummaryFields} followers`)
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1, _id: 1 })
      .skip(page * limit)
      .limit(limit)
      .lean();
    return res.status(200).json({
      pages: users.map((person) => ({
        _id: person._id,
        name: person.name,
        headline: person.headline,
        location: person.location,
        profilePicture: person.profilePicture,
        followerCount: person.followers?.length || 0,
        isFollowing: followingIds.has(person._id.toString()),
      })),
      page,
      hasMore: (page + 1) * limit < total,
      total,
    });
  } catch (error) {
    console.error("Get discoverable pages error:", error);
    return res.status(500).json({ message: "Failed to load people to follow" });
  }
};

export const getDiscoverableUsers = async (req, res) => {
  try {
    const page = Math.max(0, Number.parseInt(req.query.page, 10) || 0);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const acceptedConnections = await Connection.find({
      status: CONNECTION_STATUS.ACCEPTED,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    }).select("requester recipient").lean();
    const connectedUserIds = acceptedConnections.map((connection) =>
      connection.requester.toString() === req.user._id.toString()
        ? connection.recipient
        : connection.requester,
    );
    const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
    if (!currentUser) return res.status(404).json({ message: "User not found" });
    const blockedIds = currentUser.blockedUsers || [];
    const query = {
      _id: { $ne: req.user._id, ...(blockedIds.length ? { $nin: blockedIds } : {}) },
      accountStatus: { $ne: "deactivated" },
      blockedUsers: { $ne: req.user._id },
      $or: [
        { profileVisibility: "public" },
        { profileVisibility: { $exists: false } },
        { profileVisibility: "connections", _id: { $in: connectedUserIds } },
      ],
    };
    const [users, total] = await Promise.all([
      User.find(query)
        .select(userSummaryFields)
        .collation({ locale: "en", strength: 2 })
        .sort({ name: 1, _id: 1 })
        .skip(page * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);
    const usersWithConnectionStatus = await attachConnectionStatus(users, req.user._id);
    return res.status(200).json({
      users: usersWithConnectionStatus,
      page,
      hasMore: (page + 1) * limit < total,
    });
  } catch (error) {
    console.error("Get discoverable users error:", error);
    return res.status(500).json({ message: "Failed to load people" });
  }
};

export const getProfileSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select("following followers blockedUsers location headline");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const excludedIds = new Set([
      req.user._id.toString(),
      ...(currentUser.following || []).map((id) => id.toString()),
      ...(currentUser.blockedUsers || []).map((id) => id.toString()),
    ]);
    const sharedConnections = currentUser.following || [];
    const candidateQuery = {
      _id: { $nin: [...excludedIds] },
      blockedUsers: { $ne: req.user._id },
      ...(sharedConnections.length
        ? { followers: { $in: sharedConnections } }
        : currentUser.location
          ? { location: new RegExp(escapeRegex(currentUser.location.split(",")[0].trim()), "i") }
          : currentUser.headline
            ? { headline: new RegExp(escapeRegex(currentUser.headline.split(" ")[0]), "i") }
            : {}),
    };
    const candidates = await User.find({
      ...candidateQuery,
      accountStatus: { $ne: "deactivated" },
      $or: [{ profileVisibility: "public" }, { profileVisibility: { $exists: false } }],
    })
      .select(userSummaryFields)
      .limit(8)
      .lean();
    const suggestions = await attachConnectionStatus(candidates, req.user._id);
    return res.status(200).json({ users: suggestions });
  } catch (error) {
    console.error("Get profile suggestions error:", error);
    return res.status(500).json({ message: "Failed to load profile suggestions" });
  }
};

export const getRelatedProfiles = async (req, res) => {
  try {
    const { userId } = req.params;
    const target = mongoose.isValidObjectId(userId)
      ? await User.findById(userId).select("skills headline location blockedUsers")
      : await User.findOne({ publicProfileSlug: userId.toLowerCase() }).select("skills headline location blockedUsers");
    if (!target) return res.status(404).json({ message: "Profile not found" });
    const exclusions = [target._id, req.user._id];
    const sharedSkills = (target.skills || []).slice(0, 10);
    const headlineTerm = target.headline?.trim().split(/\s+/)[0];
    const locationTerm = target.location?.split(",")[0].trim();
    if (!sharedSkills.length && !headlineTerm && !locationTerm) {
      return res.status(200).json({ users: [] });
    }
    const query = {
      _id: { $nin: [...exclusions, ...(target.blockedUsers || [])] },
      blockedUsers: { $ne: req.user._id },
      accountStatus: { $ne: "deactivated" },
      $or: [{ profileVisibility: "public" }, { profileVisibility: { $exists: false } }],
      ...(sharedSkills.length
        ? { skills: { $in: sharedSkills } }
        : headlineTerm
          ? { headline: new RegExp(escapeRegex(headlineTerm), "i") }
          : locationTerm
            ? { location: new RegExp(escapeRegex(locationTerm), "i") }
            : {}),
    };
    const users = await User.find(query).select(userSummaryFields).limit(6).lean();
    return res.status(200).json({ users: await attachConnectionStatus(users, req.user._id) });
  } catch (error) {
    console.error("Get related profiles error:", error);
    return res.status(500).json({ message: "Failed to load related profiles" });
  }
};

export const getFollowersUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id)
      .select("followers following")
      .populate("followers", userSummaryFields)
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingIds = new Set(currentUser.following.map(String));
    const users = await attachConnectionStatus(
      currentUser.followers.map((follower) => ({
        ...follower,
        isFollowing: followingIds.has(follower._id.toString()),
      })),
      req.user._id,
    );

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Get followers error:", error);
    return res.status(500).json({ message: "Failed to load followers" });
  }
};

export const toggleFollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(userId).select("_id followers following blockedUsers");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = await User.findById(req.user._id).select("following followers unfollowedUsers blockedUsers");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      currentUser.blockedUsers.some((id) => id.toString() === userId) ||
      targetUser.blockedUsers.some((id) => id.toString() === currentUser._id.toString())
    ) {
      return res.status(403).json({ message: "This member is unavailable" });
    }

    const alreadyFollowing = currentUser.following.some(
      (followingId) => followingId.toString() === userId,
    );

    if (alreadyFollowing) {
      currentUser.following = currentUser.following.filter(
        (followingId) => followingId.toString() !== userId,
      );
      if (!currentUser.unfollowedUsers.some((id) => id.toString() === userId)) {
        currentUser.unfollowedUsers.push(targetUser._id);
      }
      targetUser.followers = targetUser.followers.filter(
        (followerId) => followerId.toString() !== req.user._id.toString(),
      );

      await Promise.all([currentUser.save(), targetUser.save()]);

      return res.status(200).json({
        following: false,
        userId,
      });
    }

    currentUser.following.push(targetUser._id);
    currentUser.unfollowedUsers = currentUser.unfollowedUsers.filter(
      (id) => id.toString() !== userId,
    );
    targetUser.followers.push(req.user._id);

    await Promise.all([currentUser.save(), targetUser.save()]);
    await recordProfileAnalytics([targetUser._id], "newFollowers");
    await createNotification({
      recipient: targetUser._id,
      sender: currentUser._id,
      type: NOTIFICATION_TYPES.NEW_FOLLOWER,
      dedupe: true,
    });

    return res.status(200).json({
      following: true,
      userId,
    });
  } catch (error) {
    console.error("Toggle follow user error:", error);

    return res.status(500).json({
      message: "Failed to update follow status",
    });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("blockedUsers")
      .populate("blockedUsers", "name headline location profilePicture publicProfileSlug")
      .lean();
    return res.json({ users: user?.blockedUsers || [] });
  } catch (error) {
    console.error("Get blocked members error:", error);
    return res.status(500).json({ message: "Unable to load blocked members" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId) || userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Choose a valid member to block" });
    }
    const target = await User.findOne({ _id: userId, accountStatus: { $ne: "deactivated" } })
      .select("_id followers following");
    const current = await User.findById(req.user._id).select("blockedUsers followers following unfollowedUsers");
    if (!target || !current) return res.status(404).json({ message: "Member not found" });
    if (!current.blockedUsers.some((id) => id.toString() === userId)) {
      current.blockedUsers.push(target._id);
    }
    current.following = current.following.filter((id) => id.toString() !== userId);
    current.unfollowedUsers = current.unfollowedUsers.filter((id) => id.toString() !== userId);
    target.following = target.following.filter((id) => id.toString() !== current._id.toString());
    target.followers = target.followers.filter((id) => id.toString() !== current._id.toString());
    current.followers = current.followers.filter((id) => id.toString() !== userId);
    await Promise.all([
      current.save(),
      target.save(),
      Connection.deleteOne({ pairKey: makeConnectionPairKey(current._id, target._id) }),
    ]);
    return res.json({ message: "Member blocked" });
  } catch (error) {
    console.error("Block member error:", error);
    return res.status(500).json({ message: "Unable to block member" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }
    const result = await User.updateOne(
      { _id: req.user._id },
      { $pull: { blockedUsers: req.params.userId } },
    );
    if (!result.matchedCount) return res.status(404).json({ message: "Account not found" });
    return res.json({ message: "Member unblocked" });
  } catch (error) {
    console.error("Unblock member error:", error);
    return res.status(500).json({ message: "Unable to unblock member" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q?.trim() || "";

    if (!query) {
      return res.status(200).json({
        users: [],
      });
    }

    if (query.length > 80) {
      return res.status(400).json({
        message: "Search query must be 80 characters or fewer",
      });
    }

    const searchRegex = new RegExp(escapeRegex(query), "i");

    const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
    const users = await User.find({
      _id: {
        $ne: req.user._id,
        ...(currentUser?.blockedUsers?.length ? { $nin: currentUser.blockedUsers } : {}),
      },
      accountStatus: { $ne: "deactivated" },
      $and: [
        { $or: [{ profileVisibility: "public" }, { profileVisibility: { $exists: false } }] },
        { blockedUsers: { $ne: req.user._id } },
        { $or: [
          { name: searchRegex },
          { email: searchRegex },
          { "securityEmails.email": searchRegex },
          { "securityPhoneNumbers.number": searchRegex },
          { headline: searchRegex },
          { location: searchRegex },
        ] },
      ],
    })
      .select(`${userSummaryFields} email securityEmails discoverabilityEmail discoverabilityPhone securityPhoneNumbers`)
      .limit(40)
      .lean();

    const lowerQuery = query.toLowerCase();
    const digitsQuery = query.replace(/\D/g, "");
    const viewerConnections = await Connection.find({
      status: CONNECTION_STATUS.ACCEPTED,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    }).select("requester recipient").lean();
    const connectedIds = new Set(viewerConnections.flatMap((connection) => [
      connection.requester.toString() === req.user._id.toString() ? connection.recipient.toString() : connection.requester.toString(),
    ]));
    const secondDegreeIds = new Set();
    if (connectedIds.size) {
      const secondDegreeConnections = await Connection.find({
        status: CONNECTION_STATUS.ACCEPTED,
        $or: [
          { requester: { $in: [...connectedIds] } },
          { recipient: { $in: [...connectedIds] } },
        ],
      }).select("requester recipient").lean();
      for (const connection of secondDegreeConnections) {
        const requesterId = connection.requester.toString();
        const recipientId = connection.recipient.toString();
        if (connectedIds.has(requesterId)) secondDegreeIds.add(recipientId);
        if (connectedIds.has(recipientId)) secondDegreeIds.add(requesterId);
      }
    }
    const discoverableUsers = users.filter((candidate) => {
        const emailMatch = Boolean(candidate.email && searchRegex.test(candidate.email))
          || candidate.securityEmails?.some((item) => item.verified && searchRegex.test(item.email));
      const phoneMatch = digitsQuery.length >= 7 && candidate.securityPhoneNumbers?.some(
        (item) => item.number.replace(/\D/g, "") === digitsQuery,
      );
      if (!emailMatch && !phoneMatch) return true;
      if (emailMatch) {
        const audience = candidate.discoverabilityEmail || "public";
        if (audience === "connections" && !connectedIds.has(candidate._id.toString())) return false;
        if (audience === "network" && !connectedIds.has(candidate._id.toString()) && !secondDegreeIds.has(candidate._id.toString())) return false;
      }
      if (phoneMatch) {
        const audience = candidate.discoverabilityPhone || "public";
        if (audience === "nobody") return false;
        if (audience === "second-degree" && !connectedIds.has(candidate._id.toString()) && !secondDegreeIds.has(candidate._id.toString())) return false;
      }
      return true;
    });
    const rankUser = (user) => {
      const name = user.name?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      const headline = user.headline?.toLowerCase() || "";
      const location = user.location?.toLowerCase() || "";

      if (name === lowerQuery || email === lowerQuery) return 0;
      if (name.startsWith(lowerQuery) || email.startsWith(lowerQuery)) return 1;
      if (headline.startsWith(lowerQuery) || location.startsWith(lowerQuery)) {
        return 2;
      }

      return 3;
    };

    const rankedUsers = discoverableUsers
      .sort((first, second) => {
        const rankDifference = rankUser(first) - rankUser(second);
        if (rankDifference !== 0) return rankDifference;
        return (first.name || "").localeCompare(second.name || "");
      })
      .slice(0, 20);

    if (rankedUsers.length) {
      await User.updateMany(
        { _id: { $in: rankedUsers.map((user) => user._id) } },
        { $inc: { searchAppearances: 1 } },
      );
      await recordProfileAnalytics(rankedUsers.map((user) => user._id), "searchAppearances");
    }

    const usersWithConnectionStatus = await attachConnectionStatus(
      rankedUsers.map((user) => {
        const sanitizedUser = { ...user };
        delete sanitizedUser.email;
        return sanitizedUser;
      }),
      req.user._id,
    );

    return res.status(200).json({
      users: usersWithConnectionStatus,
    });
  } catch (error) {
    console.error("Search users error:", error);

    return res.status(500).json({
      message: "Failed to search users",
    });
  }
};

export const uploadProfileImage = async (req, res) => {
  let uploadResult;

  try {
    ensureImageFile(req.file);

    uploadResult = await uploadProfileAsset(
      req.file,
      "careerlink/profile-images",
    );

    const oldPublicId = req.user.profilePicturePublicId;

    req.user.profilePicture = uploadResult.secure_url;
    req.user.profilePicturePublicId = uploadResult.public_id || "";
    await req.user.save();

    await destroyCloudinaryAsset(oldPublicId);

    return res.status(200).json({
      message: "Profile image uploaded successfully",
      profilePicture: req.user.profilePicture,
      profilePicturePublicId: req.user.profilePicturePublicId,
    });
  } catch (error) {
    await destroyCloudinaryAsset(uploadResult?.public_id);

    const status = error.statusCode || 500;

    if (status === 500) {
      console.error("Profile image upload error:", error);
    }

    return res.status(status).json({
      message: status === 500 ? "Failed to upload profile image" : error.message,
    });
  }
};

export const removeProfileImage = async (req, res) => {
  try {
    await destroyCloudinaryAsset(req.user.profilePicturePublicId);

    req.user.profilePicture = "";
    req.user.profilePicturePublicId = "";
    await req.user.save();

    return res.status(200).json({
      message: "Profile image removed successfully",
      profilePicture: "",
      profilePicturePublicId: "",
    });
  } catch (error) {
    console.error("Remove profile image error:", error);

    return res.status(500).json({
      message: "Failed to remove profile image",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updates = {};
    const previousExperience = req.user.experience.map((entry) => ({
      id: entry._id.toString(),
      company: entry.company || "",
      position: entry.position || "",
      startDate: entry.startDate?.toISOString?.() || "",
      currentlyWorking: entry.currentlyWorking === true,
    }));
    const previousEducation = req.user.education.map((entry) => ({
      id: entry._id.toString(),
      school: entry.school || "",
      degree: entry.degree || "",
      fieldOfStudy: entry.fieldOfStudy || "",
      endDate: entry.endDate?.toISOString?.() || "",
      currentlyStudying: entry.currentlyStudying === true,
    }));

    if ("name" in req.body) {
      updates.name = cleanString(req.body.name, "Name", FIELD_LIMITS.name, {
        required: true,
      });
    }

    if ("headline" in req.body) {
      updates.headline =
        cleanString(req.body.headline, "Headline", FIELD_LIMITS.headline) ||
        "";
    }

    if ("bio" in req.body) {
      updates.bio = cleanString(req.body.bio, "About", FIELD_LIMITS.bio) || "";
    }

    if ("location" in req.body) {
      updates.location =
        cleanString(req.body.location, "Location", FIELD_LIMITS.location) || "";
    }

    if ("birthDate" in req.body) {
      if (req.body.birthDate === "") {
        updates.birthDate = null;
      } else {
        const birthDate = new Date(req.body.birthDate);
        if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
          throw validationError("Enter a valid birthday that is not in the future");
        }
        updates.birthDate = birthDate;
      }
    }

    if ("birthdayVisibility" in req.body) {
      if (!["private", "connections", "everyone"].includes(req.body.birthdayVisibility)) {
        throw validationError("Choose a valid birthday visibility");
      }
      updates.birthdayVisibility = req.body.birthdayVisibility;
    }

    for (const [field, label, maxLength] of [
      ["city", "City", 80],
      ["country", "Country/region", 80],
      ["additionalName", "Additional name", 80],
      ["pronouns", "Pronouns", 40],
      ["industry", "Industry", 120],
      ["introEducation", "Education", 140],
    ]) {
      if (field in req.body) {
        updates[field] = cleanString(req.body[field], label, maxLength) || "";
      }
    }

    if ("preferredLanguage" in req.body) {
      if (!["en", "hi"].includes(req.body.preferredLanguage)) {
        throw validationError("Choose a supported language");
      }
      updates.preferredLanguage = req.body.preferredLanguage;
    }

    if ("genderIdentity" in req.body) {
      updates.genderIdentity =
        cleanString(req.body.genderIdentity, "Gender identity", 80) || "";
    }

    if ("disabilityStatus" in req.body) {
      if (!["", "yes", "no", "prefer-not-to-say"].includes(req.body.disabilityStatus)) {
        throw validationError("Choose a valid disability status");
      }
      updates.disabilityStatus = req.body.disabilityStatus;
    }

    if ("contentLanguage" in req.body) {
      if (!["en", "hi"].includes(req.body.contentLanguage)) {
        throw validationError("Choose a supported content language");
      }
      updates.contentLanguage = req.body.contentLanguage;
    }

    if ("excludedContentLanguages" in req.body) {
      const excludedLanguages = req.body.excludedContentLanguages;
      if (!Array.isArray(excludedLanguages) || excludedLanguages.some((item) => !["en", "hi"].includes(item))) {
        throw validationError("Choose supported excluded content languages");
      }
      updates.excludedContentLanguages = [...new Set(excludedLanguages)];
    }

    if ("profilePhotoVisibility" in req.body) {
      if (!["none", "connections", "network", "all"].includes(req.body.profilePhotoVisibility)) {
        throw validationError("Choose a valid profile photo visibility option");
      }
      updates.profilePhotoVisibility = req.body.profilePhotoVisibility;
    }

    if ("preferredFeedView" in req.body) {
      if (!["relevant", "recent"].includes(req.body.preferredFeedView)) {
        throw validationError("Choose a valid feed view");
      }
      updates.preferredFeedView = req.body.preferredFeedView;
    }

    if ("contactEmail" in req.body) {
      const contactEmail = cleanString(req.body.contactEmail, "Contact email", 254) || "";
      if (contactEmail && !EMAIL_REGEX.test(contactEmail)) throw validationError("Please enter a valid contact email");
      updates.contactEmail = contactEmail.toLowerCase();
    }

    if ("contactWebsite" in req.body) {
      const contactWebsite = cleanString(req.body.contactWebsite, "Website", 500) || "";
      if (contactWebsite && !/^https?:\/\//i.test(contactWebsite)) {
        throw validationError("Website must start with http:// or https://");
      }
      updates.contactWebsite = contactWebsite;
    }

    if ("profileLanguage" in req.body) {
      updates.profileLanguage = cleanString(req.body.profileLanguage, "Profile language", 40, { required: true });
    }

    if ("profileFrame" in req.body) {
      if (!["", "open-to-work", "hiring"].includes(req.body.profileFrame)) {
        throw validationError("Choose a valid profile frame");
      }
      updates.profileFrame = req.body.profileFrame;
    }

    for (const field of ["profileVisibility", "contactInfoVisibility", "activityVisibility"]) {
      if (field in req.body) {
        if (!["public", "connections", "private"].includes(req.body[field])) {
          throw validationError(`${field} must be public, connections, or private`);
        }
        updates[field] = req.body[field];
      }
    }

    const visibilityEnums = {
      profileViewerVisibility: ["name-headline", "private-characteristics", "private"],
      emailVisibility: ["private", "connections", "network", "public"],
      followVisibility: ["private", "public"],
      lastNameVisibility: ["full", "initial"],
      discoverabilityEmail: ["connections", "network", "public"],
      discoverabilityPhone: ["nobody", "second-degree", "public"],
      activeStatusVisibility: ["nobody", "connections", "public"],
      followerVisibility: ["public", "connections"],
    };
    for (const [field, allowed] of Object.entries(visibilityEnums)) {
      if (field in req.body) {
        if (!allowed.includes(req.body[field])) {
          throw validationError(`Choose a valid ${field} option`);
        }
        updates[field] = req.body[field];
      }
    }

    for (const field of [
      "publicProfileEnabled",
      "connectionVisibility",
      "representOnContent",
      "offPlatformVisibility",
      "shareProfileUpdates",
      "notifyNetworkInNews",
      "allowMentionsTagsCollabs",
      "followPrimary",
    ]) {
      if (field in req.body) {
        if (typeof req.body[field] !== "boolean") {
          throw validationError(`${field} must be true or false`);
        }
        updates[field] = req.body[field];
      }
    }

    if ("publicProfileFields" in req.body) {
      const allowedFields = [
        "profilePhoto",
        "backgroundPhoto",
        "headline",
        "summary",
        "activity",
        "education",
        "projects",
        "languages",
        "publicVisibilityLimits",
      ];
      if (!req.body.publicProfileFields || typeof req.body.publicProfileFields !== "object" || Array.isArray(req.body.publicProfileFields)) {
        throw validationError("Choose valid public profile fields");
      }
      const fields = {};
      for (const [field, value] of Object.entries(req.body.publicProfileFields)) {
        if (!allowedFields.includes(field) || typeof value !== "boolean") {
          throw validationError("Choose valid public profile fields");
        }
        fields[field] = value;
      }
      updates.publicProfileFields = {
        ...req.user.publicProfileFields?.toObject?.(),
        ...fields,
      };
    }

    if ("publicProfileSlug" in req.body) {
      const slug = cleanString(req.body.publicProfileSlug, "Public profile URL", 40)?.toLowerCase() || "";
      if (slug && (slug.length < 3 || !/^[a-z0-9-]+$/.test(slug))) {
        throw validationError("Use 3–40 letters, numbers or hyphens for your public profile URL");
      }
      updates.publicProfileSlug = slug;
    }

    if ("openToWork" in req.body) {
      updates.openToWork = cleanOpenToWork(req.body.openToWork);
    }

    if ("skills" in req.body) {
      updates.skills = cleanSkills(req.body.skills);
    }

    if ("experience" in req.body) {
      updates.experience = cleanExperience(req.body.experience);
    }

    if ("education" in req.body) {
      updates.education = cleanEducation(req.body.education);
    }

    if ("projects" in req.body) {
      updates.projects = cleanProjects(req.body.projects);
    }

    if ("languages" in req.body) {
      updates.languages = cleanLanguages(req.body.languages);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid profile updates were provided",
      });
    }

    Object.assign(req.user, updates);
    await req.user.save();

    if (req.user.shareProfileUpdates !== false) {
      const getCurrentEmployment = (entries) => entries
        .filter((entry) => entry.currentlyWorking)
        .map((entry) => `${entry.company || ""}|${entry.position || ""}|${entry.startDate?.toISOString?.() || ""}`)
        .sort()
        .join(";");
      const currentExperience = req.user.experience.map((entry) => ({
        id: entry._id.toString(),
        company: entry.company || "",
        position: entry.position || "",
        startDate: entry.startDate,
        currentlyWorking: entry.currentlyWorking,
      }));
      const currentEducation = req.user.education.map((entry) => ({
        id: entry._id.toString(),
        school: entry.school || "",
        degree: entry.degree || "",
        fieldOfStudy: entry.fieldOfStudy || "",
        endDate: entry.endDate?.toISOString?.() || "",
        currentlyStudying: entry.currentlyStudying === true,
      }));
      const employmentChanged = "experience" in updates
        && getCurrentEmployment(previousExperience.map((entry) => ({
          ...entry,
          startDate: entry.startDate ? new Date(entry.startDate) : null,
        }))) !== getCurrentEmployment(currentExperience);
      const educationChanged = "education" in updates
        && JSON.stringify(previousEducation) !== JSON.stringify(currentEducation);

      if (employmentChanged || educationChanged) {
        const connections = await Connection.find({
          status: CONNECTION_STATUS.ACCEPTED,
          $or: [{ requester: req.user._id }, { recipient: req.user._id }],
        }).select("requester recipient");
        const recipients = connections.map((connection) =>
          connection.requester.toString() === req.user._id.toString()
            ? connection.recipient
            : connection.requester,
        );
        const currentRole = req.user.experience.find((entry) => entry.currentlyWorking);
        const currentSchool = req.user.education.find((entry) => entry.currentlyStudying);
        await Promise.all(recipients.flatMap((recipient) => [
          ...(employmentChanged ? [createNotification({
            recipient,
            sender: req.user._id,
            type: NOTIFICATION_TYPES.NETWORK_JOB_CHANGE,
            details: currentRole
              ? `${req.user.name} started or updated a role as ${currentRole.position} at ${currentRole.company}.`
              : `${req.user.name} updated their work experience.`,
          })] : []),
          ...(educationChanged ? [createNotification({
            recipient,
            sender: req.user._id,
            type: NOTIFICATION_TYPES.NETWORK_EDUCATION,
            details: currentSchool
              ? `${req.user.name} updated their education at ${currentSchool.school}.`
              : `${req.user.name} updated their education.`,
          })] : []),
        ]));
      }
    }

    return res.status(200).json({
      user: req.user,
      message: "Profile updated successfully",
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.publicProfileSlug) {
      return res.status(409).json({ message: "That public profile URL is already in use" });
    }
    const status = error.statusCode || 500;

    if (status === 500) {
      console.error("Update profile error:", error);
    }

    return res.status(status).json({
      message: status === 500 ? "Failed to update profile" : error.message,
    });
  }
};

export const uploadResume = async (req, res) => {
  let uploadedPublicId = "";
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a resume file to upload" });
    const allowedTypes = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
    const extension = req.file.originalname.toLowerCase().split(".").pop();
    const extensionMimes = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    if (!allowedTypes.has(req.file.mimetype) || extensionMimes[extension] !== req.file.mimetype) {
      return res.status(400).json({ message: "Resume must be a PDF, DOC, or DOCX file" });
    }
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "Resume must be 10 MB or smaller" });
    }
    if (req.user.resumes.length >= 5) {
      return res.status(400).json({ message: "You can save up to 5 resumes" });
    }

    const safeName = req.file.originalname.replace(/[^\w.-]+/g, "_").slice(-150);
    const result = await uploadBufferToCloudinary(req.file, {
      folder: "careerlink/resumes",
      resource_type: "raw",
      type: "authenticated",
      public_id: `${Date.now()}-${crypto.randomUUID()}-${safeName}`,
      use_filename: false,
      unique_filename: false,
    });
    uploadedPublicId = result?.public_id || "";
    if (!result?.secure_url || !result?.public_id) {
      throw new Error("Resume upload did not return an asset URL");
    }

    req.user.resumes.push({
      name: req.file.originalname.slice(0, 180),
      publicId: result.public_id,
      url: result.secure_url,
      size: req.file.size,
    });
    await req.user.save();
    return res.status(201).json({ resumes: req.user.resumes });
  } catch (error) {
    if (uploadedPublicId) {
      await destroyCloudinaryAsset(uploadedPublicId, { resource_type: "raw", type: "authenticated" });
    }
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Resume upload error:", error);
    return res.status(500).json({ message: "Unable to upload resume" });
  }
};

export const deleteResume = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resumeId)) {
      return res.status(400).json({ message: "Invalid resume ID" });
    }
    const resume = req.user.resumes.id(req.params.resumeId);
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    const attachedApplication = await JobApplication.exists({
      applicant: req.user._id,
      resumeRef: resume._id,
    });
    if (attachedApplication) {
      return res.status(409).json({
        message: "This resume is attached to a job application and cannot be deleted.",
      });
    }
    const result = await destroyCloudinaryAsset(resume.publicId, { resource_type: "raw", type: "authenticated" });
    if (!result || !["ok", "not found"].includes(result.result)) {
      return res.status(502).json({ message: "Resume storage could not confirm deletion. Try again." });
    }
    resume.deleteOne();
    await req.user.save();
    return res.json({ resumes: req.user.resumes });
  } catch (error) {
    console.error("Resume deletion error:", error);
    return res.status(500).json({ message: "Unable to delete resume" });
  }
};

export const getResumeDownloadUrl = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.resumeId)) {
    return res.status(400).json({ message: "Invalid resume ID" });
  }
  const resume = req.user.resumes.id(req.params.resumeId);
  if (!resume) return res.status(404).json({ message: "Resume not found" });
  const url = cloudinary.url(resume.publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
    flags: "attachment",
  });
  return res.json({ url });
};

export const deactivateAccount = async (req, res) => {
  try {
    if (req.body.confirmation !== "DEACTIVATE") {
      return res.status(400).json({ message: 'Type "DEACTIVATE" to confirm account deactivation' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Account not found" });
    user.accountStatus = "deactivated";
    await user.save();
    return res.json({ message: "Account deactivated" });
  } catch (error) {
    console.error("Account deactivation error:", error);
    return res.status(500).json({ message: "Unable to deactivate account" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "Account not found" });
    const confirmedEmail = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (req.body.confirmation !== "DELETE" || confirmedEmail !== user.email) {
      return res.status(400).json({ message: "Enter your account email and type DELETE to confirm" });
    }
    if (user.password) {
      const currentPassword = cleanString(req.body.currentPassword, "Current password", 128, { required: true });
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
    }

    const userId = user._id;
    const userIdString = userId.toString();
    const posts = await Post.find({ $or: [{ author: userId }, { repostedBy: userId }] }).select("_id image video").lean();
    const postIds = posts.map((post) => post._id);
    const derivedReposts = postIds.length
      ? await Post.find({ repostOf: { $in: postIds } }).select("_id image video").lean()
      : [];
    const allPostIds = [...postIds, ...derivedReposts.map((post) => post._id)];
    const jobs = await Job.find({ postedBy: userId }).select("_id").lean();
    const jobIds = jobs.map((job) => job._id);
    const articles = await Article.find({ author: userId }).select("_id coverImage").lean();
    const articleIds = articles.map((article) => article._id);
    const groups = await Group.find({ owner: userId }).select("_id").lean();
    const groupIds = groups.map((group) => group._id);
    const events = await Event.find({ organizer: userId }).select("_id").lean();
    const eventIds = events.map((event) => event._id);
    const newsletters = await Newsletter.find({ author: userId }).select("_id").lean();
    const newsletterIds = newsletters.map((newsletter) => newsletter._id);
    const conversations = await Conversation.find({ participants: userId }).select("_id").lean();
    const conversationIds = conversations.map((conversation) => conversation._id);
    const messages = await Message.find({
      $or: [{ sender: userId }, ...(conversationIds.length ? [{ conversation: { $in: conversationIds } }] : [])],
    }).select("_id attachment").lean();
    const messageIds = messages.map((message) => message._id);

    const media = [
      ...(user.profilePicturePublicId ? [{ publicId: user.profilePicturePublicId, options: { resource_type: "image" } }] : []),
      ...(user.coverPicturePublicId ? [{ publicId: user.coverPicturePublicId, options: { resource_type: "image" } }] : []),
      ...(user.resumes || []).filter((resume) => resume.publicId).map((resume) => ({
        publicId: resume.publicId,
        options: { resource_type: "raw", type: "authenticated" },
      })),
      ...[...posts, ...derivedReposts].flatMap((post) => [
        ...(post.image?.publicId ? [{ publicId: post.image.publicId, options: { resource_type: "image" } }] : []),
        ...(post.video?.publicId ? [{ publicId: post.video.publicId, options: { resource_type: "video" } }] : []),
      ]),
      ...articles.filter((article) => article.coverImage?.publicId).map((article) => ({
        publicId: article.coverImage.publicId,
        options: { resource_type: "image" },
      })),
      ...messages.filter((message) => message.attachment?.publicId).map((message) => ({
        publicId: message.attachment.publicId,
        options: {
          resource_type: message.attachment.type?.startsWith("video/") ? "video"
            : message.attachment.type?.startsWith("image/") ? "image" : "raw",
        },
      })),
    ];
    const uniqueMedia = [...new Map(media.map((item) => [`${item.publicId}:${item.options.resource_type}:${item.options.type || ""}`, item])).values()];
    const cleanupResults = await Promise.all(uniqueMedia.map(({ publicId, options }) => destroyCloudinaryAsset(publicId, options)));
    if (cleanupResults.some((result) => !result || !["ok", "not found"].includes(result.result))) {
      return res.status(502).json({ message: "Some uploaded files could not be deleted. No database records were removed; please retry." });
    }

    const affectedCommentIds = await Comment.find({
      $or: [{ author: userId }, ...(allPostIds.length ? [{ post: { $in: allPostIds } }] : [])],
    }).distinct("_id");
    const affectedComments = await Comment.find({ _id: { $in: affectedCommentIds } }).distinct("post");
    const remainingCommentAuthorFilter = {
      $or: [{ author: userId }, ...(allPostIds.length ? [{ post: { $in: allPostIds } }] : [])],
    };

    await Comment.deleteMany(remainingCommentAuthorFilter);
    await PostReport.deleteMany({
      $or: [{ reporter: userId }, ...(allPostIds.length ? [{ post: { $in: allPostIds } }] : [])],
    });
    await Post.deleteMany({ _id: { $in: allPostIds } });
    await Post.updateMany(
      {},
      {
        $pull: {
          likes: userId,
          reactions: { user: userId },
        },
      },
    );
    if (affectedComments.length) {
      const counts = await Comment.aggregate([
        { $match: { post: { $in: affectedComments } } },
        { $group: { _id: "$post", count: { $sum: 1 } } },
      ]);
      const countByPost = new Map(counts.map((item) => [item._id.toString(), item.count]));
      await Promise.all(affectedComments.map((postId) =>
        Post.updateOne({ _id: postId }, { $set: { commentsCount: countByPost.get(postId.toString()) || 0 } }),
      ));
    }

    await JobApplication.deleteMany({
      $or: [{ applicant: userId }, ...(jobIds.length ? [{ job: { $in: jobIds } }] : [])],
    });
    await JobReport.deleteMany({
      $or: [{ reporter: userId }, ...(jobIds.length ? [{ job: { $in: jobIds } }] : [])],
    });
    await Job.deleteMany({ _id: { $in: jobIds } });
    await JobAlert.deleteMany({ user: userId });
    await Article.deleteMany({ _id: { $in: articleIds } });
    await Group.deleteMany({ _id: { $in: groupIds } });
    await Event.deleteMany({ _id: { $in: eventIds } });
    await Newsletter.deleteMany({ _id: { $in: newsletterIds } });
    await Message.deleteMany({ _id: { $in: messageIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
    await Connection.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] });
    await ProfileView.deleteMany({ $or: [{ profile: userId }, { viewer: userId }] });
    await ProfileAnalyticsDaily.deleteMany({ user: userId });
    await Notification.deleteMany({
      $or: [
        { recipient: userId },
        { sender: userId },
        ...(jobIds.length ? [{ job: { $in: jobIds } }] : []),
        ...(allPostIds.length ? [{ post: { $in: allPostIds } }] : []),
        ...(affectedCommentIds.length ? [{ comment: { $in: affectedCommentIds } }] : []),
      ],
    });
    await User.updateMany(
      { _id: { $ne: userId } },
      {
        $pull: {
          followers: userId,
          following: userId,
          unfollowedUsers: userId,
          savedPosts: { $in: allPostIds },
          savedArticles: { $in: articleIds },
          "notificationPreferences.mutedSenders": userId,
        },
      },
    );
    await Group.updateMany({ members: userId }, { $pull: { members: userId } });
    await Event.updateMany({ attendees: userId }, { $pull: { attendees: userId } });
    await Newsletter.updateMany({ subscribers: userId }, { $pull: { subscribers: userId } });
    await Job.updateMany({ savedBy: userId }, { $pull: { savedBy: userId } });
    await Message.updateMany(
      {},
      {
        $pull: {
          reactions: { user: userId },
          readBy: userId,
        },
      },
    );
    await User.deleteOne({ _id: userId });
    console.info(`Account deletion completed for user ${userIdString}`);
    return res.json({ message: "Your account and related CareerLink data have been permanently deleted" });
  } catch (error) {
    console.error("Permanent account deletion failed:", error);
    return res.status(500).json({ message: "Unable to complete account deletion. You can safely retry; contact support if the problem continues." });
  }
};

export const deleteEducation = async (req, res) => {
  try {
    const { educationId } = req.params;

    if (!mongoose.isValidObjectId(educationId)) {
      return res.status(400).json({
        message: "Invalid education ID",
      });
    }

    const educationExists = req.user.education.some(
      (education) => education._id.toString() === educationId,
    );

    if (!educationExists) {
      return res.status(404).json({
        message: "Education not found",
      });
    }

    req.user.education = req.user.education.filter(
      (education) => education._id.toString() !== educationId,
    );

    await req.user.save();

    return res.status(200).json({
      message: "Education deleted successfully",
      education: req.user.education,
    });
  } catch (error) {
    console.error("Delete education error:", error);

    return res.status(500).json({
      message: "Failed to delete education",
    });
  }
};

export const uploadCoverImage = async (req, res) => {
  let uploadResult;

  try {
    ensureImageFile(req.file);

    uploadResult = await uploadProfileAsset(req.file, "careerlink/cover-images");

    const oldPublicId = req.user.coverPicturePublicId;

    req.user.coverPicture = uploadResult.secure_url;
    req.user.coverPicturePublicId = uploadResult.public_id || "";

    await req.user.save();
    await destroyCloudinaryAsset(oldPublicId);

    return res.status(200).json({
      message: "Cover image uploaded successfully",
      coverPicture: req.user.coverPicture,
      coverPicturePublicId: req.user.coverPicturePublicId,
    });
  } catch (error) {
    await destroyCloudinaryAsset(uploadResult?.public_id);

    const status = error.statusCode || 500;

    if (status === 500) {
      console.error("Cover image upload error:", error);
    }

    return res.status(status).json({
      message: status === 500 ? "Failed to upload cover image" : error.message,
    });
  }
};

export const removeCoverImage = async (req, res) => {
  try {
    await destroyCloudinaryAsset(req.user.coverPicturePublicId);

    req.user.coverPicture = "";
    req.user.coverPicturePublicId = "";

    await req.user.save();

    return res.status(200).json({
      message: "Cover image removed successfully",
      coverPicture: "",
      coverPicturePublicId: "",
    });
  } catch (error) {
    console.error("Remove cover image error:", error);

    return res.status(500).json({
      message: "Failed to remove cover image",
    });
  }
};
