import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { AuthProvider } from "@/components/auth-provider";
import { ConvexClientProvider } from "@/components/convex-client-provider";

// Only account features read cookies and open authenticated Convex subscriptions.
// Keeping this out of the root layout lets public papers render once at build time.
export function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        <AuthProvider>{children}</AuthProvider>
      </ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
