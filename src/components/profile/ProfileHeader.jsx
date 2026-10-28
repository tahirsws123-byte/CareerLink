import Card from "../layout/Card";
import Avatar from "../layout/Avatar";
import { Link } from "react-router-dom";
import { BadgeCheck, BriefcaseBusiness, ChevronDown, Copy, GraduationCap, MapPin, Plus, ShieldBan, Sparkles, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import {
  removeCoverImage,
  removeProfileImage,
  uploadCoverImage,
  uploadProfileImage,
} from "../../services/userServices.js";
import ProfileImageModal from "./ProfileImageModal";
import ProfileImageViewer from "./ProfileImageViewer";
import DeleteConfirmationModal from "./DeleteConfirmationModal.jsx";
import EditProfileModal from "./EditProfileModal.jsx";
import CoverImageModal from "./CoverImageModal.jsx";
import CoverImageViewer from "./CoverImageViewer.jsx";
import ConnectionActionButton from "../network/ConnectionActionButton.jsx";
import ProfileContactModal from "./ProfileContactModal.jsx";
import ProfileFramesModal from "./ProfileFramesModal.jsx";
import ProfileFrameBadge from "./ProfileFrameBadge.jsx";
import { blockMember, toggleFollowUser, updateProfile } from "../../services/userServices.js";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth.js";

const ProfileHeader = ({
  user,
  isMe,
  authUserId,
  onProfileImageUpload,
  onCoverImageUpload,
  onProfileUpdate,
  onOpenToWork,
  onAddSection,
  onEnhanceProfile,
}) => {
  const { user: viewer } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [framesOpen, setFramesOpen] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(user.profileFrame || "");
  const [frameSaving, setFrameSaving] = useState(false);
  const [openViewer, setOpenViewer] = useState(false);
  const [showDeleteModal, setShowDeleteModel] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [openCoverModal, setOpenCoverModal] = useState(false);
  const fileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [showCoverDeleteModal, setShowCoverDeleteModal] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [openCoverViewer, setOpenCoverViewer] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const isViewer = Boolean(viewer?._id && viewer._id === user?._id);
  const photoVisibility = viewer?.profilePhotoVisibility || "all";
  const canShowProfilePhoto = isViewer
    || photoVisibility === "all"
    || (photoVisibility === "connections"
      && (user.viewerIsConnection || user.connectionStatus?.status === "connected"))
    || (photoVisibility === "network"
      && (user.viewerIsConnection || user.connectionStatus?.status === "connected" || user.isFollowing));

  const handleRemoveCover = async () => {
    try {
      setRemovingCover(true);

      await removeCoverImage();

      onCoverImageUpload("");

      setShowCoverDeleteModal(false);
    } catch (error) {
      console.error(error);
    } finally {
      setRemovingCover(false);
    }
  };

  const handleImageClick = () => {
    if (isMe) {
      setOpenModal(true);
    } else if (user.profilePicture) {
      setOpenViewer(true);
    }
  };

  const applyProfileFrame = async () => {
    try {
      setFrameSaving(true);
      const { user: updatedUser } = await updateProfile({ profileFrame: selectedFrame });
      onProfileUpdate(updatedUser);
      setFramesOpen(false);
      toast.success(selectedFrame ? "Profile frame applied" : "Profile frame removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile frame");
    } finally {
      setFrameSaving(false);
    }
  };

  const handleCoverClick = () => {
    if (isMe) {
      setOpenCoverModal(true);
    } else if (user.coverPicture) {
      setOpenCoverViewer(true);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setRemoving(true);
      await removeProfileImage();
      onProfileImageUpload("");
      setShowDeleteModel(false);
    } catch (error) {
      console.error(error);
    } finally {
      setRemoving(false);
    }
  };

  const handleUploadClick = () => {
    setOpenModal(false);
    fileInputRef.current.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG and WEBP images are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Image size must be less than 5 MB.");
      return;
    }

    try {
      setUploading(true);
      const data = await uploadProfileImage(file);
      onProfileImageUpload(data.profilePicture);
    } catch (error) {
      console.log(error);
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUploadClick = () => {
    coverFileInputRef.current.click();
  };

  const handleCoverImageChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG and WEBP images are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Image size must be less than 5 MB.");
      return;
    }

    try {
      setCoverUploading(true);

      const data = await uploadCoverImage(file);

      onCoverImageUpload(data.coverPicture);
    } catch (error) {
      console.error(error);
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };
  const copyProfileLink = async () => {
    const link = `${window.location.origin}/profile/${user.publicProfileSlug || user._id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy the profile link");
    }
  };
  const handleBlockMember = async () => {
    try {
      setBlocking(true);
      await blockMember(user._id);
      toast.success("Member blocked");
      window.location.assign("/settings#visibility-blocked-members");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to block member");
      setBlocking(false);
    }
  };
  const handleFollow = async () => {
    try {
      const result = await toggleFollowUser(user._id);
      setFollowing(result.following);
      onProfileUpdate?.({ ...user, isFollowing: result.following });
      toast.success(result.following ? "Following member" : "Unfollowed member");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update follow status");
    }
  };
  return (
    <Card id="profile-header" className="overflow-hidden">
      <div className="h-36 w-full overflow-hidden bg-gradient-to-br from-[#073b43] via-[#087b78] to-[#d2b087] sm:h-52">
        <div className="relative h-full w-full overflow-hidden">
          {user.coverPicture ? (
            <img
              src={user.coverPicture}
              alt={`${user.name}'s cover`}
              onClick={handleCoverClick}
              className="h-full w-full cursor-pointer object-cover transition duration-500 hover:scale-[1.015]"
            />
          ) : (
            <div
              onClick={handleCoverClick}
              className={`relative h-full w-full overflow-hidden ${isMe ? "cursor-pointer" : "cursor-default"} bg-[radial-gradient(ellipse_at_75%_25%,rgba(255,255,255,0.24),transparent_34%),linear-gradient(125deg,#073b43_0%,#087b78_48%,#d2b087_100%)]`}
            >
              <div className="absolute -right-12 -top-28 h-64 w-64 rounded-full border border-white/15 sm:h-80 sm:w-80" />
              <div className="absolute -right-1 -top-16 h-52 w-52 rounded-full border border-white/10 sm:h-64 sm:w-64" />
              <span className="absolute bottom-4 right-5 text-xs font-semibold tracking-[0.24em] text-white/65">CAREERLINK · YOUR NEXT CHAPTER</span>
            </div>
          )}

          {coverUploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">
                Uploading...
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-6 relative">
        <div className="relative z-10 -mt-12 flex h-24 w-24 justify-center sm:-mt-[4.4rem] sm:h-32 sm:w-32 sm:justify-start">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={coverFileInputRef}
            onChange={handleCoverImageChange}
            className="hidden"
          />

          {user.profilePicture && canShowProfilePhoto ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              onClick={handleImageClick}
              className="h-full w-full cursor-pointer rounded-full border-[5px] border-white object-cover shadow-md"
            />
          ) : (
            <div
              onClick={isMe ? handleImageClick : undefined}
              className={`${isMe ? "cursor-pointer" : "cursor-default"}`}
            >
              <Avatar
                initials={user.name?.charAt(0).toUpperCase()}
                color="#0A66C2"
                size={96}
                ring
                className="h-full w-full text-3xl sm:!h-32 sm:!w-32"
              />
            </div>
          )}
          <ProfileFrameBadge frame={user.profileFrame} />
          {uploading && (
            <div className="absolute inset-1 flex items-center justify-center rounded-full bg-black/55">
              <span className="text-sm font-semibold text-white">
                Uploading…
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-5 sm:mt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[30px]">{user.name}{user.additionalName && <span className="ml-1 text-lg font-medium text-gray-600">{user.additionalName}</span>}</h1>
                {user.emailVerified && <span title="Verified email" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800"><BadgeCheck size={14} />Verified</span>}
              </div>
              <p className="mt-1 text-[15px] leading-6 text-gray-700">{user.headline || (isMe ? "Add a headline to introduce your work" : "CareerLink member")}</p>
              {(user.pronouns || user.industry || user.introEducation) && (
                <p className="mt-1 text-sm text-muted-ink">
                  {[user.pronouns, user.industry, user.introEducation].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-ink sm:justify-start">
                {user.location && <span className="inline-flex items-center gap-1"><MapPin size={14} />{user.location}</span>}
                {user.location && <span aria-hidden="true">·</span>}
                <button type="button" onClick={() => setContactOpen(true)} className="font-semibold text-brand hover:underline">Contact info</button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs sm:justify-start">
                <span className="inline-flex items-center gap-1 text-muted-ink"><UserRound size={13} />{user.followersCount ?? user.followers?.length ?? 0} followers</span>
                <span className="text-gray-300">·</span>
                <span className="text-muted-ink">{user.profileLanguage || "English"} profile</span>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
            {isMe ? (
              <>
                <button type="button" onClick={onOpenToWork} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${user.openToWork?.enabled ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-brand text-white hover:bg-brand-hover"}`}>
                  <BriefcaseBusiness size={15} />{user.openToWork?.enabled ? "Open to work" : "Open to"}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenEditProfile(true)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand hover:bg-sky hover:text-brand"
                >
                  Edit
                </button>

                <div className="relative">
                  <button type="button" aria-expanded={sectionMenuOpen} onClick={() => { setSectionMenuOpen((open) => !open); setMoreMenuOpen(false); }} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand hover:bg-sky hover:text-brand"><Plus size={15} />Add section<ChevronDown size={14} /></button>
                  {sectionMenuOpen && <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                    <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-ink">Jump to a profile section</p>
                    {[["experience", "Experience", BriefcaseBusiness], ["education", "Education", GraduationCap], ["projects", "Projects & portfolio", Sparkles], ["skills", "Skills", Sparkles], ["languages", "Languages", Sparkles]].map(([id, label, Icon]) => <button key={id} type="button" onClick={() => { setSectionMenuOpen(false); onAddSection?.(id); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-sky hover:text-brand"><Icon size={16} />{label}<Plus size={14} className="ml-auto" /></button>)}
                  </div>}
                </div>
                <div className="relative">
                  <button type="button" aria-label="More profile actions" aria-expanded={moreMenuOpen} onClick={() => { setMoreMenuOpen((open) => !open); setSectionMenuOpen(false); }} className="grid h-10 w-10 place-items-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"><span className="text-lg leading-none">···</span></button>
                  {moreMenuOpen && <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"><button type="button" onClick={() => { setMoreMenuOpen(false); copyProfileLink(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50"><Copy size={16} />Copy profile link</button><button type="button" onClick={() => { setMoreMenuOpen(false); onEnhanceProfile?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50"><Sparkles size={16} />Enhance profile</button></div>}
                </div>
              </>
            ) : authUserId ? (
              <>
                {user.followPrimary && <button type="button" onClick={handleFollow} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover">{following ? "Following" : "Follow"}</button>}
                <ConnectionActionButton userId={user._id} />
                <button type="button" disabled={blocking} onClick={handleBlockMember} className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><ShieldBan size={14} className="mr-1 inline" />{blocking ? "Blocking…" : "Block"}</button>

                <Link
                  to={`/messages?userId=${user._id}`}
                  className="rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand/10"
                >
                  Message
                </Link>

                {authUserId && (
                  <Link
                    to={`/profile/${authUserId}`}
                    className="rounded-full border border-line px-4 py-1 text-sm font-semibold text-muted-ink hover:bg-black/5"
                  >
                    Back to me
                  </Link>
                )}
              </>
            ) : (
              <Link to="/login" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
                Sign in to connect
              </Link>
            )}
          </div>
          </div>
          {isMe && <button type="button" onClick={onEnhanceProfile} className="flex items-center gap-3 border-t border-gray-100 pt-4 text-left"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"><Sparkles size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Enhance your profile</span><span className="mt-1 block text-xs text-muted-ink">Get thoughtful ways to stand out.</span></span><span className="text-sm font-semibold text-brand">See ideas <ChevronDown size={14} className="ml-1 inline -rotate-90" /></span></button>}
        </div>
      </div>
      <ProfileImageModal
        open={openModal}
        hasImage={!!user.profilePicture}
        onClose={() => setOpenModal(false)}
        onFrames={() => {
          setSelectedFrame(user.profileFrame || "");
          setOpenModal(false);
          setFramesOpen(true);
        }}
        onUpload={handleUploadClick}
        onView={() => {
          setOpenModal(false);
          setOpenViewer(true);
        }}
        onRemove={() => {
          setOpenModal(false);
          setShowDeleteModel(true);
        }}
      />
      <ProfileFramesModal
        open={framesOpen}
        name={user.name}
        profilePicture={user.profilePicture}
        selectedFrame={selectedFrame}
        saving={frameSaving}
        onSelect={setSelectedFrame}
        onClose={() => setFramesOpen(false)}
        onApply={applyProfileFrame}
      />
      <ProfileImageViewer
        open={openViewer}
        image={user.profilePicture}
        name={user.name}
        onClose={() => setOpenViewer(false)}
      />

      <DeleteConfirmationModal
        open={showDeleteModal}
        title="Remove Profile Photo"
        message="Are you sure you want to remove your profile photo?"
        loading={removing}
        onCancel={() => setShowDeleteModel(false)}
        onConfirm={handleRemovePhoto}
      />

      <EditProfileModal
        open={openEditProfile}
        user={user}
        onClose={() => setOpenEditProfile(false)}
        onProfileUpdate={onProfileUpdate}
        onAddEducation={() => onAddSection?.("education")}
      />
      <CoverImageModal
        open={openCoverModal}
        hasImage={!!user.coverPicture}
        onClose={() => setOpenCoverModal(false)}
        onUpload={() => {
          setOpenCoverModal(false);
          handleCoverUploadClick();
        }}
        onView={() => {
          setOpenCoverModal(false);
          setOpenCoverViewer(true);
        }}
        onRemove={() => {
          setOpenCoverModal(false);
          setShowCoverDeleteModal(true);
        }}
      />
      <DeleteConfirmationModal
        open={showCoverDeleteModal}
        title="Remove Cover Photo"
        message="Are you sure you want to remove your cover photo?"
        loading={removingCover}
        onCancel={() => setShowCoverDeleteModal(false)}
        onConfirm={handleRemoveCover}
      />
      <CoverImageViewer
        open={openCoverViewer}
        image={user.coverPicture}
        name={user.name}
        onClose={() => setOpenCoverViewer(false)}
      />
      {contactOpen && <ProfileContactModal
        user={user}
        isMe={isMe}
        onClose={() => setContactOpen(false)}
        onSaved={(updatedUser) => {
          onProfileUpdate(updatedUser);
          setContactOpen(false);
        }}
      />}
    </Card>
  );
};

export default ProfileHeader;
