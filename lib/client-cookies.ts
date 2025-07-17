export function getClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  try {
    const cookies = document.cookie.split(";");
    const cookie = cookies.find((c) => c.trim().startsWith(`${name}=`));

    if (cookie) {
      const value = cookie.split("=")[1];
      return value ? decodeURIComponent(value) : undefined;
    }
  } catch (error) {
    console.warn(`Failed to get cookie ${name}:`, error);
  }

  return undefined;
}

export function setClientCookie(
  name: string,
  value: string,
  options?: { path?: string; maxAge?: number }
) {
  if (typeof document === "undefined") return;

  try {
    const encodedValue = encodeURIComponent(value);
    let cookie = `${name}=${encodedValue};`;

    if (options?.path) cookie += `path=${options.path};`;
    if (options?.maxAge) cookie += `max-age=${options.maxAge};`;

    // Add SameSite for better security
    cookie += `SameSite=Lax;`;

    document.cookie = cookie;
  } catch (error) {
    console.error(`Failed to set cookie ${name}:`, error);
  }
}

export function getOrCreateGuestId(): string {
  let guestId = getClientCookie("guest_id");
  if (!guestId) {
    // Fallback for environments where crypto.randomUUID() might not be available
    try {
      guestId = crypto.randomUUID();
    } catch (error) {
      // Fallback to a simple UUID generation
      guestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    }

    // Set cookie with more robust options
    setClientCookie("guest_id", guestId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    // Also try to set it immediately in case there are timing issues
    try {
      document.cookie = `guest_id=${encodeURIComponent(
        guestId
      )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch (error) {
      console.warn("Failed to set guest_id cookie:", error);
    }
  }
  return guestId;
}
