import ProfileCard from "../components/feed/ProfileCard";
import ComposePost from "../components/feed/ComposePost";
import TopProfileCompose from "../components/feed/TopProfileCompose";
import PostCard from "../components/feed/PostCard";
import NewsWidget from "../components/feed/NewsWidget";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api.js";
import toast from "react-hot-toast";
import useTranslation from "../hooks/useTranslation";
import useAuth from "../hooks/useAuth.js";

export default function Feed() {
  const t = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likingPostId, setLikingPostId] = useState(null);
  const [repostingPostId, setRepostingPostId] = useState(null);
  const [articles, setArticles] = useState([]);
  const [savedPostIds, setSavedPostIds] = useState([]);
  const [followedUserIds, setFollowedUserIds] = useState([]);
  const [followLoadingUserId, setFollowLoadingUserId] = useState(null);
  const [highlightedPostId, setHighlightedPostId] = useState("");
  const targetPostId = searchParams.get("postId") || "";
  const displayedPosts = user?.preferredFeedView === "recent"
    ? [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : posts;

  const handleLikePost = async (postId) => {
    if (likingPostId === postId) return;
    try {
      setLikingPostId(postId);

      const response = await api.post(`/posts/${postId}/like`);

      setPosts((prevPosts) =>
        prevPosts.map((post) => (post._id === postId ? response.data : post)),
      );
    } catch (error) {
      console.log("Toggle Like Error:", error);
      toast.error(error.response?.data?.message || "Unable to like post");
    } finally {
      setLikingPostId(null);
    }
  };

  const handleReactPost = async (postId, emoji) => {
    try {
      const response = await api.post(`/posts/${postId}/reaction`, { emoji });
      setPosts((previousPosts) => previousPosts.map((post) =>
        post._id === postId ? response.data : post,
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to react to post");
    }
  };

  const handleCreatePost = async ({ text, image, video }) => {
    try {
      const formData = new FormData();

      formData.append("text", text);

      if (image) {
        formData.append("image", image);
      }

      if (video) {
        formData.append("video", video);
      }

      const response = await api.post("/posts", formData);

      setPosts((prev) => [response.data, ...prev]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create post");
    }
  };

  const handleRepostPost = async (postId) => {
    if (repostingPostId === postId) return;

    try {
      setRepostingPostId(postId);
      const response = await api.post(`/posts/${postId}/repost`);
      setPosts((prev) => [response.data, ...prev]);
      toast.success("Post reposted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to repost post");
    } finally {
      setRepostingPostId(null);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);

      setPosts((previousPosts) =>
        previousPosts.filter((post) => post._id !== postId),
      );
      setSavedPostIds((previousSaved) => previousSaved.filter((id) => id !== postId));

      toast.success("Post Deleted Successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "unable to delete post");
    }
  };

  const handleDismissPost = (postId, reason = "dismiss") => {
    const postIndex = posts.findIndex((post) => post._id === postId);
    if (postIndex < 0) return;
    const [dismissedPost] = posts.slice(postIndex, postIndex + 1);
    setPosts((current) => current.filter((post) => post._id !== postId));

    toast.custom((toastItem) => (
      <div className="flex items-center gap-4 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-xl">
        <span>{reason === "not-interested" ? "We’ll show you fewer posts like this." : "Post hidden from your feed."}</span>
        <button
          type="button"
          className="font-semibold text-sky-300 hover:text-white"
          onClick={() => {
            setPosts((current) => {
              if (current.some((post) => post._id === dismissedPost._id)) return current;
              const restored = [...current];
              restored.splice(Math.min(postIndex, restored.length), 0, dismissedPost);
              return restored;
            });
            toast.dismiss(toastItem.id);
          }}
        >
          Undo
        </button>
      </div>
    ), { duration: 6000 });
  };

  const handleToggleFollow = async (targetUserId) => {
    if (!targetUserId || followLoadingUserId === targetUserId) return;

    try {
      setFollowLoadingUserId(targetUserId);
      const { data } = await api.post(`/users/follow/${targetUserId}`);

      setFollowedUserIds((previousIds) => {
        if (data.following) {
          return previousIds.includes(targetUserId)
            ? previousIds
            : [...previousIds, targetUserId];
        }

        return previousIds.filter((userId) => userId !== targetUserId);
      });

      toast.success(data.following ? "You are now following this author" : "You unfollowed this author");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update follow state");
    } finally {
      setFollowLoadingUserId(null);
    }
  };

  const handleToggleSavePost = async (postId) => {
    try {
      const { data } = await api.post(`/posts/${postId}/save`);

      setSavedPostIds((previousSaved) => {
        if (data.saved) {
          return previousSaved.includes(postId)
            ? previousSaved
            : [...previousSaved, postId];
        }

        return previousSaved.filter((savedPostId) => savedPostId !== postId);
      });

      toast.success(data.saved ? "Post saved" : "Post removed from saved items");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update saved post");
    }
  };

  const handleEditPost = (updatedPost) => {
    setPosts((previousPosts) =>
      previousPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post,
      ),
    );
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const [postsResponse, articlesResponse, savedResponse, followingResponse] = await Promise.all([
          api.get("/posts"),
          api.get("/articles"),
          api.get("/posts/saved"),
          api.get("/users/following"),
        ]);
        setPosts(postsResponse.data);
        setArticles(articlesResponse.data.articles || []);
        setSavedPostIds((savedResponse.data.savedPosts || []).map((post) => post._id));
        setFollowedUserIds(followingResponse.data.following || []);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    if (loading || !targetPostId || !posts.some((post) => post._id === targetPostId)) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(`post-${targetPostId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedPostId(targetPostId);
      setSearchParams((params) => {
        params.delete("postId");
        return params;
      }, { replace: true });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [loading, posts, targetPostId, setSearchParams]);

  useEffect(() => {
    if (!highlightedPostId) return undefined;
    const timer = window.setTimeout(() => setHighlightedPostId(""), 3200);
    return () => window.clearTimeout(timer);
  }, [highlightedPostId]);

  if (loading) {
    return (
      <div role="status" className="flex flex-col items-center mt-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-8 animate-[spin_0.8s_linear_infinite] fill-blue-600 dark:fill-blue-500"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 22c5.421 0 10-4.579 10-10h-2c0 4.337-3.663 8-8 8s-8-3.663-8-8c0-4.336 3.663-8 8-8V2C6.579 2 2 6.58 2 12c0 5.421 4.579 10 10 10z"
            data-original="#000000"
          />
        </svg>
        <span className="sr-only">{t("Loading…")}</span>
      </div>
    );
  }

  if (error) {
    return <h1>{error}</h1>;
  }

  console.log(posts);
  return (
    <>
      <div className="min-h-screen bg-[#f3f2ef]">
        <div className="mx-auto grid max-w-[1128px] grid-cols-1 gap-6 px-4 py-6 sm:grid-cols-12">
          {/* Combined top view for mobile: Profile + Compose */}
          <div className="col-span-1 sm:hidden">
            <TopProfileCompose onPost={handleCreatePost} />
          </div>

          <div className="order-2 col-span-1 sm:order-2 sm:col-span-6 space-y-4">
            <div className="hidden sm:block">
              <ComposePost onPost={handleCreatePost} />
            </div>
            {articles.length > 0 && (
              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-gray-900">{t("Latest articles")}</h2>
                  <Link to="/articles/new" className="text-sm font-medium text-blue-600 hover:underline">
                    {t("Write")}
                  </Link>
                </div>
                <div className="mt-3 space-y-3">
                  {articles.slice(0, 3).map((article) => (
                    <Link
                      key={article._id}
                      to={`/articles/${article._id}`}
                      className="block rounded-md border border-gray-100 p-3 hover:bg-gray-50"
                    >
                      <p className="font-medium text-gray-900">{article.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {article.excerpt || article.content}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {t("By")} {article.author?.name || t("CareerLink member")}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {displayedPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                highlighted={highlightedPostId === post._id}
                onDismiss={handleDismissPost}
                onDelete={handleDeletePost}
                onLike={handleLikePost}
                onReact={handleReactPost}
                onEdit={handleEditPost}
                onRepost={handleRepostPost}
                onToggleSave={handleToggleSavePost}
                onToggleFollow={handleToggleFollow}
                saved={savedPostIds.includes(post._id)}
                isFollowing={followedUserIds.includes(post.author?._id)}
                followLoading={followLoadingUserId === post.author?._id}
                liking={likingPostId === post._id}
                reposting={repostingPostId === post._id}
              />
            ))}
          </div>
          <div className="order-1 col-span-1 sm:order-1 sm:col-span-3 hidden sm:block">
            <ProfileCard />
          </div>

          <div className="order-3 col-span-1 sm:order-3 sm:col-span-3 hidden sm:block">
            <NewsWidget />
          </div>
        </div>
      </div>
    </>
  );
}
