import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Alex RAG Admin",
  description: "Sign in to manage your AI voice agents",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}


