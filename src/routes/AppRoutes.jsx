import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, ProtectedAuth } from "./ProtectedRoute.jsx";
import MainLayout from "../components/layout/MainLayout.jsx";

const Login = lazy(() => import("../pages/Login.jsx"));
const Register = lazy(() => import("../pages/Register.jsx"));
const ResetPassword = lazy(() => import("../pages/ResetPassword.jsx"));
const Feed = lazy(() => import("../pages/Feed.jsx"));
const PublicHome = lazy(() => import("../pages/PublicHome.jsx"));
const Profile = lazy(() => import("../pages/Profile.jsx"));
const Network = lazy(() => import("../pages/Network.jsx"));
const DiscoverPages = lazy(() => import("../pages/DiscoverPages.jsx"));
const Search = lazy(() => import("../pages/Search.jsx"));
const Notifications = lazy(() => import("../pages/Notifications.jsx"));
const Messages = lazy(() => import("../pages/Messages.jsx"));
const GoogleOAuthCallback = lazy(() => import("../pages/GoogleOAuthCallback.jsx"));
const ArticleFormPage = lazy(() => import("../pages/ArticleFormPage.jsx"));
const ArticleDetailPage = lazy(() => import("../pages/ArticleDetailPage.jsx"));
const SavedPostsPage = lazy(() => import("../pages/SavedPosts.jsx"));
const Jobs = lazy(() => import("../pages/Jobs.jsx"));
const JobTracker = lazy(() => import("../pages/JobTracker.jsx"));
const Groups = lazy(() => import("../pages/Groups.jsx"));
const GroupDetail = lazy(() => import("../pages/GroupDetail.jsx"));
const GroupManagement = lazy(() => import("../pages/GroupManagement.jsx"));
const GroupPostAnalytics = lazy(() => import("../pages/GroupPostAnalytics.jsx"));
const Events = lazy(() => import("../pages/Events.jsx"));
const EventDetail = lazy(() => import("../pages/EventDetail.jsx"));
const Newsletters = lazy(() => import("../pages/Newsletters.jsx"));
const Settings = lazy(() => import("../pages/Settings.jsx"));
const JobApplicants = lazy(() => import("../pages/JobApplicants.jsx"));
const ProfilePageLayout = lazy(() => import("../components/layout/ProfilePageLayout.jsx"));
const ProfileAnalyticsDashboard = lazy(() => import("../pages/ProfileAnalyticsDashboard.jsx"));
const MyActivity = lazy(() => import("../pages/MyActivity.jsx"));
const RecentActivity = lazy(() => import("../pages/RecentActivity.jsx"));
const JobPostingAccount = lazy(() => import("../pages/JobPostingAccount.jsx"));
const JobManagement = lazy(() => import("../pages/JobManagement.jsx"));
const CandidateJobView = lazy(() => import("../pages/CandidateJobView.jsx"));
const CompanyPageCreate = lazy(() => import("../pages/CompanyPageCreate.jsx"));
const CompanyPageAdmin = lazy(() => import("../pages/CompanyPageAdmin.jsx"));
const CompanyPageMember = lazy(() => import("../pages/CompanyPageMember.jsx"));
const CompanyPageDiscover = lazy(() => import("../pages/CompanyPageDiscover.jsx"));
const NotFound = lazy(() => import("../pages/NotFound.jsx"));
const ModerationReports = lazy(() => import("../pages/ModerationReports.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/oauth/google/callback" element={<GoogleOAuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile/:userId" element={<ProfilePageLayout />}>
          <Route index element={<Profile />} />
          <Route path="recent-activity/:tab?" element={<RecentActivity />} />
        </Route>
        <Route path="/company/:publicUrlSlug" element={<CompanyPageMember />} />
        <Route element={<ProtectedAuth />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/feed" element={<Feed />} />
            <Route path="/activity" element={<MyActivity />} />
            <Route path="/network" element={<Network />} />
            <Route path="/network/connections" element={<Network variant="connections" />} />
            <Route
              path="/network/connections/filters"
              element={<Network variant="connection-filters" />}
            />
            <Route path="/network/invitations" element={<Network variant="invitations" />} />
            <Route path="/network/following" element={<Network variant="following" />} />
            <Route path="/network/pages" element={<Network variant="pages" />} />
            <Route path="/network/pages/discover" element={<DiscoverPages />} />
            <Route path="/company-pages/create" element={<CompanyPageCreate />} />
            <Route path="/company-pages/discover" element={<CompanyPageDiscover />} />
            <Route path="/company-pages/:companyPageId/manage" element={<CompanyPageAdmin />} />
            <Route path="/saved" element={<SavedPostsPage />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/manage" element={<JobPostingAccount />} />
            <Route path="/jobs/manage/:jobId" element={<JobManagement />} />
            <Route path="/jobs/view/:jobId" element={<CandidateJobView />} />
            <Route path="/jobs/tracker" element={<JobTracker />} />
            <Route path="/jobs/applications" element={<JobApplicants />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId/manage" element={<GroupManagement />} />
            <Route path="/groups/:groupId/posts/:postId/analytics" element={<GroupPostAnalytics />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/newsletters" element={<Newsletters />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/moderation/reports" element={<ModerationReports />} />
            <Route path="/dashboard" element={<ProfileAnalyticsDashboard />} />
            <Route path="/dashboard/content" element={<ProfileAnalyticsDashboard />} />
            <Route path="/dashboard/audience" element={<ProfileAnalyticsDashboard />} />
            <Route path="/dashboard/profile-views" element={<ProfileAnalyticsDashboard />} />
            <Route path="/dashboard/search-appearances" element={<ProfileAnalyticsDashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Messages />} />
            <Route path="/messaging" element={<Navigate to="/messages" replace />} />
            <Route path="/articles/new" element={<ArticleFormPage />} />
            <Route path="/articles/:articleId/edit" element={<ArticleFormPage />} />
            <Route path="/articles/:articleId" element={<ArticleDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function RouteLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-sm text-muted-ink" role="status">
      Loading CareerLink…
    </main>
  );
}
