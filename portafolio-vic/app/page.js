import { headers } from 'next/headers';
import { isMobileUserAgent } from '@/lib/device';
import HomeDesktop from '@/components/home/HomeDesktop';
import HomeMobile from '@/components/home/HomeMobile';

export default function HomePage() {
  const mobile = isMobileUserAgent(headers().get('user-agent'));
  return mobile ? <HomeMobile /> : <HomeDesktop />;
}
