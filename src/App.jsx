import { useEffect } from "react";
import AppRoutes from './routes/AppRoutes'

function App() {
  useEffect(() => {
    const applyPreferences = () => {
      const theme = localStorage.getItem("careerlink-theme") || "light";
      const isDark = theme === "dark"
        || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      const autoplay = localStorage.getItem("careerlink-autoplay-videos") === "true";
      document.querySelectorAll("video").forEach((video) => applyVideoPreference(video, autoplay));
    };
    const onVideoPreference = (event) => {
      document.querySelectorAll("video").forEach((video) => applyVideoPreference(video, event.detail));
    };
    const observer = new MutationObserver((records) => {
      const autoplay = localStorage.getItem("careerlink-autoplay-videos") === "true";
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("video")) applyVideoPreference(node, autoplay);
        node.querySelectorAll("video").forEach((video) => applyVideoPreference(video, autoplay));
      }));
    });
    applyPreferences();
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", applyPreferences);
    window.addEventListener("careerlink-video-preference", onVideoPreference);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyPreferences);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", applyPreferences);
      window.removeEventListener("careerlink-video-preference", onVideoPreference);
      mediaQuery.removeEventListener("change", applyPreferences);
    };
  }, []);

  return <AppRoutes />
}

function applyVideoPreference(video, autoplay) {
  video.autoplay = autoplay;
  if (autoplay) {
    video.muted = true;
    video.play().catch(() => {});
  } else {
    video.pause();
  }
}

export default App
