/** سجلّ أدوات قسم الأدوات — مصدر واحد للقائمة الجانبية وصفحة الأدوات */
export type ToolSlug =
  | 'editor' | 'merge' | 'split'
  | 'pdf-to-images' | 'images-to-pdf'
  | 'compress-pdf' | 'compress-images'
  | 'stamp'

export interface ToolDef {
  slug: ToolSlug
  title: string
  desc: string
  icon: string
  group: 'edit' | 'convert' | 'compress' | 'finish'
  /** بطاقة بعرض الصفحة كاملاً في صفحة الأدوات */
  wide?: boolean
}

export const TOOL_GROUPS: { id: ToolDef['group']; title: string; hint: string }[] = [
  { id: 'edit', title: 'تعديل PDF', hint: 'ترتيب الصفحات وحذفها وإضافتها، الدمج والتقسيم' },
  { id: 'convert', title: 'تحويل', hint: 'بين PDF والصور بالاتجاهين' },
  { id: 'compress', title: 'ضغط', hint: 'تصغير الحجم للإرسال بالبريد أو واتساب أو البوابات الحكومية' },
  { id: 'finish', title: 'ختم وترقيم', hint: 'ختم المكتب والتوقيع والترقيم والعلامة المائية' },
]

export const TOOLS: ToolDef[] = [
  { slug: 'editor', title: 'محرر صفحات PDF', desc: 'حذف وإضافة وتدوير وإعادة ترتيب صفحات الملف نفسه', icon: 'auto_stories', group: 'edit', wide: true },
  { slug: 'merge', title: 'دمج ملفات PDF', desc: 'جمع عدة ملفات في ملف واحد بالترتيب الذي تختاره', icon: 'library_add', group: 'edit' },
  { slug: 'split', title: 'تقسيم واستخراج صفحات', desc: 'استخراج صفحات محددة أو فصل كل صفحة بملف', icon: 'call_split', group: 'edit' },
  { slug: 'pdf-to-images', title: 'PDF إلى صور', desc: 'كل صفحة صورة JPG أو PNG بجودة عالية', icon: 'imagesmode', group: 'convert' },
  { slug: 'images-to-pdf', title: 'صور إلى PDF', desc: 'تحويل صور المستندات الممسوحة إلى ملف PDF واحد', icon: 'picture_as_pdf', group: 'convert' },
  { slug: 'compress-pdf', title: 'ضغط PDF', desc: 'تقليل حجم الملفات الممسوحة ضوئياً والكبيرة', icon: 'compress', group: 'compress' },
  { slug: 'compress-images', title: 'ضغط الصور', desc: 'تصغير حجم وأبعاد صور الهويات والمستندات', icon: 'photo_size_select_large', group: 'compress' },
  { slug: 'stamp', title: 'ختم وترقيم وعلامة مائية', desc: 'إضافة ختم المكتب أو التوقيع وأرقام الصفحات وعلامة «نسخة»', icon: 'approval', group: 'finish', wide: true },
]

export const toolBySlug = (slug: string) => TOOLS.find(t => t.slug === slug)
