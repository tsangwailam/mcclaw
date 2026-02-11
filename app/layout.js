import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: '🦀 Mission Claw',
  description: 'Agent Activity Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ 
        margin: 0, 
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
      }}>
        {children}
      </body>
    </html>
  );
}
