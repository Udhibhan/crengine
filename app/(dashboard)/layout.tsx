import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-void flex">
      <NavBar />
      <main className="flex-1 ml-[64px] min-h-screen relative">
        {/* Background — same as landing */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, left: '64px' }}>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px]"
            style={{ background: 'radial-gradient(ellipse, rgba(41,182,246,0.04) 0%, transparent 65%)' }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[400px]"
            style={{ background: 'radial-gradient(ellipse at bottom right, rgba(171,71,188,0.05) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(rgba(79,195,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          {/* Floating orbs */}
          <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 rounded-full animate-pulse-slow"
            style={{ background: '#29b6f6', boxShadow: '0 0 15px rgba(41,182,246,0.6)', opacity: 0.4 }} />
          <div className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full animate-pulse-slow"
            style={{ background: '#ab47bc', boxShadow: '0 0 12px rgba(171,71,188,0.6)', opacity: 0.3, animationDelay: '2s' }} />
        </div>
        <div className="relative" style={{ zIndex: 10 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
