import { Hero } from '@/components/home/Hero'
import { FeedSection } from '@/components/home/FeedSection'
import { Explainers } from '@/components/home/Explainers'
import { MethodologyExplainer } from '@/components/MethodologyExplainer'

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeedSection />
      <MethodologyExplainer />
      <Explainers />
    </>
  )
}
