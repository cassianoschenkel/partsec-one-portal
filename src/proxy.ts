import { NextResponse } from "next/server";
import { auth } from "../auth";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  const isLoggedIn = Boolean(session?.user);
  const isLoginPage = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  if (!isLoginPage && !isLoggedIn) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session?.user?.role !== "PARTSEC_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)",
  ],
};
