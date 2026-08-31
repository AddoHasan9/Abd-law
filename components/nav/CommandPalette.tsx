'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Building2,
  FileText,
  BadgeCheck,
  Calculator,
  CalendarDays,
  History,
  Users,
  Settings,
  PlusCircle,
  Sun,
  Moon,
  User,
  ExternalLink,
} from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenProfile?: () => void
  onToggleTheme?: () => void
}

export default function CommandPalette({
  open,
  onOpenChange,
  onOpenProfile,
  onToggleTheme,
}: Props) {
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="ابحث عن قسم، معاملة، شركة، أو إجراء سريع... (Ctrl + K)" />
      <CommandList className="custom-scrollbar">
        <CommandEmpty>لم يتم العثور على نتائج مطابقة.</CommandEmpty>

        {/* Quick Navigation */}
        <CommandGroup heading="الأقسام والصفحات الرئيسية">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-[var(--accent)]" />
              <span>لوحة التحكم الرئيسية</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/commercial/companies-registry'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" />
              <span>سجل الشركات العامة والمؤسسة</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/commercial/companies</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/commercial/transactions-registry'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span>سجل المعاملات والتوكيلات</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/commercial/transactions</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/commercial/financial-statements'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-500" />
              <span>الحسابات الختامية والميزانيات</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/commercial/financial</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/commercial/ids'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-purple-500" />
              <span>الهويات والرقيمات الصادرة</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/commercial/ids</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/commercial/tax-assessment'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-500" />
              <span>التحاسب والملفات الضريبية</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/commercial/tax</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/reminders'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-rose-500" />
              <span>المتابعة والتذكيرات والمهام</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/reminders</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Administration & Settings */}
        <CommandGroup heading="الإدارة والرقابة">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/settings/audit'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-cyan-500" />
              <span>سجل العمليات والرقابة الأمنية (Audit Logs)</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/settings/audit</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/settings/users'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span>إدارة المحامين والمستخدمين والصلاحيات</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/settings/users</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/settings'))}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              <span>إعدادات النظام العامة</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">/settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="إجراءات سريعة">
          {onOpenProfile && (
            <CommandItem
              onSelect={() => runCommand(onOpenProfile)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <User className="h-4 w-4 text-[var(--accent)]" />
              <span>عرض وتعديل الملف الشخصي</span>
            </CommandItem>
          )}

          {onToggleTheme && (
            <CommandItem
              onSelect={() => runCommand(onToggleTheme)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Sun className="h-4 w-4 text-amber-400 dark:hidden" />
              <Moon className="h-4 w-4 text-blue-400 hidden dark:block" />
              <span>تبديل المظهر (فاتح / داكن)</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
