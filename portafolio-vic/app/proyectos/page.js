import { headers } from 'next/headers';
import { isMobileUserAgent } from '@/lib/device';
import ProyectosDesktop from '@/components/proyectos/ProyectosDesktop';
import ProyectosMobile from '@/components/proyectos/ProyectosMobile';

export default function ProyectosPage() {
  const mobile = isMobileUserAgent(headers().get('user-agent'));
  return mobile ? <ProyectosMobile /> : <ProyectosDesktop />;
}
