import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api.js";

export default function ArticleFormPage() {
  const navigate = useNavigate();
  const { articleId } = useParams();
  const isEditing = Boolean(articleId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(articleId));

  useEffect(() => {
    if (!articleId) return;

    const loadArticle = async () => {
      try {
        setFetching(true);
        const { data } = await api.get(`/articles/${articleId}`);
        setTitle(data.article.title || "");
        setContent(data.article.content || "");
        setExcerpt(data.article.excerpt || "");
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load article");
        navigate("/feed");
      } finally {
        setFetching(false);
      }
    };

    loadArticle();
  }, [articleId, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("excerpt", excerpt.trim());

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      if (isEditing) {
        await api.put(`/articles/${articleId}`, formData);
        toast.success("Article updated");
        navigate(`/articles/${articleId}`);
      } else {
        const { data } = await api.post("/articles", formData);
        toast.success("Article published");
        navigate(`/articles/${data._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save article");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8 text-center text-gray-600">Loading article...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-4 py-10">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{isEditing ? "Edit article" : "Write article"}</h1>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              placeholder="Article title"
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              maxLength={280}
              rows={2}
              placeholder="Short summary"
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Article content</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={20000}
              rows={16}
              placeholder="Write your article..."
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Cover image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/feed")}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? (isEditing ? "Saving..." : "Publishing...") : isEditing ? "Save article" : "Publish article"}
          </button>
        </div>
      </form>
    </div>
  );
}
