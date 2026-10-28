import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";
import Feed from "../pages/Feed.jsx";
import PublicHome from "../pages/PublicHome.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { ProtectedAuth } from "./ProtectedRoute.jsx";
import MainLayout from "../components/layout/MainLayout.jsx";
import Profile from "../pages/Profile.jsx";
import Network from "../pages/Network.jsx";
import DiscoverPages from "../pages/DiscoverPages.jsx";
import Search from "../pages/Search.jsx";
import Notifications from "../pages/Notifications.jsx";
import Messages from "../pages/Messages.jsx";
import GoogleOAuthCallback from "../pages/GoogleOAuthCallback.jsx";
import ArticleFormPage from "../pages/ArticleFormPage.jsx";
import ArticleDetailPage from "../pages/ArticleDetailPage.jsx";
import SavedPostsPage from "../pages/SavedPosts.jsx";
import Jobs from "../pages/Jobs.jsx";
import JobTracker from "../pages/JobTracker.jsx";
import Groups from "../pages/Groups.jsx";
import GroupDetail from "../pages/GroupDetail.jsx";
import GroupManagement from "../pages/GroupManagement.jsx";
import GroupPostAnalytics from "../pages/GroupPostAnalytics.jsx";
import Events from "../pages/Events.jsx";
import EventDetail from "../pages/EventDetail.jsx";
import Newsletters from "../pages/Newsletters.jsx";
import Settings from "../pages/Settings.jsx";
import JobApplicants from "../pages/JobApplicants.jsx";
import ProfilePageLayout from "../components/layout/ProfilePageLayout.jsx";
import ProfileAnalyticsDashboard from "../pages/ProfileAnalyticsDashboard.jsx";
import MyActivity from "../pages/MyActivity.jsx";
import RecentActivity from "../pages/RecentActivity.jsx";
import JobPostingAccount from "../pages/JobPostingAccount.jsx";
import JobManagement from "../pages/JobManagement.jsx";
import CandidateJobView from "../pages/CandidateJobView.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/oauth/google/callback" element={<GoogleOAuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/profile/:userId" element={<ProfilePageLayout />}>
        <Route index element={<Profile />} />
        <Route path="recent-activity/:tab?" element={<RecentActivity />} />
      </Route>
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
    </Routes>
  );
}
