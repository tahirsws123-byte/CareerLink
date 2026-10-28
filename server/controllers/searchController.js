import Article from "../models/Article.js";
import Connection from "../models/Connection.js";
import Group from "../models/Group.js";
import Job from "../models/Job.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { NOTIFICATION_TYPES } from "../models/Notification.js";
import { attachConnectionStatus } from "../services/connectionService.js";
import { recordProfileAnalytics } from "../utils/profileAnalytics.js";
import { createNotification } from "../utils/notificationUtils.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchAll = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (query.length < 2) {
    return res.status(400).json({ message: "Search must contain at least 2 characters" });
  }
  const term = new RegExp(escapeRegex(query), "i");
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 15, 1), 30);
  const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 1000);
  const skip = (page - 1) * limit;
  try {
    const acceptedConnections = await Connection.find({
      status: "accepted",
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    }).select("requester recipient").lean();
    const connectedUserIds = acceptedConnections.map((connection) =>
      connection.requester.toString() === req.user._id.toString()
        ? connection.recipient
        : connection.requester,
    );
    const readableGroups = await Group.find({
      $or: [{ privacy: "public" }, { members: req.user._id }],
    }).select("_id").lean();

    const [people, jobs, posts, articles, groups] = await Promise.all([
      User.find({
        _id: { $ne: req.user._id },
        accountStatus: { $ne: "deactivated" },
        $and: [
          {
            $or: [
              { profileVisibility: "public" },
              { profileVisibility: { $exists: false } },
              ...(connectedUserIds.length
                ? [{ profileVisibility: "connections", _id: { $in: connectedUserIds } }]
                : []),
            ],
          },
          { $or: [{ name: term }, { headline: term }, { location: term }, { skills: term }] },
        ],
      }).select("name headline location profilePicture publicProfileSlug followers").sort({ name: 1 }).skip(skip).limit(limit + 1).lean(),
      Job.find({
        $and: [
          { $or: [{ status: "open" }, { status: { $exists: false } }] },
          { $or: [{ title: term }, { company: term }, { location: term }, { description: term }, { tags: term }] },
        ],
      })
        .select("title company location type level workMode salary description postedAt").sort({ postedAt: -1 }).skip(skip).limit(limit + 1).lean(),
      Post.aggregate([
        { $match: {
          text: term,
          groupPostStatus: { $nin: ["pending", "rejected"] },
          $or: [
            { group: null },
            { group: { $in: readableGroups.map((group) => group._id) } },
          ],
        } },
        {
          $lookup: {
            from: User.collection.name,
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: "$author" },
        {
          $match: {
            "author.accountStatus": { $ne: "deactivated" },
            $and: [
              {
                $or: [
                  { "author.profileVisibility": "public" },
                  { "author.profileVisibility": { $exists: false } },
                  ...(connectedUserIds.length
                    ? [{ "author.profileVisibility": "connections", "author._id": { $in: connectedUserIds } }]
                    : []),
                ],
              },
              {
                $or: [
                  { "author.activityVisibility": "public" },
                  { "author.activityVisibility": { $exists: false } },
                  ...(connectedUserIds.length
                    ? [{ "author.activityVisibility": "connections", "author._id": { $in: connectedUserIds } }]
                    : []),
                ],
              },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit + 1 },
        {
          $project: {
            _id: 1,
            text: 1,
            image: 1,
            video: 1,
            createdAt: 1,
            author: {
              _id: "$author._id",
              name: "$author.name",
              headline: "$author.headline",
              profilePicture: "$author.profilePicture",
              publicProfileSlug: "$author.publicProfileSlug",
            },
          },
        },
      ]),
      Article.find({ published: true, $or: [{ title: term }, { excerpt: term }, { content: term }] })
        .populate("author", "name profilePicture publicProfileSlug").sort({ createdAt: -1 }).skip(skip).limit(limit + 1).lean(),
      Group.find({ privacy: "public", $or: [{ name: term }, { description: term }, { category: term }] })
        .select("name description category members createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit + 1).lean(),
    ]);
    const pageHasMore = [people, jobs, posts, articles, groups].some((items) => items.length > limit);
    const results = { people, jobs, posts, articles, groups };
    for (const key of Object.keys(results)) results[key] = results[key].slice(0, limit);
    if (results.people.length) {
      await User.updateMany({ _id: { $in: results.people.map((person) => person._id) } }, { $inc: { searchAppearances: 1 } });
      await recordProfileAnalytics(results.people.map((person) => person._id), "searchAppearances");
      const day = new Date().toISOString().slice(0, 10);
      await Promise.all(results.people.map((person) => createNotification({
        recipient: person._id,
        type: NOTIFICATION_TYPES.SEARCH_APPEARANCE,
        details: `Your profile appeared in CareerLink search on ${day}.`,
        dedupe: true,
      })));
    }
    const peopleWithConnectionStatus = await attachConnectionStatus(results.people, req.user._id);
    return res.json({ query, page, limit, hasMore: pageHasMore, results: { ...results, people: peopleWithConnectionStatus } });
  } catch (error) {
    console.error("Global search error:", error);
    return res.status(500).json({ message: "Unable to search CareerLink" });
  }
};
