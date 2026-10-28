import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";
import PostCard from "../components/feed/PostCard.jsx";

export default function SavedPostsPage() {
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedArticles, setSavedArticles] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likingPostId, setLikingPostId] = useState(null);
  const [repostingPostId, setRepostingPostId] = useState(null);

  const fetchSavedPosts = async () => {
    try {
      setLoading(true);
      setError("");
      const [postsResponse, articlesResponse] = await Promise.all([
        api.get("/posts/saved"),
        api.get("/articles/saved"),
      ]);
      setSavedPosts(postsResponse.data.savedPosts || []);
      setSavedArticles(articlesResponse.data.articles || []);
    } catch (error) {
      setError(error.response?.data?.message || "Unable to load saved posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const handleLikePost = async (postId) => {
    if (likingPostId === postId) return;

    try {
      setLikingPostId(postId);
      const response = await api.post(`/posts/${postId}/like`);

      setSavedPosts((previousPosts) =>
        previousPosts.map((post) =>
          post._id === postId ? response.data : post,
        ),
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to like post");
    } finally {
      setLikingPostId(null);
    }
  };

  const handleReactPost = async (postId, emoji) => {
    try {
      const response = await api.post(`/posts/${postId}/reaction`, { emoji });
      setSavedPosts((previousPosts) => previousPosts.map((post) =>
        post._id === postId ? response.data : post,
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to react to post");
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setSavedPosts((previousPosts) =>
        previousPosts.filter((post) => post._id !== postId),
      );
      toast.success("Post deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete post");
    }
  };

  const handleEditPost = (updatedPost) => {
    setSavedPosts((previousPosts) =>
      previousPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post,
      ),
    );
  };

  const handleRepostPost = async (postId) => {
    if (repostingPostId === postId) return;

    try {
      setRepostingPostId(postId);
      const response = await api.post(`/posts/${postId}/repost`);
      setSavedPosts((previousPosts) => [response.data, ...previousPosts]);
      toast.success("Post reposted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to repost post");
    } finally {
      setRepostingPostId(null);
    }
  };

  const handleToggleSave = async (postId) => {
    try {
      const { data } = await api.post(`/posts/${postId}/save`);

      if (!data.saved) {
        setSavedPosts((previousPosts) =>
          previousPosts.filter((post) => post._id !== postId),
        );
      }

      toast.success(data.saved ? "Post saved" : "Post removed from saved items");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update saved post");
    }
  };

  const removeSavedArticle = async (articleId) => {
    try {
      await api.post(`/articles/${articleId}/save`);
      setSavedArticles((items) => items.filter((article) => article._id !== articleId));
      toast.success("Article removed from saved items");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update saved article");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] px-4 py-8">
        <div className="mx-auto max-w-[1128px] rounded-lg bg-white p-6 text-sm text-muted-ink">
          Loading saved posts...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-4 py-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="My items" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 className="flex items-center gap-2 border-b border-gray-100 px-4 py-4 font-semibold text-ink"><Bookmark size={17} />My items</h2>
          <Link to="/jobs/manage" className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"><span>Posted jobs</span><span className="text-xs text-muted-ink">Manage</span></Link>
          <button type="button" onClick={() => setActiveTab("posts")} className={`flex w-full items-center justify-between border-l-4 px-3 py-3 text-left text-sm ${activeTab === "posts" ? "border-brand bg-sky/40 font-semibold text-brand" : "border-transparent text-gray-700 hover:bg-gray-50"}`}><span>Saved posts</span><span>{savedPosts.length}</span></button>
          <button type="button" onClick={() => setActiveTab("articles")} className={`flex w-full items-center justify-between border-l-4 px-3 py-3 text-left text-sm ${activeTab === "articles" ? "border-brand bg-sky/40 font-semibold text-brand" : "border-transparent text-gray-700 hover:bg-gray-50"}`}><span>Saved articles</span><span>{savedArticles.length}</span></button>
        </nav>
        <main className="min-w-0 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-ink">{activeTab === "posts" ? "Saved posts" : "Saved articles"}</h1>
              <p className="text-sm text-muted-ink">Your bookmarked posts and articles, all in one place.</p>
            </div>
            <Link to={activeTab === "posts" ? "/feed" : "/feed"} className="text-sm font-medium text-brand hover:underline">Explore CareerLink</Link>
          </div>
          <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
            {[["posts", "Posts"], ["articles", "Articles"]].map(([tab, label]) => <button type="button" key={tab} onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab ? "bg-emerald-700 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{label}</button>)}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!error && activeTab === "posts" && savedPosts.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">
            You have no saved posts yet.
          </div>
        )}

        {activeTab === "posts" && savedPosts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onDelete={handleDeletePost}
            onLike={handleLikePost}
            onReact={handleReactPost}
            onEdit={handleEditPost}
            onRepost={handleRepostPost}
            onToggleSave={handleToggleSave}
            saved={true}
            liking={likingPostId === post._id}
            reposting={repostingPostId === post._id}
          />
        ))}
        {activeTab === "articles" && savedArticles.length === 0 && <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center"><FileText className="mx-auto text-brand" size={28} /><h2 className="mt-3 font-semibold text-ink">No saved articles yet</h2><p className="mt-1 text-sm text-muted-ink">Save useful articles to find them here later.</p><Link to="/feed" className="mt-4 inline-flex rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Explore CareerLink</Link></div>}
        {activeTab === "articles" && savedArticles.map((article) => <article key={article._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {article.coverImage?.url && <Link to={`/articles/${article._id}`}><img src={article.coverImage.url} alt="" className="h-44 w-full object-cover" /></Link>}
          <div className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link to={`/articles/${article._id}`} className="text-lg font-semibold text-ink hover:text-brand">{article.title}</Link><p className="mt-1 text-xs text-muted-ink">By {article.author?.name || "CareerLink member"} · {new Date(article.createdAt).toLocaleDateString()}</p></div><button type="button" onClick={() => removeSavedArticle(article._id)} aria-label={`Remove ${article.title} from saved items`} className="rounded-full p-2 text-brand hover:bg-sky"><Bookmark size={18} fill="currentColor" /></button></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{article.excerpt || article.content}</p><Link to={`/articles/${article._id}`} className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline">Read article</Link></div>
        </article>)}
        </main>
      </div>
    </div>
  );
}
