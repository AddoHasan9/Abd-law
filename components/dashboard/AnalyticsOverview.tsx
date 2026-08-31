'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { TrendingUp, BarChart3 } from 'lucide-react'

interface MonthlyData {
  month: string
  transactions: number
  completed: number
}

interface Props {
  data?: MonthlyData[]
  totalActive?: number
  completionRate?: number
}

const DEFAULT_DATA: MonthlyData[] = [
  { month: 'أيار', transactions: 14, completed: 11 },
  { month: 'حزيران', transactions: 22, completed: 19 },
  { month: 'تموز', transactions: 18, completed: 16 },
  { month: 'آب', transactions: 29, completed: 25 },
  { month: 'أيلول', transactions: 35, completed: 31 },
  { month: 'تشرين', transactions: 42, completed: 38 },
]

export default function AnalyticsOverview({
  data = DEFAULT_DATA,
  totalActive = 42,
  completionRate = 92,
}: Props) {
  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-bold">حركة المعاملات والإنجاز</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            معدل إنجاز المعاملات وتدفق العمل خلال الأشهر الأخيرة
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{completionRate}% معدل الإنجاز</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[220px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="var(--text-3)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-3)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={val => `${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--line-soft)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  fontSize: '12px',
                  direction: 'rtl',
                }}
                labelStyle={{ color: 'var(--text)', fontWeight: 700, marginBottom: '4px' }}
              />
              <Area
                type="monotone"
                dataKey="transactions"
                name="إجمالي المعاملات"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#txGradient)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="المعاملات المنجزة"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#compGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <span>إجمالي المعاملات الواردة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>المعاملات المكتملة والمغلقة</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
