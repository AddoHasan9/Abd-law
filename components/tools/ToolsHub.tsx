'use client'

import { useState } from 'react'
import { TOOL_GROUPS, TOOLS, type ToolDef } from '@/lib/tools/registry'
import ToolLoader from './ToolLoader'
import { ToolCardContext } from './ToolKit'

/** صفحة الأدوات: كل أداة بطاقة تعمل في مكانها، مع تصفية حسب النوع */
export default function ToolsHub() {
  const [group, setGroup] = useState<ToolDef['group'] | 'all'>('all')
  const shown = TOOLS.filter(t => group === 'all' || t.group === group)

  return (
    <div className="tools-hub">
      <header className="tools-hub-head">
        <div>
          <h1>الأدوات</h1>
          <p>تجهيز ملفات الدعاوى والمعاملات قبل الطباعة أو الإرسال أو الرفع على البوابات الحكومية.</p>
        </div>
        <p className="tools-hub-privacy">
          <span className="material-symbols-outlined" aria-hidden>lock</span>
          <span><b>على جهازك فقط.</b> الملفات لا تُرفع لأي خادم، فتبقى مستندات الموكلين سرّية.</span>
        </p>
      </header>

      <div className="tools-filter" role="tablist" aria-label="تصفية الأدوات">
        {[{ id: 'all' as const, title: 'الكل' }, ...TOOL_GROUPS].map(g => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={group === g.id}
            className={group === g.id ? 'is-on' : ''}
            onClick={() => setGroup(g.id)}
          >
            {g.title}
            <span className="num">{g.id === 'all' ? TOOLS.length : TOOLS.filter(t => t.group === g.id).length}</span>
          </button>
        ))}
      </div>

      <ToolCardContext.Provider value={true}>
        <div className="tools-cards">
          {shown.map(t => <ToolLoader key={t.slug} slug={t.slug} />)}
        </div>
      </ToolCardContext.Provider>
    </div>
  )
}
