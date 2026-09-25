import { notFound } from 'next/navigation'
import ToolLoader from '@/components/tools/ToolLoader'
import { TOOLS, toolBySlug } from '@/lib/tools/registry'

export function generateStaticParams() {
  return TOOLS.map(t => ({ tool: t.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const t = toolBySlug((await params).tool)
  return { title: t ? `${t.title} — الأدوات` : 'الأدوات' }
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const t = toolBySlug((await params).tool)
  if (!t) notFound()
  return <ToolLoader slug={t.slug} />
}
