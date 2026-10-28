import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema({
  company: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  position: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  employmentType: {
    type: String,
    trim: true,
    maxlength: 40,
  },
  location: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  locationType: {
    type: String,
    enum: ["On-site", "Hybrid", "Remote", ""],
    default: "",
  },
  startDate: Date,
  endDate: Date,
  currentlyWorking: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
});

const educationSchema = new mongoose.Schema({
  school: {
    type: String,
    trim: true,
    maxlength: 140,
  },
  degree: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  fieldOfStudy: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  startDate: Date,
  endDate: Date,
  currentlyStudying: {
    type: Boolean,
    default: false,
  },
  grade: {
    type: String,
    trim: true,
    maxlength: 80,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
});

const notificationPreferencesSchema = new mongoose.Schema(
  {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    connectionNotifications: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true },
    messageEmailNotifications: { type: Boolean, default: true },
    messageEmailFrequency: {
      type: String,
      enum: ["individual", "weekly", "recommended"],
      default: "individual",
    },
    groupNotificationsEnabled: { type: Boolean, default: true },
    groupInvitationsInApp: { type: Boolean, default: true },
    groupInvitationsEmail: { type: Boolean, default: true },
    groupInvitationsEmailFrequency: {
      type: String,
      enum: ["individual", "weekly", "recommended"],
      default: "recommended",
    },
    groupUpdatesInApp: { type: Boolean, default: true },
    groupUpdatesEmail: { type: Boolean, default: true },
    messagingGroupsWeeklySummaryLastSentAt: { type: Date, default: Date.now },
    eventNotificationsEnabled: { type: Boolean, default: true },
    eventInvitationsInApp: { type: Boolean, default: true },
    eventInvitationsEmail: { type: Boolean, default: true },
    eventRemindersInApp: { type: Boolean, default: true },
    eventRemindersEmail: { type: Boolean, default: true },
    eventAttendeeUpdatesInApp: { type: Boolean, default: true },
    eventAttendeeUpdatesEmail: { type: Boolean, default: true },
    eventSpeakerInvitationsInApp: { type: Boolean, default: true },
    eventSpeakerInvitationsEmail: { type: Boolean, default: true },
    eventOrganizerUpdatesInApp: { type: Boolean, default: true },
    eventOrganizerUpdatesEmail: { type: Boolean, default: true },
    profileUpdatesEnabled: { type: Boolean, default: true },
    profileRecommendationsInApp: { type: Boolean, default: true },
    profileRecommendationsEmail: { type: Boolean, default: true },
    jobRecommendationsInApp: { type: Boolean, default: true },
    jobRecommendationsEmail: { type: Boolean, default: true },
    searchAppearancesInApp: { type: Boolean, default: true },
    searchAppearancesEmail: { type: Boolean, default: true },
    connectionRecommendationsInApp: { type: Boolean, default: true },
    connectionRecommendationsEmail: { type: Boolean, default: true },
    followRecommendationsInApp: { type: Boolean, default: true },
    followRecommendationsEmail: { type: Boolean, default: true },
    suggestedPostsInApp: { type: Boolean, default: true },
    suggestedPostsEmail: { type: Boolean, default: true },
    trendingConversationsInApp: { type: Boolean, default: true },
    trendingConversationsEmail: { type: Boolean, default: true },
    postRemindersInApp: { type: Boolean, default: true },
    postRemindersEmail: { type: Boolean, default: true },
    unreadMessageRemindersInApp: { type: Boolean, default: true },
    unreadMessageRemindersEmail: { type: Boolean, default: true },
    inmailNotificationsInApp: { type: Boolean, default: true },
    inmailNotificationsEmail: { type: Boolean, default: true },
    inmailRemindersInApp: { type: Boolean, default: true },
    inmailRemindersEmail: { type: Boolean, default: true },
    groupRecommendationsInApp: { type: Boolean, default: true },
    groupRecommendationsEmail: { type: Boolean, default: true },
    eventRecommendationsInApp: { type: Boolean, default: true },
    eventRecommendationsEmail: { type: Boolean, default: true },
    jobAlerts: { type: Boolean, default: true },
    jobSearchNotificationsEnabled: { type: Boolean, default: true },
    jobAlertEmailNotifications: { type: Boolean, default: true },
    savedJobEmailNotifications: { type: Boolean, default: true },
    applicationUpdateEmailNotifications: { type: Boolean, default: true },
    hiringNotificationsEnabled: { type: Boolean, default: true },
    hiringJobPostUpdatesInApp: { type: Boolean, default: true },
    hiringJobPostUpdatesEmail: { type: Boolean, default: true },
    hiringCandidateMessagesInApp: { type: Boolean, default: true },
    hiringCandidateMessagesEmail: { type: Boolean, default: true },
    connectionInvitationsInApp: { type: Boolean, default: true },
    connectionInvitationsEmail: { type: Boolean, default: true },
    networkUpdatesInApp: { type: Boolean, default: true },
    networkUpdatesEmail: { type: Boolean, default: true },
    newFollowersInApp: { type: Boolean, default: true },
    newFollowersEmail: { type: Boolean, default: true },
    followedPeopleUpdatesInApp: { type: Boolean, default: true },
    followedPeopleUpdatesEmail: { type: Boolean, default: true },
    profileViewsInApp: { type: Boolean, default: true },
    profileViewsEmail: { type: Boolean, default: true },
    networkCatchupEnabled: { type: Boolean, default: true },
    networkJobChangesInApp: { type: Boolean, default: true },
    networkHiringInApp: { type: Boolean, default: true },
    networkWorkAnniversariesInApp: { type: Boolean, default: true },
    networkEducationInApp: { type: Boolean, default: true },
    networkBirthdaysInApp: { type: Boolean, default: true },
    networkBirthdaysEmail: { type: Boolean, default: true },
    networkWeeklySummaryEmail: { type: Boolean, default: true },
    networkWeeklySummaryLastSentAt: { type: Date, default: Date.now },
    postingNotificationsEnabled: { type: Boolean, default: true },
    postCommentsReactionsInApp: { type: Boolean, default: true },
    postCommentsReactionsEmail: { type: Boolean, default: true },
    postCommentsReactionsEmailFrequency: {
      type: String,
      enum: ["individual", "weekly", "recommended"],
      default: "recommended",
    },
    postSharesInApp: { type: Boolean, default: true },
    postSharesEmail: { type: Boolean, default: true },
    postMentionsInApp: { type: Boolean, default: true },
    postMentionsEmail: { type: Boolean, default: true },
    postMentionsEmailFrequency: {
      type: String,
      enum: ["individual", "weekly", "recommended"],
      default: "individual",
    },
    postNewslettersInApp: { type: Boolean, default: true },
    postNewslettersEmail: { type: Boolean, default: true },
    postActivityWeeklySummaryLastSentAt: { type: Date, default: Date.now },
    hiddenNotificationTypes: {
      type: [{ type: String, enum: ["post_like", "post_comment", "connection_request", "connection_accepted", "new_follower", "profile_view", "message", "hiring_candidate_message", "job_alert", "saved_job_update", "job_application", "job_application_status", "job_invite", "mention", "group_post", "group_invitation", "event_invitation", "event_reminder", "event_attendee_update", "event_speaker_invitation", "event_organizer_update", "profile_recommendation", "job_recommendation", "search_appearance", "connection_recommendation", "follow_recommendation", "birthday", "suggested_post", "trending_conversation", "post_reminder", "unread_message_reminder", "inmail_message", "inmail_reminder", "group_recommendation", "event_recommendation", "followed_post", "network_job_change", "network_hiring", "network_work_anniversary", "network_education"] }],
      default: [],
    },
    mutedSenders: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { _id: false },
);

const dataPrivacyPreferencesSchema = new mongoose.Schema(
  {
    connectionInvitationAudience: {
      type: String,
      enum: ["everyone", "network"],
      default: "everyone",
    },
    allowNetworkInvitations: { type: Boolean, default: true },
    allowMessageRequests: { type: Boolean, default: true },
    allowRecruiterJobInvites: { type: Boolean, default: true },
    messageReadReceipts: { type: Boolean, default: true },
    signalRecruiterInterest: { type: Boolean, default: true },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  url: { type: String, trim: true, maxlength: 500, default: "" },
  skills: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
  projectDuration: { type: String, trim: true, maxlength: 80, default: "" },
});

const languageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  proficiency: {
    type: String,
    enum: ["Basic", "Conversational", "Professional working", "Full professional", "Native or bilingual"],
    default: "Conversational",
  },
});

const openToWorkSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  titles: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  locationTypes: { type: [{ type: String, enum: ["On-site", "Hybrid", "Remote"] }], default: [] },
  locations: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  employmentTypes: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
  visibility: { type: String, enum: ["everyone", "recruiters", "only-me"], default: "everyone" },
  startDate: { type: String, enum: ["immediately", "flexible"], default: "immediately" },
  noticePeriod: { type: String, trim: true, maxlength: 60, default: "" },
  salary: { type: String, trim: true, maxlength: 100, default: "" },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    birthDate: { type: Date, default: null },
    birthdayVisibility: {
      type: String,
      enum: ["private", "connections", "everyone"],
      default: "private",
    },

    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    password: {
      type: String,
      required() {
        return !this.googleId;
      },
      minlength: 6,
    },

    googleId: {
      type: String,
      default: "",
      index: {
        sparse: true,
      },
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
    securityEmails: {
      type: [{
        email: { type: String, required: true, lowercase: true, trim: true },
        verified: { type: Boolean, default: false },
        addedAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
    securityPhoneNumbers: {
      type: [{
        number: { type: String, required: true, trim: true, maxlength: 30 },
        confirmedByEmail: { type: Boolean, default: false },
        addedAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
    securitySessions: {
      type: [{
        sessionId: { type: String, required: true },
        userAgent: { type: String, default: "", maxlength: 500 },
        ipAddress: { type: String, default: "", maxlength: 80 },
        remembered: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
    securityCodeChallenge: {
      action: { type: String, default: "" },
      value: { type: String, default: "" },
      codeHash: { type: String, default: "" },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      verifiedAt: { type: Date, default: null },
    },
    securityCodeLastSentAt: { type: Date, default: null },
    enforceTrackedSessions: { type: Boolean, default: false },
    accountStatus: {
      type: String,
      enum: ["active", "deactivated"],
      default: "active",
      index: true,
    },
    profileVisibility: {
      type: String,
      enum: ["public", "connections", "private"],
      default: "public",
    },
    contactInfoVisibility: {
      type: String,
      enum: ["public", "connections", "private"],
      default: "public",
    },
    activityVisibility: {
      type: String,
      enum: ["public", "connections", "private"],
      default: "public",
    },
    profileViewerVisibility: {
      type: String,
      enum: ["name-headline", "private-characteristics", "private"],
      default: "name-headline",
    },
    publicProfileEnabled: { type: Boolean, default: true },
    publicProfileFields: {
      profilePhoto: { type: Boolean, default: true },
      backgroundPhoto: { type: Boolean, default: true },
      headline: { type: Boolean, default: false },
      summary: { type: Boolean, default: false },
      activity: { type: Boolean, default: true },
      education: { type: Boolean, default: false },
      projects: { type: Boolean, default: true },
      languages: { type: Boolean, default: true },
      publicVisibilityLimits: { type: Boolean, default: true },
    },
    emailVisibility: {
      type: String,
      enum: ["private", "connections", "network", "public"],
      default: "private",
    },
    connectionVisibility: { type: Boolean, default: true },
    followVisibility: {
      type: String,
      enum: ["private", "public"],
      default: "public",
    },
    lastNameVisibility: {
      type: String,
      enum: ["full", "initial"],
      default: "full",
    },
    representOnContent: { type: Boolean, default: true },
    offPlatformVisibility: { type: Boolean, default: true },
    discoverabilityEmail: {
      type: String,
      enum: ["connections", "network", "public"],
      default: "public",
    },
    discoverabilityPhone: {
      type: String,
      enum: ["nobody", "second-degree", "public"],
      default: "public",
    },
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    activeStatusVisibility: {
      type: String,
      enum: ["nobody", "connections", "public"],
      default: "nobody",
    },
    shareProfileUpdates: { type: Boolean, default: false },
    notifyNetworkInNews: { type: Boolean, default: true },
    allowMentionsTagsCollabs: { type: Boolean, default: true },
    followerVisibility: {
      type: String,
      enum: ["public", "connections"],
      default: "public",
    },
    followPrimary: { type: Boolean, default: false },
    preferredLanguage: {
      type: String,
      enum: ["en", "hi"],
      default: "en",
    },
    genderIdentity: { type: String, trim: true, maxlength: 80, default: "" },
    disabilityStatus: {
      type: String,
      enum: ["", "yes", "no", "prefer-not-to-say"],
      default: "",
    },
    contentLanguage: { type: String, enum: ["en", "hi"], default: "en" },
    excludedContentLanguages: {
      type: [{ type: String, enum: ["en", "hi"] }],
      default: [],
    },
    profilePhotoVisibility: {
      type: String,
      enum: ["none", "connections", "network", "all"],
      default: "all",
    },
    preferredFeedView: {
      type: String,
      enum: ["relevant", "recent"],
      default: "relevant",
    },

    passwordResetTokenHash: {
      type: String,
      default: "",
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
    },

    headline: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    city: { type: String, trim: true, maxlength: 80, default: "" },
    country: { type: String, trim: true, maxlength: 80, default: "" },
    additionalName: { type: String, trim: true, maxlength: 80, default: "" },
    pronouns: { type: String, trim: true, maxlength: 40, default: "" },
    industry: { type: String, trim: true, maxlength: 120, default: "" },
    introEducation: { type: String, trim: true, maxlength: 140, default: "" },

    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    contactWebsite: { type: String, trim: true, maxlength: 500, default: "" },
    resumes: {
      type: [{
        name: { type: String, required: true, trim: true, maxlength: 180 },
        publicId: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true, min: 1 },
        uploadedAt: { type: Date, default: Date.now },
      }],
      default: [],
      validate: { validator: (items) => items.length <= 5, message: "You can save up to 5 resumes" },
    },
    profileLanguage: { type: String, trim: true, maxlength: 40, default: "English" },
    publicProfileSlug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 40,
      match: [/^[a-z0-9-]*$/, "Public profile URL can contain only letters, numbers and hyphens"],
      default: "",
    },
    openToWork: { type: openToWorkSchema, default: () => ({}) },
    projects: {
      type: [projectSchema],
      default: [],
      validate: { validator: (items) => items.length <= 30, message: "A profile can include up to 30 projects" },
    },
    languages: {
      type: [languageSchema],
      default: [],
      validate: { validator: (items) => items.length <= 30, message: "A profile can include up to 30 languages" },
    },

    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    dataPrivacyPreferences: {
      type: dataPrivacyPreferencesSchema,
      default: () => ({}),
    },

    profilePicture: {
      type: String,
      default: "",
    },
    profileFrame: {
      type: String,
      enum: ["", "open-to-work", "hiring"],
      default: "",
    },

    profilePicturePublicId: {
      type: String,
      default: "",
    },

    coverPicture: {
      type: String,
      default: "",
    },

    coverPicturePublicId: {
      type: String,
      default: "",
    },

    skills: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 60,
        },
      ],
      default: [],
      validate: {
        validator: (skills) => skills.length <= 50,
        message: "A profile can include up to 50 skills",
      },
    },

    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    }],
    unfollowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    }],

    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    }],

    profileViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    postImpressions: {
      type: Number,
      default: 0,
      min: 0,
    },

    searchAppearances: { type: Number, default: 0, min: 0 },

    savedPosts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: [],
    }],
    savedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      default: [],
    }],

    experience: {
      type: [experienceSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 25,
        message: "A profile can include up to 25 experience entries",
      },
    },

    education: {
      type: [educationSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 25,
        message: "A profile can include up to 25 education entries",
      },
    },
  },

  {
    timestamps: true,
  },
);

userSchema.index({ name: 1 });
userSchema.index({ headline: 1 });
userSchema.index({ location: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index(
  { publicProfileSlug: 1 },
  { unique: true, partialFilterExpression: { publicProfileSlug: { $type: "string", $gt: "" } } },
);

const User = mongoose.model("User", userSchema);

export default User;
