import Link from 'next/link'
import { TOOL_GROUPS, TOOLS } from '@/lib/tools/registry'

export const metadata = { title: 'الأدوات — المكتب القانوني' }

export default function ToolsHub() {
  return (
    <div className="tools-hub">
      <header className="tools-hub-head">
        <div>
          <h1>أدوات المستندات</h1>
          <p>تجهيز ملفات الدعاوى والمعاملات قبل الطباعة أو الإرسال أو الرفع على البوابات الحكومية.</p>
        </div>
        <p className="tools-hub-privacy">
          <span className="material-symbols-outlined" aria-hidden>lock</span>
          <span><b>على جهازك فقط.</b> الملفات لا تُرفع لأي خادم، فتبقى مستندات الموكلين سرّية.</span>
        </p>
      </header>

      {TOOL_GROUPS.map(g => (
        <section key={g.id} className="tools-group" aria-labelledby={`tg-${g.id}`}>
          <div className="tools-group-head">
            <h2 id={`tg-${g.id}`}>{g.title}</h2>
            <p>{g.hint}</p>
          </div>
          <ul className="tools-grid">
            {TOOLS.filter(t => t.group === g.id).map(t => (
              <li key={t.slug}>
                <Link href={`/tools/${t.slug}`} className="tools-item">
                  <span className="tools-item-icon" aria-hidden>
                    <span className="material-symbols-outlined">{t.icon}</span>
                  </span>
                  <span className="min-w-0">
                    <b>{t.title}</b>
                    <small>{t.desc}</small>
                  </span>
                  <span className="tools-item-go material-symbols-outlined" aria-hidden>chevron_left</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
