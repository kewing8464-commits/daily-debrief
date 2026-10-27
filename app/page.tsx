import { Card } from '@/components/Card'
import { TabBar } from '@/components/TabBar'

// Placeholder Home; the real one is built in Task 7.
export default function Home() {
  return (
    <main className="safe-top flex-1 px-4 pb-24">
      <h1 className="mt-2 mb-4 font-serif text-2xl">Good evening 🌙</h1>
      <Card>Daily Debrief is being built.</Card>
      <TabBar active="home" />
    </main>
  )
}
