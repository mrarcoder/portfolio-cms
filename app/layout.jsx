import "./globals.css";

export const metadata = {
  title: { default: "Portfolio CMS", template: "%s · Portfolio CMS" },
  description: "A personal portfolio, ready to grow with you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
