'use client'

import dynamic from 'next/dynamic'
import type { ToolSlug } from '@/lib/tools/registry'

/** كل أداة تُحمَّل عند فتحها فقط (مكتبات PDF ثقيلة ولا نريدها في باقي الصفحات) */
const Loading = () => (
  <div className="tool-page"><div className="tool-drop skeleton-shimmer" style={{ minHeight: 180 }} /></div>
)
const load = (name: string) =>
  dynamic(() => import('./SimpleTools').then(m => (m as unknown as Record<string, React.ComponentType>)[name]), { ssr: false, loading: Loading })

const MAP: Record<ToolSlug, React.ComponentType> = {
  editor: dynamic(() => import('./PdfEditor'), { ssr: false, loading: Loading }),
  merge: load('MergePdf'),
  split: load('SplitPdf'),
  'pdf-to-images': load('PdfToImages'),
  'images-to-pdf': load('ImagesToPdf'),
  'compress-pdf': load('CompressPdf'),
  'compress-images': load('CompressImages'),
  stamp: load('StampPdf'),
}

export default function ToolLoader({ slug }: { slug: ToolSlug }) {
  const Tool = MAP[slug]
  return <Tool />
}
