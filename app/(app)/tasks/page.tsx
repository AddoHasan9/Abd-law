import { PageHeader } from '@/components/ui/PageHeader'
import TasksClient from '@/components/tasks/TasksClient'
import { listTasksAction } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'المهام — مكتب المحامي عبدالحسن الخزرجي' }

export default async function TasksPage() {
  const res = await listTasksAction()
  return (
    <div className="view">
      <PageHeader icon="task_alt" title="المهام" subtitle="مراجعات الدوائر والأعمال الميدانية — بموعد وتذكير ومسؤول" />
      <TasksClient initial={res.success && res.data ? res.data : []} />
    </div>
  )
}
