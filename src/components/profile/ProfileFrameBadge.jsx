import { useId } from "react";

const frameConfig = {
  "open-to-work": {
    label: "#OPENTOWORK",
    gradient: "open-to-work-frame-gradient",
  },
  hiring: {
    label: "#HIRING",
    gradient: "hiring-frame-gradient",
  },
};

export default function ProfileFrameBadge({ frame, className = "" }) {
  const uniqueId = useId().replace(/:/g, "");
  const config = frameConfig[frame];
  if (!config) return null;

  const pathId = `profile-frame-path-${frame}-${uniqueId}`;
  const gradientId = `${config.gradient}-${uniqueId}`;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-label={frame === "hiring" ? "Hiring profile frame" : "Open to work profile frame"}
      role="img"
      className={`pointer-events-none absolute inset-[-4%] z-10 h-[108%] w-[108%] overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {frame === "hiring" ? (
            <>
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#d946ef" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#57933e" />
              <stop offset="100%" stopColor="#0b8f79" />
            </>
          )}
        </linearGradient>
        <path id={pathId} d="M 5 65 A 48 48 0 0 0 95 65" />
      </defs>
      <circle cx="50" cy="50" r="45" fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" />
      <text
        fill="white"
        fontSize={frame === "hiring" ? "8" : "7"}
        fontWeight="700"
        letterSpacing="0.5"
        textAnchor="middle"
        paintOrder="stroke"
        stroke="#17453d"
        strokeLinejoin="round"
        strokeWidth="1"
      >
        <textPath href={`#${pathId}`} startOffset="50%">{config.label}</textPath>
      </text>
    </svg>
  );
}
