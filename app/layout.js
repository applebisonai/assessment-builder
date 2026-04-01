import './globals.css';
export const metadata = { title: 'Assessment Builder', description: 'Convert any document into a CCSS-aligned K-5 assessment' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
