import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'
import { MirrorProvider } from '@/lib/mirror-context'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <MirrorProvider>
      <div className="min-h-screen bg-void relative overflow-x-hidden">
        {/* Background — identical to landing */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px]"
            style={{ background: 'radial-gradient(ellipse, rgba(41,182,246,0.04) 0%, transparent 65%)' }} />
          <div className="absolute bottom-0 right-0 w-[600px] h-[500px]"
            style={{ background: 'radial-gradient(ellipse at bottom right, rgba(171,71,188,0.05) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(rgba(79,195,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <NavBar />
        <div className="relative" style={{ zIndex: 10 }}>
          {children}
        </div>
      </div>
    </MirrorProvider>
  )
}
