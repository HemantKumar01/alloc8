export function hasValidPasscode(search) {
  const values = new URLSearchParams(search).getAll("pass");
  return values.length === 1 && values[0] === "DkMkC";
}

export function preservePasscode(to, search) {
  if (typeof to === "number" || !hasValidPasscode(search)) return to;
  // All application navigation targets are local paths.
  const target = typeof to === "string"
    ? new URL(to, window.location.href)
    : to;
  const params = new URLSearchParams(target.search);
  if (!params.has("pass")) params.set("pass", new URLSearchParams(search).get("pass"));
  return { pathname: target.pathname, search: `?${params}`, hash: target.hash };
}
