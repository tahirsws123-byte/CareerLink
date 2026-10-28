import express from "express";
import { Protect } from "../middleware/authMiddleware.js";
import {
  createEvent, createGroup, createNewsletter, getGroup, updateGroup, listEvents, listGroups, listNewsletters,
  getEvent, getEventPostAnalytics, updateEvent, deleteEvent, cancelEvent, reportEvent, updateEventAttendees, addEventComment, updateEventComment, deleteEventComment,
  toggleEventCommentLike, toggleEventCommentPin, reportEventComment, addEventCommentReply, updateEventCommentSettings,
  reviewGroupJoinRequest, reviewGroupPost, toggleEventRsvp, toggleGroupMembership, toggleGroupPostPin, toggleGroupNotifications, toggleNewsletterSubscription,
  getGroupManagement, getGroupPostAnalytics, updateGroupManagement,
} from "../controllers/communityController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();
router.use(Protect);
router.get("/groups", listGroups);
router.post(
  "/groups",
  upload.fields([{ name: "image", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]),
  createGroup,
);
router.get("/groups/:groupId", getGroup);
router.get("/groups/:groupId/manage", getGroupManagement);
router.get("/groups/:groupId/posts/:postId/analytics", getGroupPostAnalytics);
router.patch("/groups/:groupId/manage", updateGroupManagement);
router.put(
  "/groups/:groupId",
  upload.fields([{ name: "image", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]),
  updateGroup,
);
router.post("/groups/:groupId/requests/:userId", reviewGroupJoinRequest);
router.post("/groups/:groupId/posts/:postId/pin", toggleGroupPostPin);
router.post("/groups/:groupId/posts/:postId/review", reviewGroupPost);
router.post("/groups/:groupId/notifications", toggleGroupNotifications);
router.post("/groups/:groupId/join", toggleGroupMembership);
router.get("/events", listEvents);
router.post("/events", upload.single("coverImage"), createEvent);
router.get("/events/:eventId/analytics/post", getEventPostAnalytics);
router.get("/events/:eventId", getEvent);
router.patch("/events/:eventId", upload.single("coverImage"), updateEvent);
router.delete("/events/:eventId", deleteEvent);
router.post("/events/:eventId/cancel", cancelEvent);
router.post("/events/:eventId/report", reportEvent);
router.post("/events/:eventId/attendees/:userId", updateEventAttendees);
router.post("/events/:eventId/comments", upload.single("image"), addEventComment);
router.patch("/events/:eventId/comment-settings", updateEventCommentSettings);
router.patch("/events/:eventId/comments/:commentId", updateEventComment);
router.delete("/events/:eventId/comments/:commentId", deleteEventComment);
router.post("/events/:eventId/comments/:commentId/like", toggleEventCommentLike);
router.post("/events/:eventId/comments/:commentId/pin", toggleEventCommentPin);
router.post("/events/:eventId/comments/:commentId/report", reportEventComment);
router.post("/events/:eventId/comments/:commentId/replies", addEventCommentReply);
router.post("/events/:eventId/rsvp", toggleEventRsvp);
router.get("/newsletters", listNewsletters);
router.post("/newsletters", createNewsletter);
router.post("/newsletters/:newsletterId/subscribe", toggleNewsletterSubscription);
export default router;
