export const normalizeApiPath = (url) => {
  const queryIndex = url.indexOf("?");
  const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);
  if (pathname === "/" || pathname === "/api" || pathname.startsWith("/api/")) {
    return url;
  }
  return `/api${url}`;
};
export const apiPathMiddleware = (req, _res, next) => {
  req.url = normalizeApiPath(req.url);
  next();
};