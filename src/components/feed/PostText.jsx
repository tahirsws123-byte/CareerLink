import { Fragment } from "react";
import { Link } from "react-router-dom";

const tokenPattern = /(https?:\/\/[^\s<>"']+|[@#][a-z0-9-]{2,40})/gi;

export default function PostText({ text }) {
  const parts = [];
  let previous = 0;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index;
    if (start > previous) parts.push(text.slice(previous, start));
    const token = match[0];
    if (/^https?:\/\//i.test(token)) {
      const url = token.replace(/[.,!?;:)\]]+$/, "");
      parts.push(<a key={`url-${start}`} href={url} target="_blank" rel="noreferrer" className="break-all font-medium text-brand hover:underline">{url}</a>);
      if (url.length < token.length) parts.push(token.slice(url.length));
      previous = start + token.length;
      continue;
    }
    const marker = token[0];
    const value = token.slice(1);
    parts.push(marker === "@"
      ? <Link key={`mention-${start}`} to={`/profile/${value}`} className="font-medium text-brand hover:underline">{token}</Link>
      : <Link key={`hashtag-${start}`} to={`/search?q=${encodeURIComponent(value)}`} className="font-medium text-brand hover:underline">{token}</Link>);
    previous = start + token.length;
  }
  if (previous < text.length) parts.push(text.slice(previous));
  return <>{parts.map((part, index) => <Fragment key={typeof part === "string" ? `text-${index}` : part.key}>{part}</Fragment>)}</>;
}
