export const parseTrustedProxyHops = (value) => {
  if (value === undefined || value.trim() === "") return 0;

  if (!/^\d+$/.test(value.trim())) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  }

  const hops = Number(value);
  if (!Number.isSafeInteger(hops) || hops > 255) {
    throw new Error("TRUST_PROXY_HOPS must be between 0 and 255");
  }
  return hops;
};
