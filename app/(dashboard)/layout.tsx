import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-void flex">
      <NavBar />
      <main className="flex-1 ml-[220px] min-h-screen relative">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none ml-[220px]">
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-glow-blue opacity-10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-glow-violet opacity-8 blur-3xl" />
          <div className="absolute inset-0 grid-overlay opacity-20" />
        </div>
        <div className="relative z-10 p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
