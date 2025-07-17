import { cookies } from "next/headers";

export async function getServerCookie(
  name: string
): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function setServerCookie(
  name: string,
  value: string,
  options?: { path?: string; maxAge?: number }
) {
  const cookieStore = await cookies();
  cookieStore.set(name, value, options);
}
