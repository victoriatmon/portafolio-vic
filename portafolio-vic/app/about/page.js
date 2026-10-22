import { headers } from 'next/headers';
import { isMobileUserAgent } from '@/lib/device';
import AboutDesktop from '@/components/about/AboutDesktop';
import AboutMobile from '@/components/about/AboutMobile';

export default function AboutPage() {
  const mobile = isMobileUserAgent(headers().get('user-agent'));
  return mobile ? <AboutMobile /> : <AboutDesktop />;
}
