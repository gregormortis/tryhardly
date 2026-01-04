import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Tryhardly",
  description: "Guild-inspired quest gig marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderBottom: "1px solid #eee",
          }}
        >
          <div>
            <strong>Tryhardly</strong>
          </div>
          <nav style={{ display: "flex", gap: 16 }}>
            <Link href="/">Home</Link>
            <Link href="/quests">Quests</Link>
            <Link href="/auth">Login</Link>
          </nav>
        </header>
        <main style={{ padding: "24px" }}>{children}</main>
      </body>
    </html>
  );
}
