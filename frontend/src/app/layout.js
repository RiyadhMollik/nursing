import "./globals.css";

export const metadata = {
  title: "নার্সিং পাঠশালা | ১৫০ দিনের চ্যালেঞ্জ",
  description:
    "১৫০ দিনের Nursing Admission Challenge — প্রতিদিনের ক্লাস, পরীক্ষা, প্রশ্ন ব্যাংক ও বই এক জায়গায়।",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#008643",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
