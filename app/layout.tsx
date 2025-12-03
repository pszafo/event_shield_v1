import "./globals.css";

export const metadata = {
  title: "RainShield – Event Insurance MVP",
  description: "Micro-insurance for small events (MVP)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#f6f6f6", fontFamily: "Arial, sans-serif" }}>
        <header
          style={{
            background: "white",
            borderBottom: "1px solid #ddd",
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "14px",
            }}
          >
            <strong>RainShield (MVP)</strong>

            <nav style={{ display: "flex", gap: "12px" }}>
              <a href="/" style={{ textDecoration: "none", color: "#333" }}>
                Home
              </a>
              <a
                href="/organizer"
                style={{ textDecoration: "none", color: "#333" }}
              >
                Organizer
              </a>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: "900px", margin: "20px auto", padding: "0 20px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
