import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bookmark } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";
import useAuth from "../hooks/useAuth";

export default function ArticleDetailPage() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const { data } = await api.get(`/articles/${articleId}`);
        setArticle(data.article);
        setSaved(Boolean(data.saved));
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load article");
        navigate("/feed");
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [articleId, navigate]);

  const handleDelete = async () => {
    if (!article) return;

    try {
      await api.delete(`/articles/${article._id}`);
      toast.success("Article deleted");
      navigate("/feed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete article");
    }
  };

  const toggleSaved = async () => {
    try {
      const { data } = await api.post(`/articles/${article._id}/save`);
      setSaved(data.saved);
      toast.success(data.saved ? "Article saved" : "Article removed from saved items");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update saved article");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading article...</div>;
  }

  if (!article) {
    return <div className="p-8 text-center text-gray-600">Article not found.</div>;
  }

  const isOwner = user?._id === article.author?._id;

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-4 py-10">
      <article className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">By {article.author?.name || "CareerLink member"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleSaved}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Bookmark size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save article"}
            </button>
            {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/articles/${article._id}/edit`)}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
            )}
          </div>
        </div>

        {article.coverImage?.url && (
          <img src={article.coverImage.url} alt={article.title} className="mb-6 h-72 w-full rounded-lg object-cover" />
        )}

        <h1 className="mb-4 text-3xl font-bold text-gray-900">{article.title}</h1>
        <p className="mb-6 text-sm text-gray-500">{new Date(article.createdAt).toLocaleDateString()}</p>

        <div className="prose max-w-none whitespace-pre-wrap text-gray-800">{article.content}</div>

        <div className="mt-8 border-t pt-4">
          <Link to="/feed" className="text-blue-600 hover:underline">Back to feed</Link>
        </div>
      </article>
    </div>
  );
}
