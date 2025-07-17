export function getClientCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : undefined;
}

export function setClientCookie(
  name: string,
  value: string,
  options?: { path?: string; maxAge?: number }
) {
  let cookie = `${name}=${value};`;
  if (options?.path) cookie += `path=${options.path};`;
  if (options?.maxAge) cookie += `max-age=${options.maxAge};`;
  document.cookie = cookie;
}

export function getOrCreateGuestId(): string {
  let guestId = getClientCookie("guest_id");
  if (!guestId) {
    guestId = crypto.randomUUID();
    setClientCookie("guest_id", guestId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return guestId;
}
