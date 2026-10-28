import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Check, CheckCircle2, Download, Eye, KeyRound, LogOut, Mail, Monitor, Shield, Smartphone, Trash2, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth.js";
import {
  changePassword,
  confirmSecurityAction,
  deactivateAccount,
  deleteAccount,
  getSecuritySettings,
  getBlockedMembers,
  getMyProfile,
  requestSecurityCode,
  unblockMember,
  updateNotificationPreferences,
  updateProfile,
} from "../services/userServices.js";
import ResumeManager from "../components/settings/ResumeManager.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import api from "../services/api.js";
import { translate } from "../utils/language.js";
import EditProfileModal from "../components/profile/EditProfileModal.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";

const notificationPageRows = [
  ["job-search", "Searching for a job"],
  ["hiring", "Hiring someone"],
  ["connecting", "Connecting with others"],
  ["network-updates", "Network catch-up updates"],
  ["posting", "Posting and commenting"],
  ["messaging", "Messaging"],
  ["groups", "Groups"],
  ["pages", "Pages"],
  ["events", "Attending events"],
  ["profile-updates", "Updating your profile"],
];
const profileUpdateRows = [
  ["recommendations", "Profile recommendations", "In-app and Email (Push unavailable)"],
  ["skill-endorsements", "New skill endorsements", "Unavailable in CareerLink"],
  ["tips", "Tips and offers for using CareerLink", "Unavailable in CareerLink"],
];
const profileUpdateDescriptions = {
  recommendations: "These notifications suggest profile improvements, such as adding a headline, industry, experience, education, or profile photo.",
  "skill-endorsements": "CareerLink does not currently support skill endorsements.",
  tips: "CareerLink does not currently generate product tips or offers.",
};
const jobSearchRows = [
  ["job-alerts", "Job alerts"],
  ["saved-jobs", "Saved jobs"],
  ["job-recommendations", "Job recommendations"],
  ["application-updates", "Job application updates"],
  ["career-advice", "Career advice"],
  ["search-appearances", "Search appearances"],
  ["skill-assessment", "Skill assessment recommendations"],
  ["skills-path", "Skills path updates"],
];
const hiringJobPostRows = [
  ["job-post-updates", "Job post updates"],
  ["candidate-messages", "Messages from candidates"],
  ["candidate-interviews", "Candidate interviews"],
  ["candidate-recommendations", "Candidate recommendations"],
  ["job-referrals", "Job referrals"],
  ["claim-reminders", "Reminders to claim jobs"],
];
const hiringProjectRows = [
  ["service-provider-proposals", "Service provider proposals"],
  ["project-updates", "Project updates"],
  ["review-requests", "Requests for reviews"],
];
const hiringDescriptions = {
  "job-post-updates": "These are notifications when a candidate applies to one of your job postings.",
  "candidate-messages": "These are notifications you get when a candidate's message is waiting for your response.",
  "candidate-interviews": "These are notifications sent to a hiring manager for feedback requests on candidates.",
  "candidate-recommendations": "These are notifications with suggestions about candidates that may be a fit for your job post.",
  "job-referrals": "These are notifications with requests for referrals related to candidates and job posts.",
  "claim-reminders": "These are notifications about job posts that you may want to claim.",
  "service-provider-proposals": "These are notifications that you have new project proposals to review.",
  "project-updates": "These are notifications from service providers relating to your projects.",
  "review-requests": "These are notifications that a service provider requested a review of their work.",
};
const connectionRows = [
  ["connection-invitations", "Invitations to connect", "In-app and Email"],
  ["network-updates", "Updates from your network", "In-app and Email"],
  ["connection-recommendations", "New connection recommendations", "In-app and Email"],
  ["new-followers", "New followers and subscribers", "In-app and Email"],
  ["followed-people-updates", "Updates from people you follow", "In-app and Email"],
  ["follow-recommendations", "New follow recommendations", "In-app and Email"],
  ["profile-views", "Profile views", "In-app and Email"],
  ["sales-lead-updates", "Updates from your sales leads", "Unavailable in CareerLink"],
  ["follow-invitations", "Invitations to follow", "Unavailable in CareerLink"],
];
const connectionDescriptions = {
  "connection-invitations": "These are notifications that other members have invited you to connect or accepted your connection request.",
  "network-updates": "These are notifications of comments, reactions and content shared by your network.",
  "connection-recommendations": "These are notifications with suggestions for new connections based on your activity or address book contacts.",
  "new-followers": "These are notifications about members who've begun following you or subscribing to your newsletter.",
  "followed-people-updates": "These are notifications of activity by people you follow.",
  "follow-recommendations": "These are notifications with suggestions of people or companies your connections are following.",
  "profile-views": "These are notifications about someone recently viewing your profile.",
  "sales-lead-updates": "These are notifications of activity by your leads or accounts.",
  "follow-invitations": "These are notifications that other members have invited you to follow.",
};
const postingRows = [
  ["comments-reactions", "Comments and reactions", "In-app and Email (Push unavailable)"],
  ["shares", "Shares", "In-app and Email (Push unavailable)"],
  ["mentions", "Mentions", "In-app and Email (Push unavailable)"],
  ["trending-conversations", "Trending conversations", "In-app and Email"],
  ["live-videos", "Live videos", "Unavailable in CareerLink"],
  ["newsletters", "Newsletters", "In-app and Email (Push unavailable)"],
  ["reminders-to-post", "Reminders to post", "In-app and Email"],
  ["collaborative-articles", "Collaborative articles", "Unavailable in CareerLink"],
  ["suggested-posts", "Suggested posts", "In-app and Email"],
  ["post-collaborations", "Post collaborations", "Unavailable in CareerLink"],
];
const postingDescriptions = {
  "comments-reactions": "Notifications about comments and reactions on posts you created, commented on, or were mentioned in.",
  shares: "Notifications when people you follow share a post.",
  mentions: "Notifications when someone mentions or tags you in a post or comment.",
  "trending-conversations": "Get occasional updates about public posts with rapidly growing engagement.",
  "live-videos": "Live video notifications are unavailable because CareerLink does not currently have live video events.",
  newsletters: "Notifications when someone subscribes to your newsletter.",
  "reminders-to-post": "Get a weekly reminder if you have not shared a post recently.",
  "collaborative-articles": "Collaborative article notifications are unavailable because article collaboration is not supported yet.",
  "suggested-posts": "Get occasional public posts that may be relevant to your interests.",
  "post-collaborations": "Post collaboration notifications are unavailable because post collaboration invitations are not supported yet.",
};
const messagingRows = [
  ["messages", "Messages", "In-app and Email (Push unavailable)"],
  ["message-reminders", "Message reminders", "In-app and Email"],
  ["inmail", "InMail", "In-app and Email"],
  ["inmail-reminders", "InMail reminders", "In-app and Email"],
];
const messagingDescriptions = {
  messages: "Notifications letting you know you have received messages.",
  "message-reminders": "A reminder is sent for a conversation that remains unread.",
  inmail: "Notifications for messages received in the InMail area of Messages.",
  "inmail-reminders": "Reminders for InMail conversations that remain unread.",
};
const groupRows = [
  ["group-invitations", "Group invitations", "In-app and Email (Push unavailable)"],
  ["group-updates", "Group updates", "In-app and Email (Push unavailable)"],
  ["group-recommendations", "Group recommendations", "In-app and Email"],
  ["group-admin-updates", "Group admin updates", "Unavailable in CareerLink"],
];
const groupDescriptions = {
  "group-invitations": "Notifications when a group owner invites you to join a group.",
  "group-updates": "Notifications about new posts in groups where you enabled notifications.",
  "group-recommendations": "Get suggestions for public groups you have not joined.",
  "group-admin-updates": "CareerLink does not currently generate group admin activity notifications.",
};
const pageRows = [
  ["page-invitations", "Page invitations", "Push, In-app and Email"],
  ["page-updates", "Page updates", "Push, In-app and Email"],
  ["page-activity", "Activity on Pages you manage", "Push, In-app and Email"],
  ["page-messaging", "Page messaging", "Push and Email"],
  ["page-insights", "Insights on your Pages", "Push, In-app and Email"],
  ["service-project-updates", "Service Page project updates", "Push, In-app and Email"],
  ["service-reviews", "Reviews for your services", "Push, In-app and Email"],
  ["sponsored-requests", "Sponsored requests", "Push and In-app"],
];
const pageDescriptions = {
  "page-invitations": "These are notifications letting you know the status of invitations to Pages that you've sent or received.",
  "page-updates": "These are notifications about activity on your employer's Page or by companies you follow or have expressed interest in, and may include job updates at these organizations.",
  "page-activity": "These are notifications summarizing activity, such as likes and comments, as well as reminders to post on your Page.",
  "page-messaging": "These are notifications letting you know you've received direct messages for Pages you manage.",
  "page-insights": "These are notifications with insights about new followers and Page views for the Pages you manage.",
  "service-project-updates": "These are notifications with updates on your Service Page projects.",
  "service-reviews": "These are notifications letting you know that new reviews have been added or requested.",
  "sponsored-requests": "These are notifications about your posts being sponsored by Pages.",
};
const eventRows = [
  ["invitations", "Invitations", "In-app and Email (Push unavailable)"],
  ["reminders", "Reminders", "In-app and Email (Push unavailable)"],
  ["attendee-updates", "Event attendee updates", "In-app and Email (Push unavailable)"],
  ["recommendations", "Recommendations", "In-app and Email"],
  ["speaker-invitations", "Event speaker/co-host invitations", "In-app and Email (Push unavailable)"],
  ["organizer-updates", "Event organizer updates", "In-app and Email (Push unavailable)"],
];
const eventDescriptions = {
  invitations: "These are notifications about invitations to an event.",
  reminders: "These are reminders about upcoming events you have expressed interest in attending.",
  "attendee-updates": "These are notifications about activity or changes related to events you have expressed interest in attending.",
  recommendations: "Get suggestions for upcoming events you have not joined.",
  "speaker-invitations": "These are notifications about being added as a speaker or co-host at an event.",
  "organizer-updates": "These are notifications about activity in or changes to events you are organizing, such as invitations accepted and check-ins.",
};
const eventPreferenceByDetail = {
  invitations: ["eventInvitationsInApp", "eventInvitationsEmail"],
  reminders: ["eventRemindersInApp", "eventRemindersEmail"],
  "attendee-updates": ["eventAttendeeUpdatesInApp", "eventAttendeeUpdatesEmail"],
  "speaker-invitations": ["eventSpeakerInvitationsInApp", "eventSpeakerInvitationsEmail"],
  "organizer-updates": ["eventOrganizerUpdatesInApp", "eventOrganizerUpdatesEmail"],
};
const networkCatchupRows = [
  ["job-changes", "Job changes", "In-app (Push unavailable)"],
  ["hiring", "Hiring", "In-app"],
  ["birthdays", "Birthdays", "In-app and Email (Push unavailable)"],
  ["work-anniversaries", "Work anniversaries", "In-app"],
  ["education", "Education", "In-app"],
  ["weekly-summary", "Weekly summary", "Weekly Email"],
];
const networkCatchupDescriptions = {
  "job-changes": "These are catch-up updates and notifications about job changes in your network.",
  hiring: "These are catch-up updates and notifications about hiring in your network.",
  birthdays: "Birthday notifications are shared only with the member's chosen audience; birthdays are private by default.",
  "work-anniversaries": "These are catch-up updates and notifications about work anniversaries in your network.",
  education: "These are catch-up updates and notifications about education changes in your network.",
  "weekly-summary": "These are weekly catch-up summaries of updates shared by your network.",
};
const jobSearchDescriptions = {
  "job-alerts": "These are notifications that newly-posted jobs match your job search alerts.",
  "saved-jobs": "Get notified when a job you saved is closed and no longer accepting applications.",
  "job-recommendations": "These are notifications about jobs you might be interested in, based on your activity, connections or companies you follow.",
  "application-updates": "Get notified when an employer changes the status of your job application.",
  "career-advice": "These are notifications with ideas and information such as job search insights and tips, interview advice, salary insights, and people who can help you with jobs you have applied to.",
  "search-appearances": "These are notifications that someone searched for your profile on CareerLink.",
  "skill-assessment": "These are notifications with recommendations for skill assessments that might be helpful to you.",
  "skills-path": "These are notifications associated with the Skills path product.",
};
const defaultNotificationPreferences = {
  connectionNotifications: true,
  messageNotifications: true,
  jobAlerts: true,
  jobSearchNotificationsEnabled: true,
  emailNotifications: true,
  jobAlertEmailNotifications: true,
  savedJobEmailNotifications: true,
  applicationUpdateEmailNotifications: true,
  hiringNotificationsEnabled: true,
  hiringJobPostUpdatesInApp: true,
  hiringJobPostUpdatesEmail: true,
  hiringCandidateMessagesInApp: true,
  hiringCandidateMessagesEmail: true,
  connectionInvitationsInApp: true,
  connectionInvitationsEmail: true,
  networkUpdatesInApp: true,
  networkUpdatesEmail: true,
  newFollowersInApp: true,
  newFollowersEmail: true,
  followedPeopleUpdatesInApp: true,
  followedPeopleUpdatesEmail: true,
  profileViewsInApp: true,
  profileViewsEmail: true,
  networkCatchupEnabled: true,
  networkJobChangesInApp: true,
  networkHiringInApp: true,
  networkWorkAnniversariesInApp: true,
  networkEducationInApp: true,
  networkBirthdaysInApp: true,
  networkBirthdaysEmail: true,
  networkWeeklySummaryEmail: true,
  groupNotificationsEnabled: true,
  groupInvitationsInApp: true,
  groupInvitationsEmail: true,
  groupInvitationsEmailFrequency: "recommended",
  groupUpdatesInApp: true,
  groupUpdatesEmail: true,
  messageEmailNotifications: true,
  messageEmailFrequency: "individual",
  eventNotificationsEnabled: true,
  eventInvitationsInApp: true,
  eventInvitationsEmail: true,
  eventRemindersInApp: true,
  eventRemindersEmail: true,
  eventAttendeeUpdatesInApp: true,
  eventAttendeeUpdatesEmail: true,
  eventSpeakerInvitationsInApp: true,
  eventSpeakerInvitationsEmail: true,
  eventOrganizerUpdatesInApp: true,
  eventOrganizerUpdatesEmail: true,
  profileUpdatesEnabled: true,
  profileRecommendationsInApp: true,
  profileRecommendationsEmail: true,
  jobRecommendationsInApp: true,
  jobRecommendationsEmail: true,
  searchAppearancesInApp: true,
  searchAppearancesEmail: true,
  connectionRecommendationsInApp: true,
  connectionRecommendationsEmail: true,
  followRecommendationsInApp: true,
  followRecommendationsEmail: true,
  suggestedPostsInApp: true,
  suggestedPostsEmail: true,
  trendingConversationsInApp: true,
  trendingConversationsEmail: true,
  postRemindersInApp: true,
  postRemindersEmail: true,
  unreadMessageRemindersInApp: true,
  unreadMessageRemindersEmail: true,
  inmailNotificationsInApp: true,
  inmailNotificationsEmail: true,
  inmailRemindersInApp: true,
  inmailRemindersEmail: true,
  groupRecommendationsInApp: true,
  groupRecommendationsEmail: true,
  eventRecommendationsInApp: true,
  eventRecommendationsEmail: true,
  postingNotificationsEnabled: true,
  postCommentsReactionsInApp: true,
  postCommentsReactionsEmail: true,
  postCommentsReactionsEmailFrequency: "recommended",
  postSharesInApp: true,
  postSharesEmail: true,
  postMentionsInApp: true,
  postMentionsEmail: true,
  postMentionsEmailFrequency: "individual",
  postNewslettersInApp: true,
  postNewslettersEmail: true,
  hiddenNotificationTypes: [],
};
const settingsSections = [
  ["account-preferences", "Account preferences", UserRound],
  ["sign-in-security", "Sign in & security", KeyRound],
  ["visibility", "Visibility", Eye],
  ["data-privacy", "Data privacy", Shield],
  ["notifications", "Notifications", Bell],
];

const inputClass = "mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";
const accountPreferenceRows = [
  ["profile-info", "Name, location, and industry"],
  ["demographic-info", "Personal demographic info"],
  ["verifications", "Verifications"],
  ["dark-mode", "Dark mode"],
  ["language-setting", "Language"],
  ["content-language", "Content language"],
  ["autoplay-videos", "Autoplay videos"],
  ["sound-effects", "Sound effects"],
  ["profile-photos", "Showing profile photos"],
  ["feed-view", "Preferred feed view"],
  ["unfollowed-people", "People you unfollowed"],
  ["hibernate-account", "Hibernate account"],
  ["delete-account", "Close and delete account"],
];
const visibilityProfileRows = [
  ["profile-viewer", "Visibility when viewing other profiles"],
  ["public-profile", "Public profile settings"],
  ["email", "Email visibility"],
  ["birthday", "Birthday visibility"],
  ["connections", "Connection visibility"],
  ["follow", "Follow visibility"],
  ["last-name", "Last name visibility"],
  ["represent-content", "Represent your name and interests on content"],
  ["off-platform", "Off-CareerLink visibility"],
  ["discover-email", "Discoverability by email"],
  ["discover-phone", "Discoverability by phone number"],
  ["blocked-members", "Blocked members"],
];
const visibilityActivityRows = [
  ["active-status", "Manage active status"],
  ["profile-updates", "Share profile updates"],
  ["news", "Notify connections when you're in the news"],
  ["mentions", "Mentions, tags, and collaborations"],
  ["followers", "Followers"],
];
const privacyDataRows = [
  ["data-export", "Download your data"],
  ["demographic-info", "Personal demographic information"],
  ["resume-data", "Resume and application data"],
];
const privacyReachRows = [
  ["connection-invitations", "Invitations to connect"],
  ["network-invitations", "Invitations from your network"],
  ["message-requests", "Messages you receive"],
  ["recruiter-invitations", "Recruiter job invitations"],
];
const privacyMessagingRows = [
  ["read-receipts", "Delivery and read indicators"],
];
const privacyJobRows = [
  ["recruiter-interest", "Signal interest to recruiters"],
];
const exportSections = [
  ["profile", "Profile and settings"],
  ["activity", "Posts, comments, articles, and jobs"],
  ["applications", "Job applications"],
  ["messages", "Messages you sent"],
  ["network", "Connection history"],
  ["saved", "Saved posts and articles"],
  ["notifications", "Notifications"],
];
const defaultDataPrivacyPreferences = {
  connectionInvitationAudience: "everyone",
  allowNetworkInvitations: true,
  allowMessageRequests: true,
  allowRecruiterJobInvites: true,
  messageReadReceipts: true,
  signalRecruiterInterest: true,
};

const detailDescriptions = {
  verifications: "You don't have any verifications, such as a verified work email, associated with your account yet.",
};
const defaultPublicProfileFields = {
  profilePhoto: true, backgroundPhoto: true, headline: false, summary: false,
  activity: true, education: false, projects: true, languages: true, publicVisibilityLimits: true,
};
const defaultVisibilitySettings = {
  profileViewerVisibility: "name-headline",
  publicProfileEnabled: true,
  publicProfileFields: defaultPublicProfileFields,
  emailVisibility: "private",
  connectionVisibility: true,
  followVisibility: "public",
  lastNameVisibility: "full",
  representOnContent: true,
  offPlatformVisibility: true,
  discoverabilityEmail: "public",
  discoverabilityPhone: "public",
  activeStatusVisibility: "nobody",
  shareProfileUpdates: false,
  notifyNetworkInNews: true,
  allowMentionsTagsCollabs: true,
  followerVisibility: "public",
  followPrimary: false,
};

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [settingsUser, setSettingsUser] = useState(user);
  const language = user?.preferredLanguage || "en";
  const t = (text) => translate(text, language);
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState({
    name: "", headline: "", location: "", bio: "",
    profileVisibility: "public", contactInfoVisibility: "public", activityVisibility: "public",
  });
  const [preferences, setPreferences] = useState({});
  const [notificationCapabilities, setNotificationCapabilities] = useState({ email: false, push: false });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthdayVisibility, setBirthdayVisibility] = useState("private");
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivationConfirmation, setDeactivationConfirmation] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("careerlink-theme") || "light");
  const [autoplayVideos, setAutoplayVideos] = useState(() => localStorage.getItem("careerlink-autoplay-videos") === "true");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeSection, setActiveSection] = useState("account-preferences");
  const [activeDetail, setActiveDetail] = useState("");
  const [editIntroOpen, setEditIntroOpen] = useState(false);
  const [soundEffects, setSoundEffects] = useState(() => localStorage.getItem("careerlink-sound-effects") !== "false");
  const [unfollowedPeople, setUnfollowedPeople] = useState([]);
  const [demographics, setDemographics] = useState({ genderIdentity: "", disabilityStatus: "" });
  const [savingDemographics, setSavingDemographics] = useState(false);
  const [excludedContentLanguages, setExcludedContentLanguages] = useState([]);
  const [contentLanguage, setContentLanguage] = useState("en");
  const [savingContentLanguage, setSavingContentLanguage] = useState(false);
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState("all");
  const [preferredFeedView, setPreferredFeedView] = useState("relevant");
  const [securityData, setSecurityData] = useState({ emails: [], phoneNumbers: [], sessions: [], rememberedDevices: [] });
  const [securityEmailInput, setSecurityEmailInput] = useState("");
  const [securityPhoneInput, setSecurityPhoneInput] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [securityCodeAction, setSecurityCodeAction] = useState("");
  const [securityCodeValue, setSecurityCodeValue] = useState("");
  const [passwordCodeVerified, setPasswordCodeVerified] = useState(false);
  const [sendingSecurityCode, setSendingSecurityCode] = useState(false);
  const [confirmingSecurityAction, setConfirmingSecurityAction] = useState(false);
  const [signOutOtherDevices, setSignOutOtherDevices] = useState(false);
  const [visibilitySettings, setVisibilitySettings] = useState(defaultVisibilitySettings);
  const [blockedMembers, setBlockedMembers] = useState([]);
  const [dataPrivacyPreferences, setDataPrivacyPreferences] = useState(defaultDataPrivacyPreferences);
  const [savingDataPrivacy, setSavingDataPrivacy] = useState(false);
  const [exportSelection, setExportSelection] = useState(exportSections.map(([id]) => id));
  const visibilityDetail = activeSection === "visibility" ? activeDetail : "";

  useEffect(() => {
    Promise.all([getMyProfile(), api.get("/users/unfollowed"), getSecuritySettings(), getBlockedMembers()])
      .then(([data, unfollowedResponse, security, blocked]) => {
        setSettingsUser(data);
        setNotificationCapabilities(data.notificationCapabilities || { email: false, push: false });
        setDataPrivacyPreferences({
          ...defaultDataPrivacyPreferences,
          ...data.dataPrivacyPreferences,
        });
        setUnfollowedPeople(unfollowedResponse.data.users || []);
        setSecurityData(security);
        setBlockedMembers(blocked);
        setVisibilitySettings({
          ...defaultVisibilitySettings,
          ...Object.fromEntries(Object.keys(defaultVisibilitySettings).filter((key) => key !== "publicProfileFields").map((key) => [key, data[key] ?? defaultVisibilitySettings[key]])),
          publicProfileFields: { ...defaultPublicProfileFields, ...data.publicProfileFields },
        });
        setProfile({
          name: data.name || "", headline: data.headline || "", location: data.location || "", bio: data.bio || "",
          profileVisibility: data.profileVisibility || "public",
          contactInfoVisibility: data.contactInfoVisibility || "public",
          activityVisibility: data.activityVisibility || "public",
        });
        setBirthDate(data.birthDate ? new Date(data.birthDate).toISOString().slice(0, 10) : "");
        setBirthdayVisibility(data.birthdayVisibility || "private");
        setResumes(data.resumes || []);
        setPreferences({
          ...defaultNotificationPreferences,
          ...data.notificationPreferences,
        });
        setPreferredLanguage(data.preferredLanguage || "en");
        setDemographics({
          genderIdentity: data.genderIdentity || "",
          disabilityStatus: data.disabilityStatus || "",
        });
        setContentLanguage(data.contentLanguage || "en");
        setExcludedContentLanguages(data.excludedContentLanguages || []);
        setProfilePhotoVisibility(data.profilePhotoVisibility || "all");
        setPreferredFeedView(data.preferredFeedView || "relevant");
      })
      .catch(() => toast.error("Unable to load your settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language === "hi" ? "hi" : "en";
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    root.dataset.theme = resolvedTheme;
    localStorage.setItem("careerlink-theme", theme);
  }, [theme, language]);

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash.startsWith("setting=")) {
      setActiveSection("account-preferences");
      setActiveDetail(hash.slice("setting=".length));
      return;
    }
    if (hash.startsWith("security-")) {
      setActiveSection("sign-in-security");
      setActiveDetail(hash);
      return;
    }
    if (hash.startsWith("visibility-")) {
      setActiveSection("visibility");
      setActiveDetail(hash);
      return;
    }
    if (hash.startsWith("privacy-")) {
      setActiveSection("data-privacy");
      setActiveDetail(hash.slice("privacy-".length));
      return;
    }
    if (hash.startsWith("notification-")) {
      setActiveSection("notifications");
      setActiveDetail(hash);
      return;
    }
    if (hash === "language-setting") {
      setActiveSection("account-preferences");
      setActiveDetail(hash);
      return;
    }
    setActiveDetail("");
    setActiveSection(settingsSections.some(([id]) => id === hash) ? hash : "account-preferences");
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if ((activeSection === "visibility" || activeSection === "data-privacy") && activeDetail) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [activeSection, activeDetail]);

  const saveVisibilityProfile = async () => {
    setSavingProfile(true);
    try {
      const { user: updatedUser } = await updateProfile({
        profileVisibility: profile.profileVisibility,
        activityVisibility: profile.activityVisibility,
      });
      setSettingsUser(updatedUser);
      updateUser(updatedUser);
      toast.success(t("Visibility setting saved"));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Could not save profile visibility"));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveBirthday = async () => {
    setSavingProfile(true);
    try {
      const { user: updatedUser } = await updateProfile({
        birthDate,
        birthdayVisibility,
      });
      setSettingsUser(updatedUser);
      updateUser(updatedUser);
      toast.success(t("Birthday settings saved"));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Could not save birthday settings"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setDeactivating(true);
      await deactivateAccount();
      setDeactivationConfirmation("");
      logout();
      toast.success("Your account is hibernated");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to deactivate account");
    } finally {
      setDeactivating(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await deleteAccount({
        confirmation: deleteConfirmation,
        email: deleteEmail,
        ...(user?.hasPassword === false ? {} : { currentPassword: deletePassword }),
      });
      logout();
      toast.success("Your CareerLink account and related data were deleted");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const exportData = async () => {
    if (!exportSelection.length) {
      toast.error(t("Choose at least one category to export"));
      return;
    }
    try {
      const { data } = await api.get("/users/data-export", {
        params: { include: exportSelection.join(",") },
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `careerlink-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data export has been downloaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to export account data");
    }
  };

  const updateTheme = (nextTheme) => setTheme(nextTheme);

  const openSetting = (detail) => navigate(`/settings#setting=${detail}`);

  const updateSoundEffects = (checked) => {
    localStorage.setItem("careerlink-sound-effects", String(checked));
    setSoundEffects(checked);
  };

  const savePreference = async (updates, onSaved, successMessage = "Setting saved") => {
    try {
      const { user: updatedUser } = await updateProfile(updates);
      setSettingsUser(updatedUser);
      updateUser(updatedUser);
      onSaved?.(updatedUser);
      toast.success(t(successMessage));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Could not save setting"));
    }
  };

  const saveVisibility = (field, value) => {
    const updates = field === "publicProfileFields"
      ? { publicProfileFields: { ...visibilitySettings.publicProfileFields, ...value } }
      : { [field]: value };
    savePreference(updates, (updatedUser) => {
      setVisibilitySettings((current) => ({
        ...current,
        ...updatedUser,
        publicProfileFields: { ...current.publicProfileFields, ...updatedUser.publicProfileFields },
      }));
    }, "Visibility setting saved");
  };

  const handleUnblockMember = async (person) => {
    try {
      await unblockMember(person._id);
      setBlockedMembers((current) => current.filter((item) => item._id !== person._id));
      toast.success(t("Member unblocked"));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Unable to unblock member"));
    }
  };

  const saveDemographics = async (event) => {
    event.preventDefault();
    setSavingDemographics(true);
    try {
      const { user: updatedUser } = await updateProfile(demographics);
      setSettingsUser(updatedUser);
      updateUser(updatedUser);
      toast.success(t("Demographic information saved"));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Could not save demographic information"));
    } finally {
      setSavingDemographics(false);
    }
  };

  const removeDemographics = async () => {
    const empty = { genderIdentity: "", disabilityStatus: "" };
    setSavingDemographics(true);
    try {
      const { user: updatedUser } = await updateProfile(empty);
      setSettingsUser(updatedUser);
      updateUser(updatedUser);
      setDemographics(empty);
      toast.success(t("Demographic information removed"));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Could not remove demographic information"));
    } finally {
      setSavingDemographics(false);
    }
  };

  const saveContentLanguages = async (nextLanguage, nextExcluded) => {
    setSavingContentLanguage(true);
    try {
      const { user: updatedUser } = await updateProfile({
        contentLanguage: nextLanguage,
        excludedContentLanguages: nextExcluded,
      });
      setSettingsUser(updatedUser);
      updateUser(updatedUser);
      setContentLanguage(updatedUser.contentLanguage || "en");
      setExcludedContentLanguages(updatedUser.excludedContentLanguages || []);
      toast.success(t("Content language preferences saved"));
    } catch (error) {
      setContentLanguage(settingsUser?.contentLanguage || "en");
      setExcludedContentLanguages(settingsUser?.excludedContentLanguages || []);
      toast.error(error.response?.data?.message || t("Could not save content language preferences"));
    } finally {
      setSavingContentLanguage(false);
    }
  };

  const toggleExcludedContentLanguage = (languageCode) => {
    const next = excludedContentLanguages.includes(languageCode)
      ? excludedContentLanguages.filter((item) => item !== languageCode)
      : [...excludedContentLanguages, languageCode];
    saveContentLanguages(contentLanguage, next);
  };

  const handleUnfollowedFollow = async (person) => {
    try {
      await api.post(`/users/follow/${person._id}`);
      setUnfollowedPeople((people) => people.filter((item) => item._id !== person._id));
      toast.success(t("Following updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Unable to follow this person"));
    }
  };

  const backToAccountPreferences = () => navigate("/settings#account-preferences");
  const backToSecuritySettings = () => navigate("/settings#sign-in-security");
  const backToVisibilitySettings = () => navigate("/settings#visibility");
  const backToDataPrivacySettings = () => navigate("/settings#data-privacy");
  const openSecuritySetting = (detail) => navigate(`/settings#security-${detail}`);
  const saveDataPrivacyPreference = async (field, value) => {
    const previous = dataPrivacyPreferences[field];
    setDataPrivacyPreferences((current) => ({ ...current, [field]: value }));
    setSavingDataPrivacy(true);
    try {
      const { data } = await api.put("/users/data-privacy-preferences", { [field]: value });
      setDataPrivacyPreferences({
        ...defaultDataPrivacyPreferences,
        ...data.dataPrivacyPreferences,
      });
      updateUser({ dataPrivacyPreferences: data.dataPrivacyPreferences });
      toast.success(t("Data privacy preference saved"));
    } catch (error) {
      setDataPrivacyPreferences((current) => ({ ...current, [field]: previous }));
      toast.error(error.response?.data?.message || t("Could not save data privacy preference"));
    } finally {
      setSavingDataPrivacy(false);
    }
  };

  const selectPreference = (detail) => {
    if (detail === "profile-info") {
      setEditIntroOpen(true);
      return;
    }
    openSetting(detail);
  };

  const saveLanguage = async (event) => {
    const nextLanguage = event.target.value;
    const previousLanguage = preferredLanguage;
    setPreferredLanguage(nextLanguage);
    setSavingLanguage(true);
    try {
      const { user: updatedUser } = await updateProfile({ preferredLanguage: nextLanguage });
      setSettingsUser(updatedUser);
      updateUser(updatedUser);
      toast.success(t("Language preference saved"));
    } catch (error) {
      setPreferredLanguage(previousLanguage);
      toast.error(error.response?.data?.message || t("Could not save language preference"));
    } finally {
      setSavingLanguage(false);
    }
  };

  const toggleAutoplay = () => {
    setAutoplayVideos((current) => {
      const next = !current;
      localStorage.setItem("careerlink-autoplay-videos", String(next));
      window.dispatchEvent(new CustomEvent("careerlink-video-preference", { detail: next }));
      return next;
    });
  };

  const togglePreference = async (field) => {
    const next = { ...preferences, [field]: !preferences[field] };
    setPreferences(next);
    setSavingPreferences(true);
    try {
      const { notificationPreferences: saved } = await updateNotificationPreferences({ [field]: next[field] });
      setPreferences(saved);
      updateUser({ notificationPreferences: saved });
    } catch (error) {
      setPreferences(preferences);
      toast.error(error.response?.data?.message || "Could not save preference");
    } finally { setSavingPreferences(false); }
  };

  const saveNotificationPreference = async (field, value) => {
    const previous = preferences;
    setPreferences({ ...previous, [field]: value });
    setSavingPreferences(true);
    try {
      const { notificationPreferences: saved } = await updateNotificationPreferences({ [field]: value });
      setPreferences(saved);
      updateUser({ notificationPreferences: saved });
    } catch (error) {
      setPreferences(previous);
      toast.error(error.response?.data?.message || "Could not save preference");
    } finally {
      setSavingPreferences(false);
    }
  };

  const toggleNotificationCategory = async (type) => {
    const hidden = preferences.hiddenNotificationTypes || [];
    const nextHidden = hidden.includes(type) ? hidden.filter((item) => item !== type) : [...hidden, type];
    setSavingPreferences(true);
    try {
      const { notificationPreferences: saved } = await updateNotificationPreferences({ hiddenNotificationTypes: nextHidden });
      setPreferences(saved);
      updateUser({ notificationPreferences: saved });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save notification category");
    } finally {
      setSavingPreferences(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error("New passwords do not match");
    if (passwords.newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (securityCodeAction !== "change-password" || !passwordCodeVerified) return toast.error("Verify the email security code first");
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        signOutOtherDevices,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSecurityCode("");
      setSecurityCodeAction("");
      setPasswordCodeVerified(false);
      toast.success("Password changed successfully");
      if (signOutOtherDevices) {
        logout();
        navigate("/login", { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not change password");
    } finally { setSavingPassword(false); }
  };

  const sendSecurityCode = async (action, value = "") => {
    try {
      setSendingSecurityCode(true);
      await requestSecurityCode(action, value);
      setSecurityCodeAction(action);
      setSecurityCodeValue(value);
      setSecurityCode("");
      if (action === "change-password") {
        setPasswordCodeVerified(false);
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
      toast.success("A security code was sent to your account email");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send security code");
    } finally {
      setSendingSecurityCode(false);
    }
  };

  const verifyPasswordChangeCode = async () => {
    if (!securityCode) return toast.error(t("Enter the security code from your email"));
    try {
      setConfirmingSecurityAction(true);
      await confirmSecurityAction("change-password", "", securityCode);
      setPasswordCodeVerified(true);
      setSecurityCode("");
      toast.success(t("Email security code verified"));
    } catch (error) {
      toast.error(error.response?.data?.message || t("Unable to verify security code"));
    } finally {
      setConfirmingSecurityAction(false);
    }
  };

  const completeSecurityAction = async (action = securityCodeAction, value = securityCodeValue) => {
    if (!securityCode) return toast.error("Enter the security code from your email");
    try {
      setConfirmingSecurityAction(true);
      await confirmSecurityAction(action, value, securityCode);
      const updatedSecurity = await getSecuritySettings();
      setSecurityData(updatedSecurity);
      setSecurityCode("");
      setSecurityCodeAction("");
      setSecurityCodeValue("");
      if (action === "add-email") setSecurityEmailInput("");
      if (action === "add-phone") setSecurityPhoneInput("");
      toast.success("Security setting updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update security setting");
    } finally {
      setConfirmingSecurityAction(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/", { replace: true });
  };

  if (loading) return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-ink">Loading settings…</div>;

  const detailTitle = t(accountPreferenceRows.find(([id]) => id === activeDetail)?.[1] || "Account preferences");
  const preferenceSummary = {
    "dark-mode": theme === "system" ? t("Device settings") : theme === "dark" ? t("Always on") : t("Always off"),
    "language-setting": preferredLanguage === "hi" ? t("Hindi (हिन्दी)") : t("English (English)"),
    "content-language": contentLanguage === "hi" ? t("Hindi (हिन्दी)") : t("English (English)"),
    "autoplay-videos": autoplayVideos ? t("On") : t("Off"),
    "sound-effects": soundEffects ? t("On") : t("Off"),
    "profile-photos": ({
      none: t("No one"),
      connections: t("Your connections"),
      network: t("Your network"),
      all: t("All CareerLink members"),
    })[profilePhotoVisibility],
    "feed-view": preferredFeedView === "recent" ? t("Most recent posts") : t("Most relevant posts (Recommended)"),
    "unfollowed-people": `${unfollowedPeople.length} ${t("people")}`,
  };
  const jobSearchNotificationDetail = activeDetail.startsWith("notification-job-search-")
    ? activeDetail.slice("notification-job-search-".length)
    : "";
  const supportedJobNotificationTypes = {
    "job-alerts": ["job_alert"],
    "saved-jobs": ["saved_job_update"],
    "application-updates": ["job_application_status"],
    "job-recommendations": ["job_recommendation"],
    "search-appearances": ["search_appearance"],
  };
  const activeJobNotificationTypes = supportedJobNotificationTypes[jobSearchNotificationDetail] || [];
  const emailPreferenceByJobSearchDetail = {
    "job-alerts": "jobAlertEmailNotifications",
    "saved-jobs": "savedJobEmailNotifications",
    "application-updates": "applicationUpdateEmailNotifications",
    "job-recommendations": "jobRecommendationsEmail",
    "search-appearances": "searchAppearancesEmail",
  };
  const hiringDetail = activeDetail.startsWith("notification-hiring-detail-")
    ? activeDetail.slice("notification-hiring-detail-".length)
    : "";
  const hiringDetailRow = [...hiringJobPostRows, ...hiringProjectRows].find(([id]) => id === hiringDetail);
  const hiringDetailIsProject = hiringProjectRows.some(([id]) => id === hiringDetail);
  const hiringTab = activeDetail === "notification-hiring-service-projects"
    || hiringDetailIsProject
    ? "service-projects"
    : "job-posts";
  const hiringSupportedPreferences = {
    "job-post-updates": {
      type: "job_application",
      inApp: "hiringJobPostUpdatesInApp",
      email: "hiringJobPostUpdatesEmail",
    },
    "candidate-messages": {
      type: "hiring_candidate_message",
      inApp: "hiringCandidateMessagesInApp",
      email: "hiringCandidateMessagesEmail",
    },
  };
  const hiringPreference = hiringSupportedPreferences[hiringDetail];
  const connectionDetail = activeDetail.startsWith("notification-connecting-detail-")
    ? activeDetail.slice("notification-connecting-detail-".length)
    : "";
  const connectionDetailRow = connectionRows.find(([id]) => id === connectionDetail);
  const connectionSupportedPreferences = {
    "connection-invitations": {
      inApp: "connectionInvitationsInApp",
      email: "connectionInvitationsEmail",
    },
    "network-updates": {
      inApp: "networkUpdatesInApp",
      email: "networkUpdatesEmail",
    },
    "new-followers": {
      inApp: "newFollowersInApp",
      email: "newFollowersEmail",
    },
    "followed-people-updates": {
      inApp: "followedPeopleUpdatesInApp",
      email: "followedPeopleUpdatesEmail",
    },
    "connection-recommendations": {
      inApp: "connectionRecommendationsInApp",
      email: "connectionRecommendationsEmail",
    },
    "follow-recommendations": {
      inApp: "followRecommendationsInApp",
      email: "followRecommendationsEmail",
    },
    "profile-views": {
      inApp: "profileViewsInApp",
      email: "profileViewsEmail",
    },
  };
  const connectionPreference = connectionSupportedPreferences[connectionDetail];
  const networkCatchupDetail = activeDetail.startsWith("notification-network-updates-detail-")
    ? activeDetail.slice("notification-network-updates-detail-".length)
    : "";
  const networkCatchupRow = networkCatchupRows.find(([id]) => id === networkCatchupDetail);
  const networkCatchupPreferenceByDetail = {
    "job-changes": "networkJobChangesInApp",
    hiring: "networkHiringInApp",
    "work-anniversaries": "networkWorkAnniversariesInApp",
    education: "networkEducationInApp",
  };
  const networkCatchupPreference = networkCatchupPreferenceByDetail[networkCatchupDetail];
  const networkBirthdayPreference = networkCatchupDetail === "birthdays"
    ? ["networkBirthdaysInApp", "networkBirthdaysEmail"]
    : null;
  const postingDetail = activeDetail.startsWith("notification-posting-detail-")
    ? activeDetail.slice("notification-posting-detail-".length)
    : "";
  const postingDetailRow = postingRows.find(([id]) => id === postingDetail);
  const postingSupportedPreferences = {
    "comments-reactions": {
      inApp: "postCommentsReactionsInApp",
      email: "postCommentsReactionsEmail",
      frequency: "postCommentsReactionsEmailFrequency",
    },
    shares: { inApp: "postSharesInApp", email: "postSharesEmail" },
    mentions: {
      inApp: "postMentionsInApp",
      email: "postMentionsEmail",
      frequency: "postMentionsEmailFrequency",
    },
    newsletters: { inApp: "postNewslettersInApp", email: "postNewslettersEmail" },
    "trending-conversations": { inApp: "trendingConversationsInApp", email: "trendingConversationsEmail" },
    "reminders-to-post": { inApp: "postRemindersInApp", email: "postRemindersEmail" },
    "suggested-posts": { inApp: "suggestedPostsInApp", email: "suggestedPostsEmail" },
  };
  const postingPreference = postingSupportedPreferences[postingDetail];
  const messagingDetail = activeDetail.startsWith("notification-messaging-detail-")
    ? activeDetail.slice("notification-messaging-detail-".length)
    : "";
  const messagingDetailRow = messagingRows.find(([id]) => id === messagingDetail);
  const messagingPreferenceByDetail = {
    messages: { inApp: "messageNotifications", email: "messageEmailNotifications" },
    "message-reminders": { inApp: "unreadMessageRemindersInApp", email: "unreadMessageRemindersEmail" },
    inmail: { inApp: "inmailNotificationsInApp", email: "inmailNotificationsEmail" },
    "inmail-reminders": { inApp: "inmailRemindersInApp", email: "inmailRemindersEmail" },
  };
  const messagingPreference = messagingPreferenceByDetail[messagingDetail];
  const groupDetail = activeDetail.startsWith("notification-groups-detail-")
    ? activeDetail.slice("notification-groups-detail-".length)
    : "";
  const groupDetailRow = groupRows.find(([id]) => id === groupDetail);
  const groupPreferenceByDetail = {
    "group-invitations": {
      inApp: "groupInvitationsInApp",
      email: "groupInvitationsEmail",
      frequency: "groupInvitationsEmailFrequency",
    },
    "group-updates": {
      inApp: "groupUpdatesInApp",
      email: "groupUpdatesEmail",
    },
    "group-recommendations": {
      inApp: "groupRecommendationsInApp",
      email: "groupRecommendationsEmail",
    },
  };
  const groupPreference = groupPreferenceByDetail[groupDetail];
  const eventDetail = activeDetail.startsWith("notification-events-detail-")
    ? activeDetail.slice("notification-events-detail-".length)
    : "";
  const eventDetailRow = eventRows.find(([id]) => id === eventDetail);
  const eventPreference = eventPreferenceByDetail[eventDetail];
  const resolvedEventPreference = eventPreference || (eventDetail === "recommendations"
    ? ["eventRecommendationsInApp", "eventRecommendationsEmail"]
    : null);
  const profileUpdateDetail = activeDetail.startsWith("notification-profile-updates-detail-")
    ? activeDetail.slice("notification-profile-updates-detail-".length)
    : "";
  const profileUpdateRow = profileUpdateRows.find(([id]) => id === profileUpdateDetail);
  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#f3f2ef]">
      <aside className="border-b border-gray-200 bg-white px-4 py-4 lg:fixed lg:bottom-0 lg:left-0 lg:top-[66px] lg:z-20 lg:w-[300px] lg:border-b-0 lg:border-r lg:px-0 lg:py-6">
        <h1 className="mb-4 flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink lg:mb-8 lg:px-7 lg:text-3xl">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 text-lg font-bold text-white">{user?.name?.[0] || "U"}</span>
          {t("Settings")}
        </h1>
        <nav aria-label={t("Settings")} className="flex gap-1 overflow-x-auto lg:flex-col">
          {settingsSections.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(`/settings#${id}`)}
              aria-current={activeSection === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 border-b-[3px] px-3 py-3 text-sm font-medium transition hover:bg-sky hover:text-brand lg:w-full lg:gap-4 lg:border-b-0 lg:border-l-[3px] lg:px-7 lg:py-4 lg:text-base ${activeSection === id ? "border-emerald-700 text-emerald-800" : "border-transparent text-gray-700"}`}
            >
              <Icon size={20} className="shrink-0 text-current" />{t(label)}
            </button>
          ))}
        </nav>
        <div className="mt-5 hidden border-t border-gray-100 px-7 py-4 text-xs leading-5 text-muted-ink lg:block">{t("Privacy changes apply to your CareerLink profile and activity.")}</div>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-7 sm:py-7 lg:ml-[300px]">
        <div className="mx-auto w-full max-w-[900px] space-y-4">
          {activeSection === "visibility" && activeDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
              <button type="button" onClick={backToVisibilitySettings} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back to Visibility")}</button>
              <h2 className="text-xl font-semibold text-ink">{t(visibilityDetailTitle(visibilityDetail))}</h2>
              {visibilityDetail === "visibility-profile-viewer" ? (
                <VisibilityChoice t={t} value={visibilitySettings.profileViewerVisibility} onChange={(value) => saveVisibility("profileViewerVisibility", value)} options={[
                  ["name-headline", "Your name and headline"],
                  ["private-characteristics", "Private profile characteristics"],
                  ["private", "Private mode"],
                ]} description={t("Your choice controls how you appear in other members' profile-view history. Private modes hide your identity in that history.")} />
              ) : visibilityDetail === "visibility-public-profile" ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Control what people who aren't signed in can see on your public profile. These controls do not affect your private account information.")}</p>
                  <SettingSwitch label={t("Your profile is publicly visible")} checked={visibilitySettings.publicProfileEnabled} onChange={() => saveVisibility("publicProfileEnabled", !visibilitySettings.publicProfileEnabled)} />
                  <PrivacySelect label={t("CareerLink profile visibility")} value={profile.profileVisibility} onChange={(value) => setProfile({ ...profile, profileVisibility: value })} t={t} />
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 px-4">
                    {[
                      ["profilePhoto", "Profile photo"],
                      ["backgroundPhoto", "Background photo"],
                      ["headline", "Headline"],
                      ["summary", "Summary"],
                      ["activity", "Articles and activity"],
                      ["education", "Education"],
                      ["projects", "Projects"],
                      ["languages", "Languages"],
                      ["publicVisibilityLimits", "Public visibility limits"],
                    ].map(([field, label]) => <SettingSwitch key={field} label={t(label)} checked={Boolean(visibilitySettings.publicProfileFields[field])} onChange={() => saveVisibility("publicProfileFields", { [field]: !visibilitySettings.publicProfileFields[field] })} />)}
                  </div>
                  <button type="button" disabled={savingProfile} onClick={saveVisibilityProfile} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingProfile ? t("Saving…") : t("Save profile visibility")}</button>
                </div>
              ) : visibilityDetail === "visibility-email" ? (
                <VisibilityChoice t={t} value={visibilitySettings.emailVisibility} onChange={(value) => saveVisibility("emailVisibility", value)} options={[
                  ["private", "Only visible to me"],
                  ["connections", "1st degree connections"],
                  ["network", "1st and 2nd degree connections"],
                  ["public", "Anyone on CareerLink"],
                ]} description={t("This controls your professional contact email on your profile. Your sign-in email is never shown publicly.")} />
              ) : visibilityDetail === "visibility-birthday" ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Your birthday is private by default. Choose who may see it; people outside that audience will never receive birthday notifications.")}</p>
                  <label className="block text-sm font-medium text-ink">
                    {t("Birthday")}
                    <input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} className={inputClass} />
                  </label>
                  <div className="space-y-2">
                    <RadioOption label={t("Only me")} checked={birthdayVisibility === "private"} onChange={() => setBirthdayVisibility("private")} />
                    <RadioOption label={t("My connections")} checked={birthdayVisibility === "connections"} onChange={() => setBirthdayVisibility("connections")} />
                    <RadioOption label={t("Everyone on CareerLink")} checked={birthdayVisibility === "everyone"} onChange={() => setBirthdayVisibility("everyone")} />
                  </div>
                  <button type="button" disabled={savingProfile} onClick={saveBirthday} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingProfile ? t("Saving…") : t("Save birthday settings")}</button>
                </div>
              ) : visibilityDetail === "visibility-connections" ? (
                <div className="mt-4">
                  <p className="text-sm text-muted-ink">{t("Allow people to see your connections list.")}</p>
                  <SettingSwitch label={t("Connection visibility")} checked={visibilitySettings.connectionVisibility} onChange={() => saveVisibility("connectionVisibility", !visibilitySettings.connectionVisibility)} />
                  <p className="mt-3 text-xs leading-5 text-muted-ink">{t("When off, your connections list is hidden from other members. Your connections can still see mutual connections.")}</p>
                </div>
              ) : visibilityDetail === "visibility-follow" ? (
                <VisibilityChoice t={t} value={visibilitySettings.followVisibility} onChange={(value) => saveVisibility("followVisibility", value)} options={[
                  ["private", "Only visible to me"],
                  ["public", "Anyone on CareerLink"],
                ]} description={t("This controls who can see the people you follow. A person you follow can still see that you follow them.")} />
              ) : visibilityDetail === "visibility-last-name" ? (
                <VisibilityChoice t={t} value={visibilitySettings.lastNameVisibility} onChange={(value) => saveVisibility("lastNameVisibility", value)} options={[
                  ["full", settingsUser?.name || user?.name || "Your full name"],
                  ["initial", `${(settingsUser?.name || user?.name || "Member").split(/\s+/).slice(0, -1).join(" ") || "Member"} ${(settingsUser?.name || user?.name || "M").split(/\s+/).at(-1)?.[0] || "M"}.`],
                ]} description={t("People who are not your connections will see only the first initial of your last name when this is set.")} />
              ) : visibilityDetail === "visibility-represent-content" ? (
                <div className="mt-4">
                  <p className="text-sm text-muted-ink">{t("Choose whether your name and profile information can appear with content and professional interests you interact with.")}</p>
                  <SettingSwitch label={t("Profile information on content")} checked={visibilitySettings.representOnContent} onChange={() => saveVisibility("representOnContent", !visibilitySettings.representOnContent)} />
                </div>
              ) : visibilityDetail === "visibility-off-platform" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Choose whether your public profile can be shown to people using permitted services outside CareerLink. This does not control search-engine indexing.")}</p>
                  <SettingSwitch label={t("Profile visibility outside CareerLink")} checked={visibilitySettings.offPlatformVisibility} onChange={() => saveVisibility("offPlatformVisibility", !visibilitySettings.offPlatformVisibility)} />
                </div>
              ) : visibilityDetail === "visibility-discover-email" ? (
                <VisibilityChoice t={t} value={visibilitySettings.discoverabilityEmail} onChange={(value) => saveVisibility("discoverabilityEmail", value)} options={[
                  ["connections", "1st degree connections"],
                  ["network", "1st and 2nd degree connections"],
                  ["public", "Anyone"],
                ]} description={t("Choose who can discover your profile by searching for your account email. Your email address itself is not included in search results.")} />
              ) : visibilityDetail === "visibility-discover-phone" ? (
                <VisibilityChoice t={t} value={visibilitySettings.discoverabilityPhone} onChange={(value) => saveVisibility("discoverabilityPhone", value)} options={[
                  ["nobody", "Nobody"],
                  ["second-degree", "2nd-degree connections"],
                  ["public", "Everyone"],
                ]} description={t("Phone-number discovery applies only to phone numbers you add to your account. Your number is never included in search results.")} />
              ) : visibilityDetail === "visibility-blocked-members" ? (
                <div className="mt-4">
                  {blockedMembers.length ? <div className="divide-y divide-gray-100">{blockedMembers.map((person) => <div key={person._id} className="flex items-center gap-3 py-3">
                    <ProfileAvatar user={person} size={42} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{person.name}</p>{person.headline && <p className="truncate text-xs text-muted-ink">{person.headline}</p>}</div>
                    <button type="button" onClick={() => handleUnblockMember(person)} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700">{t("Unblock")}</button>
                  </div>)}</div> : <p className="text-sm text-muted-ink">{t("You’re currently not blocking anyone.")}</p>}
                  <p className="mt-4 text-xs leading-5 text-muted-ink">{t("Block a member from their profile. Blocking removes your connection and prevents both accounts from viewing each other’s profiles or following each other.")}</p>
                </div>
              ) : visibilityDetail === "visibility-active-status" ? (
                <VisibilityChoice t={t} value={visibilitySettings.activeStatusVisibility} onChange={(value) => saveVisibility("activeStatusVisibility", value)} options={[
                  ["nobody", "No one"],
                  ["connections", "Your connections only"],
                  ["public", "All CareerLink members"],
                ]} description={t("This preference is saved. Active-status indicators are not currently displayed elsewhere in CareerLink.")} />
              ) : visibilityDetail === "visibility-profile-updates" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Choose whether your network is notified about key changes to your profile.")}</p>
                  <SettingSwitch label={t("Share key profile updates")} checked={visibilitySettings.shareProfileUpdates} onChange={() => saveVisibility("shareProfileUpdates", !visibilitySettings.shareProfileUpdates)} />
                </div>
              ) : visibilityDetail === "visibility-news" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Choose whether your connections and followers are notified when you are mentioned in the news.")}</p>
                  <SettingSwitch label={t("Notify network if mentioned in news")} checked={visibilitySettings.notifyNetworkInNews} onChange={() => saveVisibility("notifyNetworkInNews", !visibilitySettings.notifyNetworkInNews)} />
                </div>
              ) : visibilityDetail === "visibility-mentions" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Choose whether other members can mention, tag, or invite you to collaborate on content.")}</p>
                  <SettingSwitch label={t("Allow mentions, tags, and collaborations")} checked={visibilitySettings.allowMentionsTagsCollabs} onChange={() => saveVisibility("allowMentionsTagsCollabs", !visibilitySettings.allowMentionsTagsCollabs)} />
                </div>
              ) : visibilityDetail === "visibility-followers" ? (
                <div className="mt-4">
                  <VisibilityChoice t={t} value={visibilitySettings.followerVisibility} onChange={(value) => saveVisibility("followerVisibility", value)} options={[
                    ["public", "Everyone on CareerLink"],
                    ["connections", "Your connections"],
                  ]} description={t("Changing this controls who can view your followers on your profile.")} />
                  <SettingSwitch label={t("Make follow primary")} checked={visibilitySettings.followPrimary} onChange={() => saveVisibility("followPrimary", !visibilitySettings.followPrimary)} />
                  <p className="mt-3 text-xs leading-5 text-muted-ink">{t("When enabled, Follow is shown as the primary profile action.")}</p>
                </div>
              ) : <p className="mt-4 text-sm text-muted-ink">{t("Choose a visibility setting from the overview.")}</p>}
            </section>
          ) : null}
          {activeSection === "data-privacy" && activeDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
              <button type="button" onClick={backToDataPrivacySettings} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back to Data privacy")}</button>
              <h2 className="text-xl font-semibold text-ink">{t({
                "data-export": "Download your data",
                "demographic-info": "Personal demographic information",
                "resume-data": "Resume and application data",
                "connection-invitations": "Invitations to connect",
                "network-invitations": "Invitations from your network",
                "message-requests": "Messages you receive",
                "recruiter-invitations": "Recruiter job invitations",
                "read-receipts": "Read receipts",
                "recruiter-interest": "Signal interest to recruiters",
              }[activeDetail] || "Data privacy")}</h2>
              {activeDetail === "data-export" ? (
                <div className="mt-4">
                  <p className="mb-4 text-sm leading-6 text-muted-ink">{t("Choose which account data categories to include in your downloadable JSON export. Passwords, security codes, and private sign-in credentials are never included.")}</p>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 px-4">
                    {exportSections.map(([id, label]) => (
                      <label key={id} className="flex items-center gap-3 py-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={exportSelection.includes(id)}
                          onChange={() => setExportSelection((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
                          className="h-4 w-4 accent-brand"
                        />
                        {t(label)}
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={exportData} className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"><Download size={16} />{t("Download selected data")}</button>
                </div>
              ) : activeDetail === "demographic-info" ? (
                <form onSubmit={saveDemographics} className="mt-4 space-y-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Providing demographic information is optional. It is used to help CareerLink understand and improve fairness in the service; it is not shown on your profile.")}</p>
                  <label className="block text-sm font-medium text-ink">{t("Gender identity")}<input maxLength={80} value={demographics.genderIdentity} onChange={(event) => setDemographics((current) => ({ ...current, genderIdentity: event.target.value }))} className={inputClass} /></label>
                  <label className="block text-sm font-medium text-ink">{t("Disability status")}<select value={demographics.disabilityStatus} onChange={(event) => setDemographics((current) => ({ ...current, disabilityStatus: event.target.value }))} className={inputClass}><option value="">{t("Choose an option")}</option><option value="yes">{t("Yes")}</option><option value="no">{t("No")}</option><option value="prefer-not-to-say">{t("Prefer not to say")}</option></select></label>
                  <div className="flex flex-wrap gap-2"><button type="submit" disabled={savingDemographics} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingDemographics ? t("Saving…") : t("Save demographic information")}</button><button type="button" disabled={savingDemographics || (!demographics.genderIdentity && !demographics.disabilityStatus)} onClick={removeDemographics} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">{t("Remove information")}</button></div>
                </form>
              ) : activeDetail === "resume-data" ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Manage resumes saved to your CareerLink account. Resumes attached to an application cannot be removed while that application remains on record.")}</p>
                  <ResumeManager initialResumes={resumes} />
                </div>
              ) : activeDetail === "connection-invitations" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Choose who can send you a connection request. Network members are people who follow you or whom you follow.")}</p>
                  <PrivacyChoice t={t} value={dataPrivacyPreferences.connectionInvitationAudience} disabled={savingDataPrivacy} onChange={(value) => saveDataPrivacyPreference("connectionInvitationAudience", value)} options={[["everyone", "Everyone on CareerLink"], ["network", "People in my network"]]} />
                </div>
              ) : activeDetail === "message-requests" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("When disabled, members who are not your connections cannot start a conversation or send you a new message. Existing connections can still message you.")}</p>
                  <SettingSwitch label={t("Allow message requests from people outside my network")} checked={dataPrivacyPreferences.allowMessageRequests} disabled={savingDataPrivacy} onChange={() => saveDataPrivacyPreference("allowMessageRequests", !dataPrivacyPreferences.allowMessageRequests)} />
                </div>
              ) : activeDetail === "network-invitations" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Control whether group owners and event organizers can invite you to their communities and events.")}</p>
                  <SettingSwitch label={t("Allow group and event invitations")} checked={dataPrivacyPreferences.allowNetworkInvitations} disabled={savingDataPrivacy} onChange={() => saveDataPrivacyPreference("allowNetworkInvitations", !dataPrivacyPreferences.allowNetworkInvitations)} />
                </div>
              ) : activeDetail === "recruiter-invitations" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Control whether recruiters can invite you to apply for jobs through CareerLink. This applies to invitations in the recruiter candidate search.")}</p>
                  <SettingSwitch label={t("Allow recruiter job invitations")} checked={dataPrivacyPreferences.allowRecruiterJobInvites} disabled={savingDataPrivacy} onChange={() => saveDataPrivacyPreference("allowRecruiterJobInvites", !dataPrivacyPreferences.allowRecruiterJobInvites)} />
                </div>
              ) : activeDetail === "read-receipts" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("When enabled, people you message can see when you have read their messages. Typing indicators are not currently available in CareerLink.")}</p>
                  <SettingSwitch label={t("Send read receipts")} checked={dataPrivacyPreferences.messageReadReceipts} disabled={savingDataPrivacy} onChange={() => saveDataPrivacyPreference("messageReadReceipts", !dataPrivacyPreferences.messageReadReceipts)} />
                </div>
              ) : activeDetail === "recruiter-interest" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("When enabled, your profile may appear in recruiter candidate suggestions when your job preferences match an open role. This does not submit a job application.")}</p>
                  <SettingSwitch label={t("Include me in recruiter candidate suggestions")} checked={dataPrivacyPreferences.signalRecruiterInterest} disabled={savingDataPrivacy} onChange={() => saveDataPrivacyPreference("signalRecruiterInterest", !dataPrivacyPreferences.signalRecruiterInterest)} />
                </div>
              ) : <p className="mt-4 text-sm text-muted-ink">{t("Choose a data privacy setting from the overview.")}</p>}
            </section>
          ) : null}
          {activeSection === "sign-in-security" && activeDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
              <button type="button" onClick={backToSecuritySettings} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back to Sign in & security")}</button>
              <h2 className="text-xl font-semibold text-ink">{t(securityDetailTitle(activeDetail))}</h2>
              {activeDetail === "security-email" ? (
                <div className="mt-5">
                  <p className="text-sm leading-6 text-muted-ink">{t("Your primary sign-in email cannot be removed here. Add other addresses only after confirming access to both the new inbox and your account email.")}</p>
                  <div className="mt-4 divide-y divide-gray-100">
                    {securityData.emails.map((item) => <div key={item.email} className="flex flex-wrap items-center gap-3 py-3">
                      <Mail size={18} className="text-muted-ink" />
                      <span className="min-w-0 flex-1 break-all text-sm font-medium text-ink">{item.email}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={15} />{item.primary ? t("Primary") : item.verified ? t("Verified") : t("Not verified")}</span>
                      {item.primary && <span className="text-xs text-muted-ink">{t("Sign-in email")}</span>}
                      {!item.primary && <button type="button" disabled={sendingSecurityCode} onClick={() => sendSecurityCode("remove-email", item.email)} className="text-sm font-semibold text-red-700 disabled:opacity-50">{t("Remove")}</button>}
                    </div>)}
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); sendSecurityCode("add-email", securityEmailInput.trim().toLowerCase()); }} className="mt-5 max-w-lg">
                    <label className="block text-sm font-medium text-ink">{t("Add an email address")}<input type="email" autoComplete="email" required value={securityEmailInput} onChange={(event) => setSecurityEmailInput(event.target.value)} className={inputClass} placeholder="name@example.com" /></label>
                    <p className="mt-2 text-xs leading-5 text-muted-ink">{t("A code will be sent to this address and your primary account email.")}</p>
                    <button type="submit" disabled={sendingSecurityCode} className="mt-4 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50">{sendingSecurityCode ? t("Sending…") : t("Send verification code")}</button>
                  </form>
                  {securityCodeAction === "add-email" || securityCodeAction === "remove-email" ? <SecurityCodeEntry t={t} code={securityCode} setCode={setSecurityCode} busy={confirmingSecurityAction} onConfirm={() => completeSecurityAction()} /> : null}
                  {securityCodeAction === "remove-email" && <p className="mt-2 text-xs text-muted-ink">{t("Code requested for")}: {securityCodeValue}</p>}
                </div>
              ) : activeDetail === "security-phone" ? (
                <div className="mt-5">
                  <p className="text-sm leading-6 text-muted-ink">{t("Phone numbers are added after a security code is confirmed from your account email. CareerLink does not currently send SMS codes, so this does not verify control of the phone number.")}</p>
                  <div className="mt-4 divide-y divide-gray-100">
                    {securityData.phoneNumbers.map((item) => <div key={item.number} className="flex flex-wrap items-center gap-3 py-3">
                      <Smartphone size={18} className="text-muted-ink" />
                      <span className="min-w-0 flex-1 text-sm font-medium text-ink">{item.number}</span>
                      <span className="text-xs text-amber-700">{t("Confirmed by account email; not SMS-verified")}</span>
                      <button type="button" disabled={sendingSecurityCode} onClick={() => sendSecurityCode("remove-phone", item.number)} className="text-sm font-semibold text-red-700 disabled:opacity-50">{t("Remove")}</button>
                    </div>)}
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); sendSecurityCode("add-phone", securityPhoneInput.trim()); }} className="mt-5 max-w-lg">
                    <label className="block text-sm font-medium text-ink">{t("Add a phone number")}<input type="tel" autoComplete="tel" required value={securityPhoneInput} onChange={(event) => setSecurityPhoneInput(event.target.value)} className={inputClass} placeholder="+1 555 123 4567" /></label>
                    <button type="submit" disabled={sendingSecurityCode} className="mt-4 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50">{sendingSecurityCode ? t("Sending…") : t("Send email security code")}</button>
                  </form>
                  {securityCodeAction === "add-phone" || securityCodeAction === "remove-phone" ? <SecurityCodeEntry t={t} code={securityCode} setCode={setSecurityCode} busy={confirmingSecurityAction} onConfirm={() => completeSecurityAction()} /> : null}
                  {securityCodeAction === "remove-phone" && <p className="mt-2 text-xs text-muted-ink">{t("Code requested for")}: {securityCodeValue}</p>}
                </div>
              ) : activeDetail === "security-password" ? (
                <div className="mt-5">
                  {user?.hasPassword === false ? <p className="text-sm text-muted-ink">{t("Your account uses Google sign-in, so password changes are managed by Google.")}</p> : <>
                    <p className="text-sm leading-6 text-muted-ink">{t("For your security, enter the code sent to your account email before changing your password. Passwords must be at least 8 characters.")}</p>
                    <button type="button" disabled={sendingSecurityCode} onClick={() => sendSecurityCode("change-password")} className="mt-4 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50">{sendingSecurityCode ? t("Sending…") : t("Send security code to my email")}</button>
                    {securityCodeAction === "change-password" && !passwordCodeVerified && <div className="mt-5 grid gap-4 sm:max-w-xl">
                      <label className="text-sm font-medium text-ink">{t("Verification code")}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={securityCode} onChange={(event) => setSecurityCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={inputClass} /></label>
                      <button type="button" disabled={confirmingSecurityAction || securityCode.length !== 6} onClick={verifyPasswordChangeCode} className="w-fit rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{confirmingSecurityAction ? t("Verifying…") : t("Verify code")}</button>
                    </div>}
                    {securityCodeAction === "change-password" && passwordCodeVerified && <form onSubmit={savePassword} className="mt-5 grid gap-4 sm:max-w-xl">
                      <label className="text-sm font-medium text-ink">{t("Current password")}<PasswordInput autoComplete="current-password" className={inputClass} value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required /></label>
                      <label className="text-sm font-medium text-ink">{t("New password")}<PasswordInput autoComplete="new-password" className={inputClass} minLength={8} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required /></label>
                      <label className="text-sm font-medium text-ink">{t("Retype new password")}<PasswordInput autoComplete="new-password" className={inputClass} minLength={8} value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} required /></label>
                      <SettingSwitch label={t("Require all devices to sign in with the new password")} description={t("Signs out devices tracked by CareerLink, including this one.")} checked={signOutOtherDevices} onChange={() => setSignOutOtherDevices((value) => !value)} />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm font-semibold text-brand hover:underline">{t("Forgot password?")}</button>
                        <button disabled={savingPassword} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingPassword ? t("Updating…") : t("Update password")}</button>
                      </div>
                    </form>}
                  </>}
                </div>
              ) : activeDetail === "security-sessions" ? (
                <div className="mt-5">
                  <p className="mb-4 text-sm leading-6 text-muted-ink">{t("Sessions are tracked when you sign in on this version of CareerLink and remain active for up to 7 days. Approximate IP information is shown only when provided by your connection; no location is inferred.")}</p>
                  {securityData.sessions.length ? <div className="divide-y divide-gray-100">{securityData.sessions.map((session) => <SecurityDeviceRow key={session.sessionId} session={session} t={t} onAction={sendSecurityCode} busy={sendingSecurityCode} />)}</div> : <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-ink">{t("No tracked active sessions yet. Sign in again to register this device.")}</p>}
                  {["revoke-session", "remember-device", "forget-device"].includes(securityCodeAction) && <SecurityCodeEntry t={t} code={securityCode} setCode={setSecurityCode} busy={confirmingSecurityAction} onConfirm={() => completeSecurityAction()} />}
                </div>
              ) : activeDetail === "security-devices" ? (
                <div className="mt-5">
                  <p className="mb-4 text-sm leading-6 text-muted-ink">{t("Remembered devices are devices you explicitly mark. They can still require sign-in again after the 7-day session expires.")}</p>
                  {securityData.rememberedDevices.length ? <div className="divide-y divide-gray-100">{securityData.rememberedDevices.map((session) => <SecurityDeviceRow key={session.sessionId} session={session} t={t} onAction={sendSecurityCode} busy={sendingSecurityCode} rememberedView />)}</div> : <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-ink">{t("You have no remembered devices.")}</p>}
                  {["remember-device", "forget-device"].includes(securityCodeAction) && <SecurityCodeEntry t={t} code={securityCode} setCode={setSecurityCode} busy={confirmingSecurityAction} onConfirm={() => completeSecurityAction()} />}
                </div>
              ) : <p className="mt-4 text-sm text-muted-ink">{t("Choose a security setting from the overview.")}</p>}
            </section>
          ) : activeSection === "account-preferences" && activeDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
              <button type="button" onClick={backToAccountPreferences} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
              <h2 className="text-xl font-semibold text-ink">{detailTitle}</h2>
              {activeDetail === "profile-info" ? (
                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-700">{[settingsUser?.name, settingsUser?.location || profile.location, settingsUser?.industry].filter(Boolean).join(" · ")}</p>
                  <button type="button" onClick={() => setEditIntroOpen(true)} className="mt-4 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">{t("Edit")}</button>
                </div>
              ) : activeDetail === "demographic-info" ? (
                <form onSubmit={saveDemographics} className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Here’s the information you’ve provided about yourself. This will not be displayed on your profile.")}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-ink">{t("You can always remove all personal demographic data submitted in these categories.")}</p>
                  <button type="button" onClick={removeDemographics} disabled={savingDemographics} className="mt-3 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-50">{t("Remove")}</button>
                  <div className="mt-6 space-y-5">
                    <label className="block text-sm font-medium text-gray-800">
                      {t("Gender")}
                      <span className="mb-2 mt-3 block text-xs">{t("Select your gender identity")}</span>
                      <select value={demographics.genderIdentity} onChange={(event) => setDemographics({ ...demographics, genderIdentity: event.target.value })} className={inputClass}>
                        <option value="">{t("Select")}</option>
                        <option value="female">{t("Female")}</option>
                        <option value="male">{t("Male")}</option>
                        <option value="non-binary">{t("Non-binary")}</option>
                        <option value="another-identity">{t("Another gender identity")}</option>
                        <option value="prefer-not-to-say">{t("Prefer not to say")}</option>
                      </select>
                    </label>
                    <label className="block border-t border-gray-200 pt-5 text-sm font-medium text-gray-800">
                      {t("Disability")}
                      <span className="mb-2 mt-3 block text-xs">{t("Do you have a disability that substantially limits a major life activity, or a history of a disability?")}</span>
                      <select value={demographics.disabilityStatus} onChange={(event) => setDemographics({ ...demographics, disabilityStatus: event.target.value })} className={inputClass}>
                        <option value="">{t("Select")}</option>
                        <option value="yes">{t("Yes")}</option>
                        <option value="no">{t("No")}</option>
                        <option value="prefer-not-to-say">{t("Prefer not to say")}</option>
                      </select>
                    </label>
                    <div className="rounded-lg bg-gray-50 p-4 text-xs leading-5 text-gray-700">
                      <p className="font-semibold">{t("How CareerLink uses this data")}</p>
                      <p className="mt-1">{t("Your demographic data will not be shown on your profile. It may be used in aggregate to improve the CareerLink experience.")}</p>
                    </div>
                    <button disabled={savingDemographics} className="w-full rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingDemographics ? t("Saving…") : t("Agree and save")}</button>
                  </div>
                </form>
              ) : activeDetail === "verifications" ? (
                <p className="mt-3 text-sm leading-6 text-muted-ink">{t(detailDescriptions.verifications)} <a href="#" onClick={(event) => event.preventDefault()} className="font-semibold text-blue-700 hover:underline">{t("Learn more about verifications")}</a></p>
              ) : activeDetail === "dark-mode" ? (
                <div className="mt-2">
                  <p className="mb-5 text-sm text-muted-ink">{t("Choose how CareerLink looks on this device.")}</p>
                  <RadioOption label={t("Use device setting")} checked={theme === "system"} onChange={() => updateTheme("system")} />
                  <RadioOption label={t("Always on")} checked={theme === "dark"} onChange={() => updateTheme("dark")} />
                  <RadioOption label={t("Always off")} checked={theme === "light"} onChange={() => updateTheme("light")} />
                </div>
              ) : activeDetail === "language-setting" ? (
                <div className="mt-5 max-w-lg">
                  <p className="mb-5 text-sm text-muted-ink">{t("Select the language you use on CareerLink.")}</p>
                  <select aria-label={t("Language")} value={preferredLanguage} onChange={saveLanguage} disabled={savingLanguage} className={inputClass}>
                    <option value="en">{t("English (English)")}</option><option value="hi">{t("Hindi (हिन्दी)")}</option>
                  </select>
                  <p className="mt-4 text-xs leading-5 text-muted-ink">{t("Your language preference is saved to your account and can be changed at any time. Some parts of CareerLink may remain in English.")}</p>
                </div>
              ) : activeDetail === "autoplay-videos" ? (
                <div className="mt-3">
                  <p className="mb-6 text-sm text-muted-ink">{t("Autoplay videos that appear on CareerLink?")}</p>
                  <SettingSwitch label={t("Autoplay videos in your feed")} checked={autoplayVideos} onChange={toggleAutoplay} />
                </div>
              ) : activeDetail === "sound-effects" ? (
                <div className="mt-3">
                  <p className="mb-6 text-sm text-muted-ink">{t("Do you want sound effects to play for certain actions while using CareerLink?")}</p>
                  <SettingSwitch label={t("Play sound effects")} checked={soundEffects} onChange={() => updateSoundEffects(!soundEffects)} />
                  <p className="mt-4 text-xs leading-5 text-muted-ink">{t("Play a short sound when you send a message or join an event.")}</p>
                </div>
              ) : activeDetail === "content-language" ? (
                <div className="mt-4 space-y-5">
                  <div>
                    <p className="text-sm text-muted-ink">{t("Which language do you want content on CareerLink translated into?")}</p>
                    <p className="mt-3 text-xs leading-5 text-muted-ink">{t("Content translation preferences are saved to your account. Automatic translation of posts and comments is not available yet.")}</p>
                    <div className="mt-4 flex items-center justify-between border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-700">{contentLanguage === "hi" ? t("Hindi (हिन्दी)") : t("English (English)")}</span>
                      <select aria-label={t("Change content language")} value={contentLanguage} disabled={savingContentLanguage} onChange={(event) => {
                        const nextLanguage = event.target.value;
                          saveContentLanguages(nextLanguage, excludedContentLanguages);
                      }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-blue-700">
                        <option value="en">{t("English (English)")}</option><option value="hi">{t("Hindi (हिन्दी)")}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t("Which languages do you not want content translated from?")}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-ink">{t("Content in these languages will be left in its original language.")}</p>
                    <label className="mt-3 flex items-center gap-3 py-2 text-sm text-gray-700"><input type="checkbox" checked={excludedContentLanguages.includes("en")} disabled={savingContentLanguage} onChange={() => toggleExcludedContentLanguage("en")} className="h-4 w-4 accent-brand" />{t("English")}</label>
                    <label className="flex items-center gap-3 py-2 text-sm text-gray-700"><input type="checkbox" checked={excludedContentLanguages.includes("hi")} disabled={savingContentLanguage} onChange={() => toggleExcludedContentLanguage("hi")} className="h-4 w-4 accent-brand" />{t("Hindi")}</label>
                  </div>
                </div>
              ) : activeDetail === "profile-photos" ? (
                <div className="mt-3">
                  <p className="mb-4 text-sm text-muted-ink">{t("Which members’ profile photos would you like to see?")}</p>
                  <RadioOption label={t("No one")} checked={profilePhotoVisibility === "none"} onChange={() => {
                    savePreference({ profilePhotoVisibility: "none" }, (updatedUser) => setProfilePhotoVisibility(updatedUser.profilePhotoVisibility));
                  }} />
                  <RadioOption label={t("Your connections")} checked={profilePhotoVisibility === "connections"} onChange={() => {
                    savePreference({ profilePhotoVisibility: "connections" }, (updatedUser) => setProfilePhotoVisibility(updatedUser.profilePhotoVisibility));
                  }} />
                  <RadioOption label={t("Your network")} checked={profilePhotoVisibility === "network"} onChange={() => {
                    savePreference({ profilePhotoVisibility: "network" }, (updatedUser) => setProfilePhotoVisibility(updatedUser.profilePhotoVisibility));
                  }} />
                  <RadioOption label={t("All CareerLink members")} checked={profilePhotoVisibility === "all"} onChange={() => {
                    savePreference({ profilePhotoVisibility: "all" }, (updatedUser) => setProfilePhotoVisibility(updatedUser.profilePhotoVisibility));
                  }} />
                </div>
              ) : activeDetail === "feed-view" ? (
                <div className="mt-3">
                  <p className="mb-4 text-sm text-muted-ink">{t("Select your preferred feed view.")}</p>
                  <RadioOption label={t("Most relevant posts (Recommended)")} checked={preferredFeedView === "relevant"} onChange={() => {
                    savePreference({ preferredFeedView: "relevant" }, (updatedUser) => setPreferredFeedView(updatedUser.preferredFeedView));
                  }} />
                  <RadioOption label={t("Most recent posts")} checked={preferredFeedView === "recent"} onChange={() => {
                    savePreference({ preferredFeedView: "recent" }, (updatedUser) => setPreferredFeedView(updatedUser.preferredFeedView));
                  }} />
                  <p className="mt-4 text-xs leading-5 text-muted-ink">{t("Your feed preference is saved and applies to posts in your feed.")}</p>
                </div>
              ) : activeDetail === "unfollowed-people" ? (
                <div className="mt-2">
                  <p className="mb-4 text-sm text-muted-ink">{t("Currently unfollowed people")}: {unfollowedPeople.length}</p>
                  {unfollowedPeople.length ? <div className="divide-y divide-gray-200">{unfollowedPeople.map((person) => (
                    <div key={person._id} className="flex items-center gap-3 py-3">
                      <ProfileAvatar user={person} size={44} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-800">{person.name}</p>{person.headline && <p className="truncate text-xs text-muted-ink">{person.headline}</p>}</div>
                      <button type="button" onClick={() => handleUnfollowedFollow(person)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">{t("Follow")}</button>
                    </div>
                  ))}</div> : <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-ink">{t("You haven't unfollowed anyone yet.")}</p>}
                </div>
              ) : activeDetail === "delete-account" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Permanently removes your profile, posts, comments, articles, job posts, applications, messages, media, and related CareerLink records. This cannot be undone.")}</p>
                  <button type="button" onClick={() => setDeleteOpen(true)} className="mt-5 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white">{t("Continue")}</button>
                </div>
              ) : activeDetail === "hibernate-account" ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-ink">{t("Your profile is hidden and your content is retained. Sign in again to reactivate.")}</p>
                  <button type="button" onClick={() => setShowDeactivate(true)} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">{t("Hibernate account")}</button>
                </div>
              ) : <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink">{t("This setting is not available yet.")}</p>}
            </section>
          ) : activeSection === "account-preferences" ? (
            <>
              <PreferenceGroup title={t("Profile information")} rows={accountPreferenceRows.slice(0, 3)} onSelect={selectPreference} t={t} values={preferenceSummary} />
              <PreferenceGroup title={t("Display")} rows={accountPreferenceRows.slice(3, 4)} onSelect={selectPreference} t={t} values={preferenceSummary} />
              <PreferenceGroup title={t("General preferences")} rows={accountPreferenceRows.slice(4, 11)} onSelect={selectPreference} t={t} values={preferenceSummary} />
              <PreferenceGroup title={t("Account management")} rows={accountPreferenceRows.slice(11)} onSelect={selectPreference} t={t} values={preferenceSummary} />
              <section className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-brand"><LogOut size={16} />{t("Sign out")}</button>
              </section>
            </>
          ) : activeSection === "visibility" && !activeDetail ? (
            <>
              <PreferenceGroup
                title={t("Visibility of your profile & network")}
                rows={visibilityProfileRows}
                onSelect={(id) => navigate(`/settings#visibility-${id}`)}
                t={t}
                values={{
                  "profile-viewer": t(visibilitySummary(visibilitySettings.profileViewerVisibility)),
                  "public-profile": visibilitySettings.publicProfileEnabled ? t("On") : t("Off"),
                  email: t(visibilitySummary(visibilitySettings.emailVisibility)),
                  birthday: t(birthdayVisibility === "private" ? "Only me" : birthdayVisibility === "connections" ? "My connections" : "Everyone"),
                  connections: visibilitySettings.connectionVisibility ? t("On") : t("Off"),
                  follow: t(visibilitySummary(visibilitySettings.followVisibility)),
                  "last-name": t(visibilitySummary(visibilitySettings.lastNameVisibility)),
                  "represent-content": visibilitySettings.representOnContent ? t("On") : t("Off"),
                  "off-platform": visibilitySettings.offPlatformVisibility ? t("On") : t("Off"),
                  "discover-email": t(visibilitySummary(visibilitySettings.discoverabilityEmail)),
                  "discover-phone": t(visibilitySummary(visibilitySettings.discoverabilityPhone)),
                  "blocked-members": `${blockedMembers.length} ${t("blocked")}`,
                }}
              />
              <PreferenceGroup
                title={t("Visibility of your CareerLink activity")}
                rows={visibilityActivityRows}
                onSelect={(id) => navigate(`/settings#visibility-${id}`)}
                t={t}
                values={{
                  "active-status": t(visibilitySummary(visibilitySettings.activeStatusVisibility)),
                  "profile-updates": visibilitySettings.shareProfileUpdates ? t("On") : t("Off"),
                  news: visibilitySettings.notifyNetworkInNews ? t("On") : t("Off"),
                  mentions: visibilitySettings.allowMentionsTagsCollabs ? t("On") : t("Off"),
                  followers: t(visibilitySummary(visibilitySettings.followerVisibility)),
                }}
              />
            </>
          ) : activeSection === "notifications"
            && activeDetail === "notification-posting" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch
                  label={t("Allow post related notifications")}
                  checked={preferences.postingNotificationsEnabled !== false}
                  disabled={savingPreferences}
                  onChange={() => togglePreference("postingNotificationsEnabled")}
                />
              </div>
              <div className="divide-y divide-gray-200">
                {postingRows.map(([id, label, channels]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/settings#notification-posting-detail-${id}`)}
                    className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7"
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">{t(label)}</span>
                      <span className="text-xs text-muted-ink">{t(channels)}</span>
                    </span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && postingDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-posting")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(postingDetailRow?.[1] || "Posting and commenting")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(postingDescriptions[postingDetail])}</p>
                {postingPreference && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
              </div>
              {postingPreference ? (
                <>
                  <div className="divide-y divide-gray-200 px-5 sm:px-7">
                    <SettingSwitch
                      icon={Bell}
                      label={t("In-app notifications")}
                      description={t("Delivered inside the app")}
                      checked={preferences[postingPreference.inApp] !== false}
                      disabled={savingPreferences || preferences.postingNotificationsEnabled === false}
                      onChange={() => togglePreference(postingPreference.inApp)}
                    />
                    <SettingSwitch
                      icon={Bell}
                      label={t("Push notifications")}
                      description={t("Push delivery is not available in CareerLink yet.")}
                      checked={false}
                      disabled
                    />
                    <SettingSwitch
                      icon={Mail}
                      label={t("Email")}
                      description={notificationCapabilities.email
                        ? t("Sent to your primary email based on the selected frequency.")
                        : t("Configure SMTP in the server environment to enable notification email.")}
                      checked={preferences[postingPreference.email] !== false}
                      disabled={savingPreferences
                        || !notificationCapabilities.email
                        || preferences.emailNotifications === false
                        || preferences.postingNotificationsEnabled === false}
                      onChange={() => togglePreference(postingPreference.email)}
                    />
                  </div>
                  {postingPreference.frequency && (
                    <div className="px-5 pb-5 pt-4 sm:px-7">
                      <h3 className="mb-2 text-sm font-semibold text-ink">{t("Choose email frequency")}</h3>
                      {[
                        ["individual", "Individual"],
                        ["weekly", "Weekly"],
                        ["recommended", "CareerLink recommended"],
                      ].map(([value, label]) => (
                        <RadioOption
                          key={value}
                          label={t(label)}
                          checked={(preferences[postingPreference.frequency] || "recommended") === value}
                          disabled={savingPreferences
                            || !notificationCapabilities.email
                            || preferences[postingPreference.email] === false
                            || preferences.emailNotifications === false
                            || preferences.postingNotificationsEnabled === false}
                          onChange={() => saveNotificationPreference(postingPreference.frequency, value)}
                        />
                      ))}
                      <p className="mt-2 text-xs leading-5 text-muted-ink">
                        {t("CareerLink recommended groups email into a weekly summary; in-app notifications remain immediate.")}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">
                  {t("CareerLink does not currently generate this type of notification, so delivery controls are not available yet.")}
                </p>
              )}
            </section>
          ) : activeSection === "notifications" && activeDetail === "notification-messaging" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch label={t("Allow messaging notifications")} checked={preferences.messageNotifications !== false} disabled={savingPreferences} onChange={() => togglePreference("messageNotifications")} />
              </div>
              <div className="divide-y divide-gray-200">
                {messagingRows.map(([id, label, channels]) => (
                  <button key={id} type="button" onClick={() => navigate(`/settings#notification-messaging-detail-${id}`)} className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                    <span><span className="block text-sm font-medium text-ink">{t(label)}</span><span className="text-xs text-muted-ink">{t(channels)}</span></span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && messagingDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-messaging")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(messagingDetailRow?.[1] || "Messaging")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(messagingDescriptions[messagingDetail])}</p>
                {messagingPreference && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
              </div>
              {messagingPreference ? (
                <>
                  <div className="divide-y divide-gray-200 px-5 sm:px-7">
                    <SettingSwitch icon={Bell} label={t("In-app notifications")} description={t("Delivered inside the app")} checked={preferences[messagingPreference.inApp] !== false} disabled={savingPreferences || preferences.messageNotifications === false} onChange={() => togglePreference(messagingPreference.inApp)} />
                    <SettingSwitch icon={Bell} label={t("Push notifications")} description={t("Push delivery is not available in CareerLink yet.")} checked={false} disabled />
                    <SettingSwitch
                      icon={Mail}
                      label={t("Email")}
                      description={notificationCapabilities.email ? t("Sent to your primary email when this notification occurs.") : t("Configure SMTP in the server environment to enable notification email.")}
                      checked={preferences[messagingPreference.email] !== false}
                      disabled={savingPreferences || !notificationCapabilities.email || preferences.emailNotifications === false || preferences.messageNotifications === false}
                      onChange={() => togglePreference(messagingPreference.email)}
                    />
                  </div>
                  {messagingDetail === "messages" && <div className="px-5 pb-5 pt-4 sm:px-7">
                    <h3 className="mb-2 text-sm font-semibold text-ink">{t("Choose email frequency")}</h3>
                    {[
                      ["individual", "Individual"],
                      ["weekly", "Weekly"],
                      ["recommended", "CareerLink recommended"],
                    ].map(([value, label]) => (
                      <RadioOption key={value} label={t(label)} checked={(preferences.messageEmailFrequency || "individual") === value} disabled={savingPreferences || !notificationCapabilities.email || preferences.messageEmailNotifications === false || preferences.emailNotifications === false || preferences.messageNotifications === false} onChange={() => saveNotificationPreference("messageEmailFrequency", value)} />
                    ))}
                    <p className="mt-2 text-xs leading-5 text-muted-ink">{t("Weekly and recommended email delivery sends a digest; in-app message notifications remain immediate.")}</p>
                  </div>}
                </>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">{t("CareerLink does not currently generate this type of notification, so delivery controls are not available yet.")}</p>
              )}
            </section>
          ) : activeSection === "notifications" && activeDetail === "notification-groups" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch label={t("Allow group notifications")} checked={preferences.groupNotificationsEnabled !== false} disabled={savingPreferences} onChange={() => togglePreference("groupNotificationsEnabled")} />
              </div>
              <div className="divide-y divide-gray-200">
                {groupRows.map(([id, label, channels]) => (
                  <button key={id} type="button" onClick={() => navigate(`/settings#notification-groups-detail-${id}`)} className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                    <span><span className="block text-sm font-medium text-ink">{t(label)}</span><span className="text-xs text-muted-ink">{t(channels)}</span></span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && groupDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-groups")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(groupDetailRow?.[1] || "Groups")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(groupDescriptions[groupDetail])}</p>
                {groupPreference && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
              </div>
              {groupPreference ? (
                <>
                  <div className="divide-y divide-gray-200 px-5 sm:px-7">
                    <SettingSwitch icon={Bell} label={t("In-app notifications")} description={t("Delivered inside the app")} checked={preferences[groupPreference.inApp] !== false} disabled={savingPreferences || preferences.groupNotificationsEnabled === false} onChange={() => togglePreference(groupPreference.inApp)} />
                    <SettingSwitch icon={Bell} label={t("Push notifications")} description={t("Push delivery is not available in CareerLink yet.")} checked={false} disabled />
                    <SettingSwitch
                      icon={Mail}
                      label={t("Email")}
                      description={notificationCapabilities.email ? t("Sent to your primary email when this event occurs.") : t("Configure SMTP in the server environment to enable notification email.")}
                      checked={preferences[groupPreference.email] !== false}
                      disabled={savingPreferences || !notificationCapabilities.email || preferences.emailNotifications === false || preferences.groupNotificationsEnabled === false}
                      onChange={() => togglePreference(groupPreference.email)}
                    />
                  </div>
                  {groupPreference.frequency && (
                    <div className="px-5 pb-5 pt-4 sm:px-7">
                      <h3 className="mb-2 text-sm font-semibold text-ink">{t("Choose email frequency")}</h3>
                      {[
                        ["individual", "Individual"],
                        ["weekly", "Weekly"],
                        ["recommended", "CareerLink recommended"],
                      ].map(([value, label]) => (
                        <RadioOption key={value} label={t(label)} checked={(preferences[groupPreference.frequency] || "recommended") === value} disabled={savingPreferences || !notificationCapabilities.email || preferences[groupPreference.email] === false || preferences.emailNotifications === false || preferences.groupNotificationsEnabled === false} onChange={() => saveNotificationPreference(groupPreference.frequency, value)} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">{t("CareerLink does not currently generate this type of notification, so delivery controls are not available yet.")}</p>
              )}
            </section>
          ) : activeSection === "notifications"
            && activeDetail === "notification-network-updates" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch
                  label={t("Allow network catch-up updates and notifications")}
                  checked={preferences.networkCatchupEnabled !== false}
                  disabled={savingPreferences}
                  onChange={() => togglePreference("networkCatchupEnabled")}
                />
              </div>
              <div className="divide-y divide-gray-200">
                {networkCatchupRows.map(([id, label, channels]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/settings#notification-network-updates-detail-${id}`)}
                    className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7"
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">{t(label)}</span>
                      <span className="text-xs text-muted-ink">{t(channels)}</span>
                    </span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && networkCatchupDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-network-updates")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(networkCatchupRow?.[1] || "Network catch-up updates")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(networkCatchupDescriptions[networkCatchupDetail])}</p>
                {(networkCatchupPreference || networkBirthdayPreference || networkCatchupDetail === "weekly-summary") && (
                  <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>
                )}
              </div>
              {networkBirthdayPreference ? (
                <div className="divide-y divide-gray-200 px-5 sm:px-7">
                  <SettingSwitch icon={Bell} label={t("In-app notifications")} description={t("Delivered inside the app")} checked={preferences[networkBirthdayPreference[0]] !== false} disabled={savingPreferences || preferences.networkCatchupEnabled === false} onChange={() => togglePreference(networkBirthdayPreference[0])} />
                  <SettingSwitch icon={Mail} label={t("Email")} description={notificationCapabilities.email ? t("Sent to your primary email when a permitted birthday is coming up.") : t("Configure SMTP in the server environment to enable notification email.")} checked={preferences[networkBirthdayPreference[1]] !== false} disabled={savingPreferences || !notificationCapabilities.email || preferences.emailNotifications === false || preferences.networkCatchupEnabled === false} onChange={() => togglePreference(networkBirthdayPreference[1])} />
                </div>
              ) : networkCatchupPreference ? (
                <div className="divide-y divide-gray-200 px-5 sm:px-7">
                  <SettingSwitch
                    icon={Bell}
                    label={t("In-app notifications")}
                    description={t("Delivered inside the app")}
                    checked={preferences[networkCatchupPreference] !== false}
                    disabled={savingPreferences || preferences.networkCatchupEnabled === false}
                    onChange={() => togglePreference(networkCatchupPreference)}
                  />
                  {networkCatchupDetail === "job-changes" && (
                    <SettingSwitch
                      icon={Bell}
                      label={t("Push notifications")}
                      description={t("Push delivery is not available in CareerLink yet.")}
                      checked={false}
                      disabled
                    />
                  )}
                </div>
              ) : networkCatchupDetail === "weekly-summary" ? (
                <div className="px-5 sm:px-7">
                  <SettingSwitch
                    icon={Bell}
                    label={t("Push notifications")}
                    description={t("Push delivery is not available in CareerLink yet.")}
                    checked={false}
                    disabled
                  />
                  <SettingSwitch
                    icon={Mail}
                    label={t("Email")}
                    description={notificationCapabilities.email
                      ? t("A summary email is sent once a week when your network has updates.")
                      : t("Configure SMTP in the server environment to enable summary email.")}
                    checked={preferences.networkWeeklySummaryEmail !== false}
                    disabled={savingPreferences
                      || !notificationCapabilities.email
                      || preferences.emailNotifications === false
                      || preferences.networkCatchupEnabled === false}
                    onChange={() => togglePreference("networkWeeklySummaryEmail")}
                  />
                </div>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">
                  {t(networkCatchupDetail === "birthdays"
                    ? "This notification cannot be generated because member birthdays are not collected in CareerLink."
                    : "CareerLink does not currently generate this type of notification, so delivery controls are not available yet.")}
                </p>
              )}
            </section>
          ) : activeSection === "notifications"
            && activeDetail === "notification-connecting" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch
                  label={t("Allow connections related notifications")}
                  checked={preferences.connectionNotifications !== false}
                  disabled={savingPreferences}
                  onChange={() => togglePreference("connectionNotifications")}
                />
              </div>
              <div className="divide-y divide-gray-200">
                {connectionRows.map(([id, label, channels]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/settings#notification-connecting-detail-${id}`)}
                    className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7"
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">{t(label)}</span>
                      <span className="text-xs text-muted-ink">{t(channels)}</span>
                    </span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && connectionDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-connecting")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(connectionDetailRow?.[1] || "Connecting with others")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(connectionDescriptions[connectionDetail])}</p>
                {connectionPreference && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
              </div>
              {connectionPreference ? (
                <div className="divide-y divide-gray-200 px-5 sm:px-7">
                  <SettingSwitch
                    icon={Bell}
                    label={t("In-app notifications")}
                    description={t("Delivered inside the app")}
                    checked={preferences[connectionPreference.inApp] !== false}
                    disabled={savingPreferences || preferences.connectionNotifications === false}
                    onChange={() => togglePreference(connectionPreference.inApp)}
                  />
                  <SettingSwitch
                    icon={Bell}
                    label={t("Push notifications")}
                    description={t("Push delivery is not available in CareerLink yet.")}
                    checked={false}
                    disabled
                  />
                  <SettingSwitch
                    icon={Mail}
                    label={t("Email")}
                    description={notificationCapabilities.email
                      ? t("Sent individually to your account email when this event occurs.")
                      : t("Configure SMTP in the server environment to enable notification email.")}
                    checked={preferences[connectionPreference.email] !== false}
                    disabled={savingPreferences
                      || !notificationCapabilities.email
                      || preferences.emailNotifications === false
                      || preferences.connectionNotifications === false}
                    onChange={() => togglePreference(connectionPreference.email)}
                  />
                </div>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">
                  {t("CareerLink does not currently generate this type of notification, so delivery controls are not available yet.")}
                </p>
              )}
            </section>
          ) : activeSection === "notifications"
            && !hiringDetail
            && (activeDetail === "notification-hiring"
              || activeDetail === "notification-hiring-job-posts"
              || activeDetail === "notification-hiring-service-projects") ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <div className="flex gap-7 border-b border-gray-200">
                  {[
                    ["job-posts", "Job posts", "notification-hiring-job-posts"],
                    ["service-projects", "Service Page projects", "notification-hiring-service-projects"],
                  ].map(([id, label, path]) => (
                    <button key={id} type="button" onClick={() => navigate(`/settings#${path}`)} className={`border-b-2 px-2 pb-3 text-sm font-medium ${hiringTab === id ? "border-emerald-700 text-emerald-800" : "border-transparent text-gray-700"}`}>
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>
              {hiringTab === "job-posts" ? (
                <>
                  <div className="border-b border-gray-200 px-5 py-3 sm:px-7">
                    <SettingSwitch
                      label={t("Allow job post notifications")}
                      checked={preferences.hiringNotificationsEnabled !== false}
                      disabled={savingPreferences}
                      onChange={() => togglePreference("hiringNotificationsEnabled")}
                    />
                  </div>
                  <div className="divide-y divide-gray-200">
                    {hiringJobPostRows.map(([id, label]) => (
                      <button key={id} type="button" onClick={() => navigate(`/settings#notification-hiring-detail-${id}`)} className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                        <span><span className="block text-sm font-medium text-ink">{t(label)}</span><span className="text-xs text-muted-ink">{t("Notification settings")}</span></span>
                        <ArrowRow />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b border-gray-200 px-5 py-3 sm:px-7">
                    <SettingSwitch label={t("Allow project work notifications")} checked={false} disabled description={t("Service Page projects are not available in CareerLink yet.")} />
                  </div>
                  <div className="divide-y divide-gray-200">
                    {hiringProjectRows.map(([id, label]) => (
                      <button key={id} type="button" onClick={() => navigate(`/settings#notification-hiring-detail-${id}`)} className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                        <span><span className="block text-sm font-medium text-ink">{t(label)}</span><span className="text-xs text-muted-ink">{t("Unavailable until project services are added")}</span></span>
                        <ArrowRow />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : activeSection === "notifications" && hiringDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button
                  type="button"
                  onClick={() => navigate(`/settings#notification-hiring-${hiringDetailIsProject ? "service-projects" : "job-posts"}`)}
                  className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"
                >
                  <ArrowLeft size={18} />{t("Back")}
                </button>
                <h2 className="text-base font-semibold text-ink">{t(hiringDetailRow?.[1] || "Hiring someone")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(hiringDescriptions[hiringDetail])}</p>
                {hiringPreference && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
              </div>
              {hiringPreference ? (
                <div className="divide-y divide-gray-200 px-5 sm:px-7">
                  <SettingSwitch
                    icon={Bell}
                    label={t("In-app notifications")}
                    description={t("Delivered inside the app")}
                    checked={preferences[hiringPreference.inApp] !== false}
                    disabled={savingPreferences || preferences.hiringNotificationsEnabled === false}
                    onChange={() => togglePreference(hiringPreference.inApp)}
                  />
                  <SettingSwitch
                    icon={Bell}
                    label={t("Push notifications")}
                    description={t("Push delivery is not available in CareerLink yet.")}
                    checked={false}
                    disabled
                  />
                  <SettingSwitch
                    icon={Mail}
                    label={t("Email")}
                    description={notificationCapabilities.email
                      ? t("Sent individually to your account email.")
                      : t("Configure SMTP in the server environment to enable notification email.")}
                    checked={preferences[hiringPreference.email] !== false}
                    disabled={savingPreferences
                      || !notificationCapabilities.email
                      || preferences.emailNotifications === false
                      || preferences.hiringNotificationsEnabled === false}
                    onChange={() => togglePreference(hiringPreference.email)}
                  />
                </div>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">
                  {t(hiringDetailIsProject
                    ? "CareerLink does not have Service Page projects yet, so this notification cannot be generated or configured."
                    : "CareerLink does not currently have this hiring workflow, so it cannot generate these notifications or offer delivery settings.")}
                </p>
              )}
            </section>
          ) : activeSection === "notifications" && activeDetail === "notification-job-search" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch label={t("Allow job search notifications")} checked={preferences.jobSearchNotificationsEnabled !== false} disabled={savingPreferences} onChange={() => togglePreference("jobSearchNotificationsEnabled")} />
              </div>
              <div className="divide-y divide-gray-200">
                {jobSearchRows.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => navigate(`/settings#notification-job-search-${id}`)} className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                    <span><span className="block text-sm font-medium text-ink">{t(label)}</span>{id === "job-alerts" && <span className="text-xs text-muted-ink">{t("In-app notifications")}</span>}</span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && jobSearchNotificationDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-job-search")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(jobSearchRows.find(([id]) => id === jobSearchNotificationDetail)?.[1] || "Notifications")}</h2>
                {jobSearchDescriptions[jobSearchNotificationDetail] && <p className="mt-1 text-sm leading-5 text-muted-ink">{t(jobSearchDescriptions[jobSearchNotificationDetail])}</p>}
                <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>
              </div>
              {activeJobNotificationTypes.length ? (
                <div className="divide-y divide-gray-200 px-5 sm:px-7">
                  <SettingSwitch
                    icon={Bell}
                    label={t("In-app notifications")}
                    description={t("Delivered inside the app")}
                    checked={jobSearchNotificationDetail === "job-alerts"
                      ? preferences.jobAlerts !== false
                      : jobSearchNotificationDetail === "saved-jobs"
                        ? !(preferences.hiddenNotificationTypes || []).includes("saved_job_update")
                      : !activeJobNotificationTypes.every((type) => (preferences.hiddenNotificationTypes || []).includes(type))}
                    disabled={savingPreferences || preferences.jobSearchNotificationsEnabled === false}
                    onChange={() => jobSearchNotificationDetail === "job-alerts"
                      ? togglePreference("jobAlerts")
                      : toggleNotificationCategory(activeJobNotificationTypes[0])}
                  />
                  <SettingSwitch icon={Bell} label={t("Push notifications")} description={t("Push delivery is not available in CareerLink yet.")} checked={false} disabled />
                  <SettingSwitch
                    icon={Mail}
                    label={t("Email")}
                    description={notificationCapabilities.email
                      ? t("Sent individually to your account email when this event occurs.")
                      : t("Configure SMTP in the server environment to enable notification email.")}
                    checked={preferences[emailPreferenceByJobSearchDetail[jobSearchNotificationDetail]] !== false}
                    disabled={savingPreferences
                      || !notificationCapabilities.email
                      || preferences.emailNotifications === false
                      || preferences.jobSearchNotificationsEnabled === false}
                    onChange={() => togglePreference(emailPreferenceByJobSearchDetail[jobSearchNotificationDetail])}
                  />
                </div>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">{t("CareerLink does not currently generate this type of notification, so delivery controls are not available yet.")}</p>
              )}
            </section>
          ) : activeSection === "notifications" && activeDetail === "notification-pages" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch label={t("Allow page notifications")} checked disabled />
              </div>
              <div className="divide-y divide-gray-200">
                {pageRows.map(([id, label, channels]) => (
                  <button key={id} type="button" onClick={() => navigate(`/settings#notification-pages-detail-${id}`)} className="flex min-h-[68px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                    <span><span className="block text-sm font-medium text-ink">{t(label)}</span><span className="text-xs text-muted-ink">{t(channels)}</span></span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
              <p className="border-t border-gray-200 px-5 py-3 text-xs leading-5 text-muted-ink sm:px-7">{t("Page notification controls are a UI preview. Preferences will be connected when Company Pages are added to CareerLink.")}</p>
            </section>
          ) : activeSection === "notifications" && activeDetail === "notification-events" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch label={t("Allow event notifications")} checked={preferences.eventNotificationsEnabled !== false} disabled={savingPreferences} onChange={() => togglePreference("eventNotificationsEnabled")} />
              </div>
              <div className="divide-y divide-gray-200">
                {eventRows.map(([id, label, channels]) => (
                  <button key={id} type="button" onClick={() => navigate(`/settings#notification-events-detail-${id}`)} className="flex min-h-[68px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                    <span><span className="block text-sm font-medium text-ink">{t(label)}</span><span className="text-xs text-muted-ink">{t(channels)}</span></span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && eventDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-events")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(eventDetailRow?.[1] || "Attending events")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(eventDescriptions[eventDetail])}</p>
                {resolvedEventPreference && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
              </div>
              {resolvedEventPreference ? (
                <div className="divide-y divide-gray-200 px-5 sm:px-7">
                  <SettingSwitch icon={Bell} label={t("In-app notifications")} description={t("Delivered inside the app")} checked={preferences[resolvedEventPreference[0]] !== false} disabled={savingPreferences || preferences.eventNotificationsEnabled === false} onChange={() => togglePreference(resolvedEventPreference[0])} />
                  <SettingSwitch icon={Bell} label={t("Push notifications")} description={t("Push delivery is not available in CareerLink yet.")} checked={false} disabled />
                  <SettingSwitch
                    icon={Mail}
                    label={t("Email")}
                    description={notificationCapabilities.email ? t("Sent on your primary email when this event occurs.") : t("Configure SMTP in the server environment to enable notification email.")}
                    checked={preferences[resolvedEventPreference[1]] !== false}
                    disabled={savingPreferences || !notificationCapabilities.email || preferences.emailNotifications === false || preferences.eventNotificationsEnabled === false}
                    onChange={() => togglePreference(resolvedEventPreference[1])}
                  />
                </div>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">{t("CareerLink does not currently generate this type of notification, so delivery controls are not available yet.")}</p>
              )}
            </section>
          ) : activeSection === "notifications" && activeDetail === "notification-profile-updates" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-3 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <SettingSwitch label={t("Allow profile improvement notifications")} checked={preferences.profileUpdatesEnabled !== false} disabled={savingPreferences} onChange={() => togglePreference("profileUpdatesEnabled")} />
              </div>
              <div className="divide-y divide-gray-200">
                {profileUpdateRows.map(([id, label, channels]) => (
                  <button key={id} type="button" onClick={() => navigate(`/settings#notification-profile-updates-detail-${id}`)} className="flex min-h-[68px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-gray-50 sm:px-7">
                    <span><span className="block text-sm font-medium text-ink">{t(label)}</span><span className="text-xs text-muted-ink">{t(channels)}</span></span>
                    <ArrowRow />
                  </button>
                ))}
              </div>
            </section>
          ) : activeSection === "notifications" && profileUpdateDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pb-4 pt-5 sm:px-7">
                <button type="button" onClick={() => navigate("/settings#notification-profile-updates")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                <h2 className="text-base font-semibold text-ink">{t(profileUpdateRow?.[1] || "Updating your profile")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-ink">{t(profileUpdateDescriptions[profileUpdateDetail] || "")}</p>
                {profileUpdateDetail === "recommendations" && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
              </div>
              {profileUpdateDetail === "recommendations" ? (
                <div className="divide-y divide-gray-200 px-5 sm:px-7">
                  <SettingSwitch icon={Bell} label={t("In-app notifications")} description={t("Delivered inside the app")} checked={preferences.profileRecommendationsInApp !== false} disabled={savingPreferences || preferences.profileUpdatesEnabled === false} onChange={() => togglePreference("profileRecommendationsInApp")} />
                  <SettingSwitch icon={Bell} label={t("Push notifications")} description={t("Push delivery is not available in CareerLink yet.")} checked={false} disabled />
                  <SettingSwitch icon={Mail} label={t("Email")} description={notificationCapabilities.email ? t("Sent on your primary email when profile improvements are available.") : t("Configure SMTP in the server environment to enable notification email.")} checked={preferences.profileRecommendationsEmail !== false} disabled={savingPreferences || !notificationCapabilities.email || preferences.emailNotifications === false || preferences.profileUpdatesEnabled === false} onChange={() => togglePreference("profileRecommendationsEmail")} />
                </div>
              ) : (
                <p className="mx-5 mb-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-muted-ink sm:mx-7">{t(profileUpdateDescriptions[profileUpdateDetail] || "This notification type is unavailable in CareerLink.")}</p>
              )}
            </section>
          ) : activeSection === "notifications" && activeDetail.startsWith("notification-pages-detail-") ? (
            (() => {
              const pageDetail = activeDetail.slice("notification-pages-detail-".length);
              const pageRow = pageRows.find(([id]) => id === pageDetail);
              return (
                <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="px-5 pb-4 pt-5 sm:px-7">
                    <button type="button" onClick={() => navigate("/settings#notification-pages")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
                    <h2 className="text-base font-semibold text-ink">{t(pageRow?.[1] || "Pages")}</h2>
                    <p className="mt-1 text-sm leading-5 text-muted-ink">{t(pageDescriptions[pageDetail] || "Page notifications will be available when Company Pages are added to CareerLink.")}</p>
                    {pageRow && <h3 className="mt-5 text-sm font-semibold text-ink">{t("Choose where you get notified")}</h3>}
                  </div>
                  {pageRow ? (
                    <div className="divide-y divide-gray-200 px-5 sm:px-7">
                      {pageRow[2].includes("In-app") && <SettingSwitch icon={Bell} label={t("In-app notifications")} description={t("Delivered inside the app")} checked disabled />}
                      {pageRow[2].includes("Push") && <SettingSwitch icon={Bell} label={t("Push notifications")} description={t("Pushed to your device immediately")} checked disabled />}
                      {pageRow[2].includes("Email") && <SettingSwitch icon={Mail} label={t("Email")} description={t("Sent on your primary email")} checked disabled />}
                    </div>
                  ) : null}
                  <p className="border-t border-gray-200 px-5 py-3 text-xs leading-5 text-muted-ink sm:px-7">{t("These controls are a UI preview and will be connected to real preferences after the Company Pages feature is built.")}</p>
                </section>
              );
            })()
          ) : activeSection === "notifications" && activeDetail ? (
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
              <button type="button" onClick={() => navigate("/settings#notifications")} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand"><ArrowLeft size={18} />{t("Back")}</button>
              <h2 className="text-base font-semibold text-ink">{t(notificationPageRows.find(([id]) => `notification-${id}` === activeDetail)?.[1] || "Notifications")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-ink">{t("CareerLink does not currently generate notifications for this category, so there are no delivery settings to configure.")}</p>
            </section>
          ) : activeSection === "notifications" && !activeDetail ? (
            <PreferenceGroup title={t("Notifications you receive")} rows={notificationPageRows} onSelect={(id) => navigate(`/settings#notification-${id}`)} t={t} />
          ) : activeSection === "data-privacy" && !activeDetail ? (
            <>
              <PreferenceGroup title={t("How CareerLink uses your data")} rows={privacyDataRows} onSelect={(id) => navigate(`/settings#privacy-${id}`)} t={t} values={{
                "data-export": t("Download or choose categories"),
                "demographic-info": t("Optional"),
                "resume-data": `${resumes.length} ${t("saved resumes")}`,
              }} />
              <PreferenceGroup title={t("Who can reach you")} rows={privacyReachRows} onSelect={(id) => navigate(`/settings#privacy-${id}`)} t={t} values={{
                "connection-invitations": dataPrivacyPreferences.connectionInvitationAudience === "network" ? t("Your network") : t("Everyone"),
                "network-invitations": dataPrivacyPreferences.allowNetworkInvitations ? t("Allowed") : t("Blocked"),
                "message-requests": dataPrivacyPreferences.allowMessageRequests ? t("Allowed") : t("Connections only"),
                "recruiter-invitations": dataPrivacyPreferences.allowRecruiterJobInvites ? t("Allowed") : t("Blocked"),
              }} />
              <PreferenceGroup title={t("Messaging experience")} rows={privacyMessagingRows} onSelect={(id) => navigate(`/settings#privacy-${id}`)} t={t} values={{
                "read-receipts": dataPrivacyPreferences.messageReadReceipts ? t("On") : t("Off"),
              }} />
              <PreferenceGroup title={t("Job-seeking preferences")} rows={privacyJobRows} onSelect={(id) => navigate(`/settings#privacy-${id}`)} t={t} values={{
                "recruiter-interest": dataPrivacyPreferences.signalRecruiterInterest ? t("On") : t("Off"),
              }} />
              <section className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">{t("Close and delete account")}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-ink">{t("Permanently removes your profile, posts, comments, articles, job posts, applications, messages, media, and related CareerLink records. This cannot be undone.")}</p>
                <button type="button" onClick={() => setDeleteOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16} />{t("Delete account and data")}</button>
              </section>
            </>
          ) : activeSection === "sign-in-security" ? (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <SettingsTitle icon={KeyRound} title={t("Sign in & security")} description={t("Review your account access, password, and signed-in devices.")} />
              <div className="divide-y divide-gray-100 px-5">
                <SecurityOverviewRow icon={Mail} title={t("Email addresses")} description={t("Manage your sign-in and additional email addresses.")} summary={securityData.emails.length ? securityData.emails[0].email : user?.email} onClick={() => openSecuritySetting("email")} />
                <SecurityOverviewRow icon={Smartphone} title={t("Phone numbers")} description={t("Add or remove phone numbers on your account.")} summary={`${securityData.phoneNumbers.length} ${t("added")}`} onClick={() => openSecuritySetting("phone")} />
                <SecurityOverviewRow icon={KeyRound} title={t("Change password")} description={t("Update your password and choose whether to sign out other devices.")} summary={user?.hasPassword === false ? t("Managed by Google") : ""} onClick={() => openSecuritySetting("password")} />
                <SecurityOverviewRow icon={Monitor} title={t("Where you're signed in")} description={t("Review recent sessions and sign out devices.")} summary={`${securityData.sessions.length} ${t("active sessions")}`} onClick={() => openSecuritySetting("sessions")} />
                <SecurityOverviewRow icon={Smartphone} title={t("Devices that remember your password")} description={t("Review devices you chose to remember.")} summary={`${securityData.rememberedDevices.length} ${t("devices")}`} onClick={() => openSecuritySetting("devices")} />
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <EditProfileModal
        open={editIntroOpen}
        user={settingsUser || user}
        onClose={() => setEditIntroOpen(false)}
        onProfileUpdate={(updatedUser) => {
          setSettingsUser(updatedUser);
          updateUser(updatedUser);
          setProfile((current) => ({ ...current, name: updatedUser.name, headline: updatedUser.headline, location: updatedUser.location }));
        }}
      />
      {showDeactivate && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="deactivate-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="deactivate-title" className="text-lg font-semibold text-ink">Hibernate your account?</h2><p className="mt-2 text-sm leading-6 text-muted-ink">You will be signed out and your profile hidden. Existing content and records are retained. Signing in again with your password or Google account reactivates your account.</p><label className="mt-4 block text-sm font-medium text-ink">Type <span className="font-bold">DEACTIVATE</span> to confirm<input autoComplete="off" value={deactivationConfirmation} onChange={(event) => setDeactivationConfirmation(event.target.value)} className={inputClass} /></label><div className="mt-6 flex justify-end gap-2"><button type="button" disabled={deactivating} onClick={() => { setShowDeactivate(false); setDeactivationConfirmation(""); }} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={deactivating || deactivationConfirmation !== "DEACTIVATE"} onClick={handleDeactivate} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{deactivating ? "Hibernating…" : "Hibernate account"}</button></div></section></div>}
      {deleteOpen && <div className="fixed inset-0 z-[85] grid place-items-center bg-black/60 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={19} /></div><div><h2 id="delete-title" className="text-lg font-semibold text-ink">Permanently delete your account?</h2><p className="mt-2 text-sm leading-6 text-muted-ink">This deletes your CareerLink account and related content from the database and removes your uploaded files. Applications you submitted and jobs you posted are removed too. You will be signed out when deletion completes.</p></div></div><label className="mt-5 block text-sm font-medium text-ink">Account email<input autoComplete="email" type="email" value={deleteEmail} onChange={(event) => setDeleteEmail(event.target.value)} className={inputClass} placeholder={user?.email || "name@example.com"} /></label>{user?.hasPassword !== false && <label className="mt-4 block text-sm font-medium text-ink">Current password<PasswordInput autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className={inputClass} /></label>}<label className="mt-4 block text-sm font-medium text-ink">Type <strong>DELETE</strong> to confirm<input autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className={inputClass} /></label><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={deleting} onClick={() => { setDeleteOpen(false); setDeleteConfirmation(""); setDeleteEmail(""); setDeletePassword(""); }} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="button" disabled={deleting || deleteConfirmation !== "DELETE" || deleteEmail.trim().toLowerCase() !== user?.email?.toLowerCase() || (user?.hasPassword !== false && !deletePassword)} onClick={handleDeleteAccount} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{deleting ? "Deleting account…" : "Permanently delete"}</button></div></section></div>}
    </div>
  );
}

function PreferenceGroup({ title, rows, onSelect, t, values = {} }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <h2 className="px-5 pb-1 pt-5 text-lg font-semibold text-gray-900 sm:px-7">{title}</h2>
      <div className="divide-y divide-gray-200">
        {rows.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="flex min-h-[58px] w-full items-center justify-between gap-4 px-5 py-3 text-left text-sm text-gray-800 transition hover:bg-gray-50 sm:px-7 sm:text-base"
          >
            <span>{t(label)}</span>
            <span className="flex shrink-0 items-center gap-3">
              {values[id] && <span className="max-w-[150px] truncate text-sm text-gray-500 sm:max-w-[260px]">{values[id]}</span>}
              <ArrowRow />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ArrowRow() {
  return <span aria-hidden="true" className="text-2xl leading-none text-gray-500">→</span>;
}

function SettingsTitle({ icon: Icon, title, description }) {
  return (
    <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
      <Icon className="text-brand" size={20} />
      <div><h2 className="font-semibold text-ink">{title}</h2>{description && <p className="text-sm text-muted-ink">{description}</p>}</div>
    </header>
  );
}

function securityDetailTitle(detail) {
  return ({
    "security-email": "Email addresses",
    "security-phone": "Phone numbers",
    "security-password": "Change password",
    "security-sessions": "Where you're signed in",
    "security-devices": "Devices that remember your password",
  })[detail] || "Sign in & security";
}

function visibilityDetailTitle(detail) {
  return ({
    "visibility-profile-viewer": "Visibility when viewing other profiles",
    "visibility-public-profile": "Public profile settings",
    "visibility-email": "Email visibility",
    "visibility-birthday": "Birthday visibility",
    "visibility-connections": "Connection visibility",
    "visibility-follow": "Follow visibility",
    "visibility-last-name": "Last name visibility",
    "visibility-represent-content": "Represent your name and interests on content",
    "visibility-off-platform": "Off-CareerLink visibility",
    "visibility-discover-email": "Discoverability by email",
    "visibility-discover-phone": "Discoverability by phone number",
    "visibility-blocked-members": "Blocked members",
    "visibility-active-status": "Manage active status",
    "visibility-profile-updates": "Share profile updates",
    "visibility-news": "Notify connections when you're in the news",
    "visibility-mentions": "Mentions, tags, and collaborations",
    "visibility-followers": "Followers",
  })[detail] || "Visibility";
}

function visibilitySummary(value) {
  return ({
    "name-headline": "Your name and headline",
    "private-characteristics": "Private profile characteristics",
    private: "Only visible to me",
    connections: "1st degree connections",
    network: "1st and 2nd degree connections",
    public: "Anyone on CareerLink",
    initial: "First initial of last name",
    nobody: "No one",
    "second-degree": "2nd-degree connections",
  })[value] || value;
}

function VisibilityChoice({ t, value, options, description, onChange }) {
  return (
    <div className="mt-4">
      {description && <p className="mb-4 text-sm leading-6 text-muted-ink">{description}</p>}
      <div className="space-y-1">
        {options.map(([optionValue, label]) => (
          <RadioOption key={optionValue} label={t(label)} checked={value === optionValue} onChange={() => value !== optionValue && onChange(optionValue)} />
        ))}
      </div>
    </div>
  );
}

function PrivacyChoice({ t, value, options, onChange, disabled = false }) {
  return (
    <div className="mt-4 space-y-1">
      {options.map(([optionValue, label]) => (
        <RadioOption
          key={optionValue}
          label={t(label)}
          checked={value === optionValue}
          disabled={disabled}
          onChange={() => value !== optionValue && onChange(optionValue)}
        />
      ))}
    </div>
  );
}

function SecurityOverviewRow({ icon: Icon, title, description, summary, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-gray-50">
      <Icon size={20} className="shrink-0 text-brand" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-ink">{description}</span></span>
      <span className="hidden max-w-[220px] truncate text-sm text-muted-ink sm:block">{summary}</span>
      <span aria-hidden="true" className="text-2xl leading-none text-gray-500">→</span>
    </button>
  );
}

function SecurityCodeEntry({ t, code, setCode, busy, onConfirm }) {
  return (
    <div className="mt-5 max-w-lg rounded-lg bg-gray-50 p-4">
      <p className="text-sm font-medium text-ink">{t("Enter the 6-digit code sent to your account email.")}</p>
      <label className="mt-3 block text-sm font-medium text-ink">{t("Verification code")}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={inputClass} /></label>
      <button type="button" disabled={busy || code.length !== 6} onClick={onConfirm} className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? t("Confirming…") : t("Confirm")}</button>
    </div>
  );
}

function SecurityDeviceRow({ session, t, onAction, busy, rememberedView = false }) {
  const action = rememberedView ? "forget-device" : session.remembered ? "forget-device" : "remember-device";
  const label = action === "forget-device" ? t("Forget device") : t("Remember this device");
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <Monitor size={20} className="shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{session.current ? `${t("This device")} · ${t("Current session")}` : deviceLabel(session.userAgent)}</p>
        <p className="mt-1 break-words text-xs leading-5 text-muted-ink">{session.userAgent || t("Device details unavailable")}</p>
        <p className="text-xs text-muted-ink">{session.ipAddress ? `${t("IP address")}: ${session.ipAddress} · ` : ""}{new Date(session.createdAt).toLocaleString()}</p>
      </div>
      {session.remembered && !rememberedView && <span className="text-xs font-medium text-emerald-700">{t("Remembered")}</span>}
      {session.current && !rememberedView ? (
        <button type="button" disabled={busy} onClick={() => onAction(action, session.sessionId)} className="shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand disabled:opacity-50">{label}</button>
      ) : !session.current || rememberedView ? (
        <button type="button" disabled={busy} onClick={() => onAction(rememberedView ? "forget-device" : "revoke-session", session.sessionId)} className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50">{rememberedView ? t("Forget device") : t("Sign out")}</button>
      ) : null}
    </div>
  );
}

function deviceLabel(userAgent = "") {
  const browser = /Edg\//.test(userAgent) ? "Microsoft Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Google Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const os = /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Linux/.test(userAgent) ? "Linux" : "";
  return [browser, os].filter(Boolean).join(" on ");
}

function RadioOption({ label, checked, onChange, disabled = false }) {
  return (
    <label className={`flex items-center gap-3 py-2.5 text-sm ${disabled ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700"}`}>
      <input type="radio" checked={checked} onChange={onChange} disabled={disabled} className="h-5 w-5 accent-emerald-700" />
      {label}
    </label>
  );
}

function SettingSwitch({ icon: Icon, label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="flex min-w-0 items-start gap-3">
        {Icon && <Icon size={17} className="mt-0.5 shrink-0 text-brand" />}
        <span>
          <span className="block text-sm font-medium text-ink">{label}</span>
          {description && <span className="mt-1 block text-xs leading-5 text-muted-ink">{description}</span>}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-wait disabled:opacity-60 ${checked ? "bg-brand" : "bg-gray-300"}`}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`}>
          {checked && <Check size={12} className="m-1 text-brand" />}
        </span>
      </button>
    </div>
  );
}

function PrivacySelect({ label, value, onChange, t }) {
  return <label className="text-sm font-medium text-ink">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="public">{t("Everyone")}</option><option value="connections">{t("Connections")}</option><option value="private">{t("Only me")}</option></select></label>;
}
