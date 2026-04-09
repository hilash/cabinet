import LoginClient from "./login-client";

// Server component: reads env vars and passes auth mode to client
export default function LoginPage() {
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;
  const hasGitHub = !!process.env.GITHUB_CLIENT_ID;
  const hasOAuth = hasGoogle || hasGitHub;
  // Legacy password mode only when no OAuth providers are configured
  const hasLegacy = !!process.env.KB_PASSWORD && !hasOAuth;

  return (
    <LoginClient hasGoogle={hasGoogle} hasGitHub={hasGitHub} hasLegacy={hasLegacy} />
  );
}
