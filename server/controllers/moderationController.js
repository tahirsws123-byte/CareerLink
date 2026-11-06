import mongoose from "mongoose";
import EventCommentReport from "../models/EventCommentReport.js";
import EventReport from "../models/EventReport.js";
import JobReport from "../models/JobReport.js";
import PostReport from "../models/PostReport.js";
import { isPlatformModerator } from "../middleware/moderatorMiddleware.js";

const reportModels = {
  post: PostReport,
  job: JobReport,
  event: EventReport,
  eventComment: EventCommentReport,
};
const statuses = new Set(["open", "reviewed", "dismissed"]);
const isReportType = (type) => Object.hasOwn(reportModels, type);

const reportPopulation = {
  post: [
    { path: "reporter", select: "name headline profilePicture" },
    { path: "reviewedBy", select: "name" },
    { path: "post", select: "text createdAt author", populate: { path: "author", select: "name headline profilePicture" } },
  ],
  job: [
    { path: "reporter", select: "name headline profilePicture" },
    { path: "reviewedBy", select: "name" },
    { path: "job", select: "title company status postedBy" },
  ],
  event: [
    { path: "reporter", select: "name headline profilePicture" },
    { path: "reviewedBy", select: "name" },
    { path: "event", select: "title startsAt cancelledAt organizer" },
  ],
  eventComment: [
    { path: "reporter", select: "name headline profilePicture" },
    { path: "reviewedBy", select: "name" },
    { path: "event", select: "title startsAt cancelledAt organizer comments" },
  ],
};

export const getModerationAccess = async (req, res) =>
  res.json({ isModerator: isPlatformModerator(req.user?._id) });

export const listModerationReports = async (req, res) => {
  const status = req.query.status || "open";
  const type = req.query.type || "all";
  if (status !== "all" && !statuses.has(status)) {
    return res.status(400).json({ message: "Choose a valid report status" });
  }
  if (type !== "all" && !isReportType(type)) {
    return res.status(400).json({ message: "Choose a valid report type" });
  }

  try {
    const types = type === "all" ? Object.keys(reportModels) : [type];
    const batches = await Promise.all(types.map(async (reportType) => {
      let query = reportModels[reportType].find(status === "all" ? {} : { status })
        .sort({ createdAt: -1, _id: -1 })
        .limit(101);
      for (const populate of reportPopulation[reportType]) query = query.populate(populate);
      const results = await query.lean();
      return {
        hasMore: results.length > 100,
        reports: results.slice(0, 100).map((report) => ({ ...report, reportType })),
      };
    }));
    const reports = batches.flatMap((batch) => batch.reports).sort((left, right) =>
      new Date(right.createdAt) - new Date(left.createdAt)
      || right._id.toString().localeCompare(left._id.toString()),
    );
    for (const report of reports) {
      if (report.reportType !== "eventComment" || !report.event) continue;
      const comment = report.event.comments?.find((item) => item._id?.toString() === report.comment?.toString());
      report.targetContent = comment?.text || "This event comment is no longer available.";
      report.event.comments = undefined;
    }
    return res.json({ reports, truncated: batches.some((batch) => batch.hasMore) });
  } catch (error) {
    console.error("List moderation reports error:", error);
    return res.status(500).json({ message: "Unable to load moderation reports" });
  }
};

export const updateModerationReport = async (req, res) => {
  const { type, reportId } = req.params;
  const { status } = req.body || {};
  if (!isReportType(type)) return res.status(400).json({ message: "Choose a valid report type" });
  if (!mongoose.isValidObjectId(reportId)) return res.status(400).json({ message: "Invalid report ID" });
  if (!statuses.has(status)) return res.status(400).json({ message: "Choose a valid report status" });

  try {
    const report = await reportModels[type].findByIdAndUpdate(
      reportId,
      {
        $set: {
          status,
          reviewedBy: status === "open" ? null : req.user._id,
          reviewedAt: status === "open" ? null : new Date(),
        },
      },
      { returnDocument: "after", runValidators: true },
    )
      .populate("reporter", "name headline profilePicture")
      .populate("reviewedBy", "name");
    if (!report) return res.status(404).json({ message: "Report not found" });
    return res.json({ report: { ...report.toObject(), reportType: type } });
  } catch (error) {
    console.error("Update moderation report error:", error);
    return res.status(500).json({ message: "Unable to update this report" });
  }
};
