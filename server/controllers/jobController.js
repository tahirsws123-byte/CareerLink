import mongoose from "mongoose";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import JobAlert from "../models/JobAlert.js";
import { NOTIFICATION_TYPES } from "../models/Notification.js";
import User from "../models/User.js";
import Connection, { CONNECTION_STATUS } from "../models/Connection.js";
import cloudinary from "../config/cloudinary.js";
import JobReport from "../models/JobReport.js";
import { createNotification } from "../utils/notificationUtils.js";
import Notification from "../models/Notification.js";

const isId = (value) => mongoose.isValidObjectId(value);
const listParam = (value) => (typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : []);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listJobs = async (req, res) => {
  try {
    const { q = "", type, location, datePosted } = req.query;
    const filter = { $and: [{ $or: [{ status: "open" }, { status: { $exists: false } }] }] };
    if (req.query.jobId) {
      if (!isId(req.query.jobId)) return res.status(400).json({ message: "Invalid job ID" });
      filter._id = req.query.jobId;
    }
    if (q.trim()) {
      const term = escapeRegex(q.trim());
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { company: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { tags: { $regex: term, $options: "i" } },
      ];
    }
    if (location && location !== "All") filter.location = { $regex: `^${escapeRegex(location)}`, $options: "i" };
    if (type && type !== "All") {
      const selectedTypeFilter = type === "Remote"
        ? { $or: [{ workMode: "Remote" }, { location: /remote/i }] }
        : { type };
      filter.$and = [...(filter.$and || []), selectedTypeFilter];
    }

    const levels = listParam(req.query.levels || req.query.level);
    const companies = listParam(req.query.companies);
    const workModes = listParam(req.query.workModes);
    const locations = listParam(req.query.locations);
    const industries = listParam(req.query.industries);
    const functions = listParam(req.query.functions);
    const titles = listParam(req.query.titles);
    const jobTypes = listParam(req.query.jobTypes);
    const commitments = listParam(req.query.commitments);
    if (levels.length) filter.level = { $in: levels };
    if (companies.length) filter.company = { $in: companies.map((company) => new RegExp(escapeRegex(company), "i")) };
    if (workModes.length) {
      const modeFilters = [];
      for (const mode of workModes) {
        if (mode === "Remote") modeFilters.push({ $or: [{ workMode: "Remote" }, { location: /remote/i }] });
        else if (mode === "Hybrid") modeFilters.push({ $or: [{ workMode: "Hybrid" }, { type: "Hybrid" }] });
        else modeFilters.push({ $and: [{ workMode: { $nin: ["Remote", "Hybrid"] } }, { location: { $not: /remote/i } }, { type: { $ne: "Hybrid" } }] });
      }
      filter.$and = [...(filter.$and || []), { $or: modeFilters }];
    }
    if (locations.length) {
      filter.$and = [...(filter.$and || []), {
        $or: locations.map((item) => ({ location: { $regex: escapeRegex(item), $options: "i" } })),
      }];
    }
    if (industries.length) filter.industry = { $in: industries };
    if (functions.length) filter.jobFunction = { $in: functions };
    if (titles.length) filter.title = { $in: titles.map((title) => new RegExp(escapeRegex(title), "i")) };
    if (jobTypes.length) {
      const jobTypeFilters = [];
      const employmentTypes = jobTypes.filter((jobType) => jobType !== "Remote");
      if (employmentTypes.length) jobTypeFilters.push({ type: { $in: employmentTypes } });
      if (jobTypes.includes("Remote")) {
        jobTypeFilters.push({ $or: [{ workMode: "Remote" }, { location: /remote/i }] });
      }
      filter.$and = [...(filter.$and || []), { $or: jobTypeFilters }];
    }
    if (commitments.length) filter.commitments = { $in: commitments };
    if (req.query.easyApply === "true") filter.easyApply = true;
    if (req.query.verified === "true") filter.verified = true;
    if (req.query.under10 === "true") filter.applicantCount = { $lt: 10 };

    if (datePosted && datePosted !== "any") {
      const days = datePosted === "24h" ? 1 : datePosted === "week" ? 7 : datePosted === "month" ? 30 : 0;
      if (days) filter.postedAt = { $gte: new Date(Date.now() - days * 86400000) };
    }

    const jobs = await Job.find(filter).populate("postedBy", "name headline profilePicture").sort({ postedAt: -1 }).limit(100).lean();
    const applications = await JobApplication.find({ applicant: req.user._id }).select("job status").lean();
    const applicationByJob = Object.fromEntries(applications.map((item) => [item.job.toString(), item]));
    return res.json({
      jobs: jobs.map((job) => ({
        ...job,
        saved: job.savedBy.some((id) => id.toString() === req.user._id.toString()),
        application: applicationByJob[job._id.toString()] || null,
        posted: formatPosted(job.postedAt),
      })),
    });
  } catch (error) {
    console.error("List jobs error:", error);
    return res.status(500).json({ message: "Failed to load jobs" });
  }
};

export const getMyPostedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 }).lean();
    const applications = await JobApplication.aggregate([
      { $match: { job: { $in: jobs.map((job) => job._id) } } },
      { $group: { _id: "$job", count: { $sum: 1 } } },
    ]);
    const counts = new Map(applications.map((item) => [item._id.toString(), item.count]));
    return res.json({ jobs: jobs.map((job) => ({ ...job, applicantCount: counts.get(job._id.toString()) || 0 })) });
  } catch (error) {
    console.error("Get posted jobs error:", error);
    return res.status(500).json({ message: "Unable to load your posted jobs" });
  }
};

export const getManagedJob = async (req, res) => {
  if (!isId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID" });
  const job = await Job.findOne({ _id: req.params.jobId, postedBy: req.user._id }).populate("postedBy", "name headline profilePicture");
  if (!job) return res.status(404).json({ message: "Job not found in your account" });
  const applicantCount = await JobApplication.countDocuments({ job: job._id });
  return res.json({ job, views: job.views || 0, applicantCount });
};

export const getManagedJobCandidates = async (req, res) => {
  if (!isId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID" });
  const job = await Job.findOne({ _id: req.params.jobId, postedBy: req.user._id }).lean();
  if (!job) return res.status(404).json({ message: "Job not found in your account" });
  const appliedIds = await JobApplication.find({ job: job._id }).distinct("applicant");
  const invitedIds = await Notification.find({ job: job._id, sender: req.user._id, type: NOTIFICATION_TYPES.JOB_INVITE }).distinct("recipient");
  const candidates = await User.find({
    _id: { $nin: [req.user._id, ...appliedIds] },
    accountStatus: "active",
    profileVisibility: "public",
    "dataPrivacyPreferences.signalRecruiterInterest": { $ne: false },
    "openToWork.enabled": true,
    "openToWork.visibility": { $ne: "only-me" },
  }).select("name headline profilePicture location skills experience openToWork publicProfileSlug").limit(500).lean();
  const jobTerms = [job.title, ...(job.tags || []), job.jobFunction, job.industry].filter(Boolean).map((value) => value.toLowerCase());
  const candidatesWithScore = candidates.map((candidate) => {
    const profileTerms = [
      ...(candidate.skills || []),
      ...(candidate.openToWork?.titles || []),
      candidate.headline || "",
      ...(candidate.experience || []).map((entry) => entry.position || ""),
    ].map((value) => value.toLowerCase());
    const matchedSkills = (candidate.skills || []).filter((skill) => jobTerms.some((term) => term.includes(skill.toLowerCase()) || skill.toLowerCase().includes(term)));
    const titleMatches = (candidate.openToWork?.titles || []).some((title) => job.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(job.title.toLowerCase()));
    const modeMatches = !candidate.openToWork?.locationTypes?.length || candidate.openToWork.locationTypes.includes(job.workMode);
    const employmentMatches = !candidate.openToWork?.employmentTypes?.length || candidate.openToWork.employmentTypes.includes(job.type);
    const targetLocations = [...(candidate.openToWork?.locations || []), candidate.location].filter(Boolean);
    const locationMatches = !targetLocations.length || targetLocations.some((location) => job.location.toLowerCase().includes(location.toLowerCase()) || location.toLowerCase().includes(job.location.toLowerCase()));
    if ((candidate.openToWork?.locationTypes?.length && !modeMatches)
      || (candidate.openToWork?.employmentTypes?.length && !employmentMatches)
      || (candidate.openToWork?.locations?.length && !locationMatches)) return null;
    const profileMatchesTitle = profileTerms.some((term) => term.includes(job.title.toLowerCase()));
    const hasModePreference = Boolean(candidate.openToWork?.locationTypes?.length);
    const hasEmploymentPreference = Boolean(candidate.openToWork?.employmentTypes?.length);
    const score = matchedSkills.length * 2 + (titleMatches ? 4 : profileMatchesTitle ? 2 : 0) + (hasModePreference && modeMatches ? 1 : 0) + (hasEmploymentPreference && employmentMatches ? 1 : 0) + (candidate.openToWork?.locations?.length && locationMatches ? 1 : 0);
    return { ...candidate, invited: invitedIds.some((id) => id.toString() === candidate._id.toString()), matchScore: score, matchSignals: [...(titleMatches ? ["Preferred job title"] : profileMatchesTitle ? ["Relevant profile experience"] : []), ...(matchedSkills.length ? [`${matchedSkills.length} matching skill${matchedSkills.length === 1 ? "" : "s"}`] : []), ...(candidate.openToWork?.locations?.length && locationMatches ? ["Location preference"] : []), ...(hasModePreference && modeMatches ? [`${job.workMode} workplace`] : [])] };
  }).filter((candidate) => candidate && candidate.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, 60);
  return res.json({ candidates: candidatesWithScore });
};

export const inviteCandidateToJob = async (req, res) => {
  if (!isId(req.params.jobId) || !isId(req.params.candidateId)) return res.status(400).json({ message: "Invalid job or candidate ID" });
  const [job, candidate] = await Promise.all([
    Job.findOne({ _id: req.params.jobId, postedBy: req.user._id, status: { $ne: "closed" } }),
    User.findOne({ _id: req.params.candidateId, accountStatus: "active", profileVisibility: "public", "dataPrivacyPreferences.allowRecruiterJobInvites": { $ne: false }, "openToWork.enabled": true, "openToWork.visibility": { $ne: "only-me" } }).select("_id"),
  ]);
  if (!job) return res.status(404).json({ message: "Open job not found in your account" });
  if (!candidate) return res.status(404).json({ message: "Candidate is no longer available or does not accept recruiter invitations" });
  const alreadyInvited = await Notification.exists({
    recipient: candidate._id,
    sender: req.user._id,
    job: job._id,
    type: NOTIFICATION_TYPES.JOB_INVITE,
  });
  if (alreadyInvited) return res.status(409).json({ message: "This candidate has already been invited" });
  await createNotification({
    recipient: candidate._id,
    sender: req.user._id,
    job: job._id,
    type: NOTIFICATION_TYPES.JOB_INVITE,
    dedupe: true,
  });
  return res.status(201).json({ invited: true });
};

export const setManagedJobStatus = async (req, res) => {
  if (!isId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID" });
  if (!["open", "closed"].includes(req.body.status)) return res.status(400).json({ message: "Invalid job status" });
  const existingJob = await Job.findOne({ _id: req.params.jobId, postedBy: req.user._id }).select("status");
  if (!existingJob) return res.status(404).json({ message: "Job not found in your account" });
  const job = await Job.findOneAndUpdate(
    { _id: req.params.jobId, postedBy: req.user._id },
    { $set: { status: req.body.status } },
    { new: true, runValidators: true },
  );
  if (!job) return res.status(404).json({ message: "Job not found in your account" });
  if (req.body.status === "closed" && existingJob.status !== "closed" && job.savedBy?.length) {
    await Promise.all(job.savedBy.map((recipient) => createNotification({
      recipient,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.SAVED_JOB_UPDATE,
      job: job._id,
      dedupe: true,
    })));
  }
  return res.json({ job });
};

export const getCandidateJob = async (req, res) => {
  if (!isId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID" });
  let job = await Job.findById(req.params.jobId).populate("postedBy", "name headline profilePicture");
  if (!job) return res.status(404).json({ message: "Job not found" });
  const isOwner = job.postedBy?._id?.toString() === req.user._id.toString();
  if (job.status === "closed" && !isOwner) return res.status(404).json({ message: "This job is no longer accepting applications" });
  if (!isOwner) {
    job = await Job.findByIdAndUpdate(job._id, { $inc: { views: 1 } }, { new: true }).populate("postedBy", "name headline profilePicture");
  }
  return res.json({ job, isOwner });
};

export const createJob = async (req, res) => {
  try {
    const { title, company, location, type, level, workMode, salary, description, tags, industry, jobFunction } = req.body;
    const requiredFields = [
      ["title", title, 160],
      ["company", company, 160],
      ["location", location, 160],
      ["employment type", type, 60],
      ["experience level", level, 60],
      ["workplace type", workMode, 30],
      ["job description", description, 3000],
    ];
    for (const [label, value, maxLength] of requiredFields) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({ message: `${label} is required` });
      }
      if (value.trim().length > maxLength) {
        return res.status(400).json({ message: `${label} must be ${maxLength} characters or fewer` });
      }
    }
    if (!["Full-time", "Part-time", "Contract", "Temporary", "Internship"].includes(type.trim())) {
      return res.status(400).json({ message: "Choose a valid employment type" });
    }
    if (!["Internship", "Entry level", "Associate", "Mid-Senior", "Director", "Executive"].includes(level.trim())) {
      return res.status(400).json({ message: "Choose a valid experience level" });
    }
    if (!["On-site", "Hybrid", "Remote"].includes(workMode.trim())) {
      return res.status(400).json({ message: "Choose a valid workplace type" });
    }
    if (salary !== undefined && (typeof salary !== "string" || salary.trim().length > 100)) {
      return res.status(400).json({ message: "Salary must be 100 characters or fewer" });
    }
    if (industry !== undefined && (typeof industry !== "string" || industry.trim().length > 100)) {
      return res.status(400).json({ message: "Industry must be 100 characters or fewer" });
    }
    if (jobFunction !== undefined && (typeof jobFunction !== "string" || jobFunction.trim().length > 100)) {
      return res.status(400).json({ message: "Job function must be 100 characters or fewer" });
    }
    if (tags !== undefined && (!Array.isArray(tags) || tags.length > 30 || tags.some((tag) => typeof tag !== "string" || tag.trim().length > 60))) {
      return res.status(400).json({ message: "Skills must be a list of up to 30 values, each 60 characters or fewer" });
    }
    const job = await Job.create({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      type: type.trim(),
      level: level.trim(),
      workMode: workMode.trim(),
      salary: salary?.trim() || "",
      description: description.trim(),
      tags: (tags || []).map((tag) => tag.trim()).filter(Boolean),
      industry: industry?.trim() || "",
      jobFunction: jobFunction?.trim() || "",
      postedBy: req.user._id,
    });
    await notifyMatchingJobAlerts(job);
    const hiringConnections = await Connection.find({
      status: CONNECTION_STATUS.ACCEPTED,
      $or: [{ requester: job.postedBy }, { recipient: job.postedBy }],
    }).select("requester recipient");
    const hiringRecipients = hiringConnections.map((connection) =>
      connection.requester.toString() === job.postedBy.toString()
        ? connection.recipient
        : connection.requester,
    );
    await Promise.all(hiringRecipients.map((recipient) => createNotification({
      recipient,
      sender: job.postedBy,
      type: NOTIFICATION_TYPES.NETWORK_HIRING,
      job: job._id,
      details: `${job.company} is hiring for ${job.title}.`,
    })));
    return res.status(201).json({
      job: {
        ...job.toObject(),
        saved: false,
        application: null,
        posted: "Today",
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Create job error:", error);
    return res.status(500).json({ message: "Failed to post job" });
  }
};

const notifyMatchingJobAlerts = async (job) => {
  try {
    const alerts = await JobAlert.find({ active: true }).populate("user", "notificationPreferences");
    const searchableJob = [job.title, job.company, job.location, job.description, ...(job.tags || []), job.industry, job.jobFunction]
      .filter(Boolean).join(" ").toLowerCase();
    const now = Date.now();

    for (const alert of alerts) {
      if (!alert.user || alert.user.notificationPreferences?.jobAlerts === false) continue;
      if (!searchableJob.includes(alert.title.toLowerCase())) continue;
      if (alert.location && !job.location.toLowerCase().includes(alert.location.toLowerCase())) continue;
      if (alert.workMode && job.workMode !== alert.workMode) continue;
      if (alert.type && job.type !== alert.type) continue;
      if (alert.level && job.level !== alert.level) continue;

      const cooldown = alert.frequency === "Weekly" ? 7 * 86400000 : 86400000;
      if (alert.lastNotifiedAt && now - alert.lastNotifiedAt.getTime() < cooldown) continue;

      const notification = await createNotification({
        recipient: alert.user._id,
        sender: job.postedBy,
        type: NOTIFICATION_TYPES.JOB_ALERT,
        job: job._id,
      });
      if (!notification) continue;
      alert.lastNotifiedAt = new Date(now);
      await alert.save();
    }
  } catch (error) {
    console.error("Job alert notification delivery failed:", error);
  }
};

export const getMyJobAlert = async (req, res) => {
  const alert = await JobAlert.findOne({ user: req.user._id }).lean();
  return res.json({ alert });
};

export const reportJob = async (req, res) => {
  if (!isId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID" });
  const allowedReasons = ["misleading", "scam", "discrimination", "expired", "other"];
  if (!allowedReasons.includes(req.body.reason)) return res.status(400).json({ message: "Choose a valid report reason" });
  const details = typeof req.body.details === "string" ? req.body.details.trim() : "";
  if (details.length > 1000) return res.status(400).json({ message: "Report details must be 1000 characters or fewer" });
  try {
    if (!(await Job.exists({ _id: req.params.jobId }))) return res.status(404).json({ message: "Job not found" });
    await JobReport.create({ job: req.params.jobId, reporter: req.user._id, reason: req.body.reason, details });
    return res.status(201).json({ message: "Job report submitted for review" });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already reported this job" });
    console.error("Report job error:", error);
    return res.status(500).json({ message: "Unable to submit job report" });
  }
};

export const saveJobAlert = async (req, res) => {
  const { title, location = "", workMode = "", type = "", level = "", frequency = "Daily", active = true } = req.body;
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    return res.status(400).json({ message: "Enter a job title or keyword (up to 120 characters)" });
  }
  if ([location, workMode, type, level].some((value) => typeof value !== "string")) {
    return res.status(400).json({ message: "Job alert filters must be text values" });
  }
  if (!["", "On-site", "Hybrid", "Remote"].includes(workMode)) {
    return res.status(400).json({ message: "Select a valid workplace type" });
  }
  if (!["Daily", "Weekly"].includes(frequency) || typeof active !== "boolean") {
    return res.status(400).json({ message: "Select a valid alert frequency and status" });
  }
  if (location.length > 120 || type.length > 60 || level.length > 60) {
    return res.status(400).json({ message: "One or more job alert filters are too long" });
  }
  try {
    const alert = await JobAlert.findOneAndUpdate(
      { user: req.user._id },
      { $set: { title: title.trim(), location: location.trim(), workMode, type: type.trim(), level: level.trim(), frequency, active } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return res.json({ alert });
  } catch (error) {
    console.error("Save job alert error:", error);
    return res.status(500).json({ message: "Unable to save job alert" });
  }
};

export const deleteMyJobAlert = async (req, res) => {
  await JobAlert.deleteOne({ user: req.user._id });
  return res.json({ message: "Job alert deleted" });
};

const formatPosted = (date) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "1 day ago" : days < 7 ? `${days} days ago` : `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
};

export const toggleSavedJob = async (req, res) => {
  if (!isId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID" });
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  const index = job.savedBy.findIndex((id) => id.toString() === req.user._id.toString());
  if (index >= 0) job.savedBy.splice(index, 1);
  else job.savedBy.push(req.user._id);
  await job.save();
  return res.json({ saved: index < 0 });
};

export const applyToJob = async (req, res) => {
  if (!isId(req.params.jobId)) return res.status(400).json({ message: "Invalid job ID" });
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.status === "closed") return res.status(409).json({ message: "This job is closed and is no longer accepting applications" });
  const { fullName, email, phone = "", resume = "", resumeRef = null, coverLetter = "" } = req.body;
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 120) {
    return res.status(400).json({ message: "Enter your full name (up to 120 characters)" });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 180) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }
  if (typeof phone !== "string" || phone.length > 40) {
    return res.status(400).json({ message: "Phone number must be 40 characters or fewer" });
  }
  if (typeof coverLetter !== "string" || coverLetter.length > 5000) {
    return res.status(400).json({ message: "Cover letter must be 5,000 characters or fewer" });
  }
  if (typeof resume !== "string" || resume.length > 500 || (resume && !/^https?:\/\/\S+$/i.test(resume.trim()))) {
    return res.status(400).json({ message: "Resume link must be a valid HTTP or HTTPS URL" });
  }
  if (!resume.trim() && !resumeRef) {
    return res.status(400).json({ message: "Choose a saved resume or provide a resume link" });
  }
  try {
    let selectedResume = null;
    if (resumeRef) {
      if (!isId(resumeRef)) return res.status(400).json({ message: "Invalid saved resume" });
      selectedResume = req.user.resumes.id(resumeRef);
      if (!selectedResume) return res.status(404).json({ message: "Saved resume not found" });
    }
    const application = await JobApplication.create({
      job: job._id, applicant: req.user._id, fullName: fullName.trim(), email: email.trim(), phone: phone.trim(),
      resume: resume.trim(), resumeRef: selectedResume?._id || null,
      resumeName: selectedResume?.name || "", coverLetter: coverLetter.trim(),
    });
    await Job.updateOne({ _id: job._id }, { $inc: { applicantCount: 1 } });
    if (job.postedBy) {
      await createNotification({
        recipient: job.postedBy,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.JOB_APPLICATION,
        job: job._id,
      });
    }
    return res.status(201).json({ application });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already applied to this job" });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Apply job error:", error);
    return res.status(500).json({ message: "Failed to submit application" });
  }
};

export const getMyApplications = async (req, res) => {
  const applications = await JobApplication.find({ applicant: req.user._id }).populate("job").sort({ createdAt: -1 });
  return res.json({ applications });
};

export const getEmployerApplications = async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user._id }).select("_id");
  const applications = await JobApplication.find({ job: { $in: jobs.map((job) => job._id) } })
    .populate("job", "title company location")
    .populate("applicant", "name headline profilePicture")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return res.json({ applications });
};

export const getApplicationResumeUrl = async (req, res) => {
  if (!isId(req.params.applicationId)) return res.status(400).json({ message: "Invalid application ID" });
  const application = await JobApplication.findById(req.params.applicationId).populate("job", "postedBy");
  if (!application || application.job?.postedBy?.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Application not found" });
  }
  if (!application.resumeRef) return res.status(404).json({ message: "No saved resume was attached to this application" });
  const applicant = await User.findById(application.applicant).select("resumes");
  const resume = applicant?.resumes.id(application.resumeRef);
  if (!resume) return res.status(404).json({ message: "The applicant's saved resume is no longer available" });
  const url = cloudinary.url(resume.publicId, {
    resource_type: "raw", type: "authenticated", sign_url: true, secure: true, flags: "attachment",
  });
  return res.json({ url, filename: resume.name });
};

export const updateApplicationStatus = async (req, res) => {
  if (!isId(req.params.applicationId)) return res.status(400).json({ message: "Invalid application ID" });
  const allowed = ["applied", "reviewing", "interview", "offer", "rejected", "withdrawn"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid application status" });
  const application = await JobApplication.findById(req.params.applicationId).populate("job");
  if (!application) return res.status(404).json({ message: "Application not found" });
  const isApplicant = application.applicant.toString() === req.user._id.toString();
  const isJobOwner = application.job?.postedBy?.toString() === req.user._id.toString();
  if (!isApplicant && !isJobOwner) return res.status(404).json({ message: "Application not found" });
  if (isApplicant && req.body.status !== "withdrawn") {
    return res.status(403).json({ message: "Applicants can only withdraw their own application" });
  }
  if (isJobOwner && req.body.status === "withdrawn") {
    return res.status(400).json({ message: "Only the applicant can withdraw an application" });
  }
  const previousStatus = application.status;
  application.status = req.body.status;
  await application.save();
  if (previousStatus !== application.status && application.applicant.toString() !== req.user._id.toString()) {
    await createNotification({
      recipient: application.applicant,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.JOB_APPLICATION_STATUS,
      job: application.job._id,
    });
  }
  return res.json({ application });
};
