import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getUserById } from "../services/userServices.js";
import useAuth from "../hooks/useAuth.js";

import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileAbout from "../components/profile/ProfileAbout";
import ProfileExperience from "../components/profile/ProfileExperience";
import ProfileEducation from "../components/profile/ProfileEducation";
import ProfileSkills from "../components/profile/ProfileSkills";
import ProfileProjects from "../components/profile/ProfileProjects.jsx";
import ProfileLanguages from "../components/profile/ProfileLanguages.jsx";
import ProfileOpenToWork from "../components/profile/ProfileOpenToWork.jsx";
import ProfileAnalytics from "../components/profile/ProfileAnalytics.jsx";
import ProfileActivity from "../components/profile/ProfileActivity.jsx";
import ProfileSettingsCard from "../components/profile/ProfileSettingsCard.jsx";
import ProfileDiscovery from "../components/profile/ProfileDiscovery.jsx";
import ProfileSuggestions from "../components/profile/ProfileSuggestions.jsx";
import ProfileNewsletterSuggestions from "../components/profile/ProfileNewsletterSuggestions.jsx";
import ProfileViewers from "../components/profile/ProfileViewers.jsx";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { user: authUser, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openWorkRequested, setOpenWorkRequested] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const userData = await getUserById(userId);
      setUser(userData);
    } catch (error) {
      console.error(error);

      if (error.response?.status === 401) {
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const addExperienceRequested =
    new URLSearchParams(location.search).get("addExperience") === "true";
  const handleAddExperienceRequestHandled = useCallback(() => {
    navigate(`/profile/${user?._id}#experience`, { replace: true });
  }, [navigate, user?._id]);

  if (loading) {
    return <div className="min-h-screen bg-[#f3f2ef] px-4 py-8"><div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.92fr)]"><div className="space-y-4"><div className="h-64 animate-pulse rounded-2xl bg-white" /><div className="h-40 animate-pulse rounded-2xl bg-white" /><div className="h-56 animate-pulse rounded-2xl bg-white" /></div><div className="hidden space-y-4 lg:block"><div className="h-40 animate-pulse rounded-2xl bg-white" /><div className="h-72 animate-pulse rounded-2xl bg-white" /></div></div></div>;
  }

  if (!user) {
    return <div className="grid min-h-[60vh] place-items-center bg-[#f3f2ef] px-4"><div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold text-ink">We couldn’t find that profile</h1><p className="mt-2 text-sm text-muted-ink">The profile may have moved or is no longer available.</p><button type="button" onClick={() => navigate(-1)} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Go back</button></div></div>;
  }

  const isMe = Boolean(authUser?._id && user?._id && authUser._id === user._id);
  const canViewActivity = isMe || user.activityVisibility === "public"
    || (user.activityVisibility === "connections" && user.viewerIsConnection);
  const publicFields = user.publicProfileFields || {};
  const canShowPublicField = (field) => isMe || authUser || publicFields[field] !== false;

  const mergeProfileUser = (updates) => {
    setUser((prev) => ({
      ...prev,
      ...updates,
    }));

    if (isMe) {
      updateUser(updates);
    }
  };

  const jumpToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-3 py-5 sm:px-5">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.92fr)] lg:gap-5">
        <main className="min-w-0 space-y-4">
          <ProfileHeader
            user={user}
            isMe={isMe}
            authUserId={authUser?._id}
            onProfileImageUpload={(imageUrl) => mergeProfileUser({ profilePicture: imageUrl })}
            onCoverImageUpload={(imageUrl) => mergeProfileUser({ coverPicture: imageUrl })}
            onProfileUpdate={(updatedUser) => {
              setUser(updatedUser);
              if (isMe) updateUser(updatedUser);
            }}
            onOpenToWork={() => setOpenWorkRequested(true)}
            onAddSection={jumpToSection}
            onEnhanceProfile={() => jumpToSection("profile-suggestions")}
          />
          <ProfileOpenToWork
            value={user.openToWork}
            isMe={isMe}
            openEditor={openWorkRequested}
            onEditorHandled={() => setOpenWorkRequested(false)}
            onSaved={(openToWork) => mergeProfileUser({ openToWork })}
          />
          <div id="profile-suggestions" className="scroll-mt-24"><ProfileSuggestions user={user} isMe={isMe} /></div>
          <ProfileAnalytics user={user} isMe={isMe} />
          {canShowPublicField("summary") && <ProfileAbout
            bio={user.bio}
            isMe={isMe}
            onSaved={(bio) => setUser((prev) => ({ ...prev, bio }))}
          />}
          {canViewActivity && canShowPublicField("activity") && <ProfileActivity user={user} />}
          <ProfileExperience
            items={user.experience || []}
            isMe={isMe}
            addExperienceRequested={addExperienceRequested}
            onAddExperienceRequestHandled={handleAddExperienceRequestHandled}
            onExperienceUpdate={(experience) => setUser((prev) => ({ ...prev, experience }))}
          />
          {canShowPublicField("education") && <ProfileEducation
            items={user.education || []}
            isMe={isMe}
            onEducationUpdate={(education) => setUser((prev) => ({ ...prev, education }))}
          />}
          {canShowPublicField("projects") && <ProfileProjects
            items={user.projects || []}
            isMe={isMe}
            onSaved={(projects) => mergeProfileUser({ projects })}
          />}
          <ProfileSkills
            items={user.skills || []}
            isMe={isMe}
            onSaved={(skills) => setUser((prev) => ({ ...prev, skills }))}
          />
          {canShowPublicField("languages") && <ProfileLanguages
            items={user.languages || []}
            isMe={isMe}
            onSaved={(languages) => mergeProfileUser({ languages })}
          />}
        </main>
        <aside className="space-y-4 lg:sticky lg:top-20">
          {isMe && <ProfileSettingsCard user={user} onSaved={(updatedUser) => {
            setUser(updatedUser);
            updateUser(updatedUser);
          }} />}
          {isMe && <ProfileViewers />}
          {authUser?._id && <>
            <ProfileNewsletterSuggestions />
            <ProfileDiscovery />
            <ProfileDiscovery profileId={user._id} related />
          </>}
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-xs leading-5 text-muted-ink">
            <p className="font-semibold text-gray-700">A stronger profile, your way</p>
            <p className="mt-1">Keep your information current and share only the details you want people to see.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Profile;
