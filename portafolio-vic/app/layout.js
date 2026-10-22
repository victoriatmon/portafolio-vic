import './globals.css';

export const metadata = {
  title: 'Victoria Talamantes — Product Designer',
  description:
    'Portfolio of Victoria Talamantes, Lead Product Designer specialized in fintech and insurtech in Mexico and LATAM.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
