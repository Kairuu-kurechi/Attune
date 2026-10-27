import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps {
  title: string
  icon: ReactNode
  meta?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  labelledBy: string
}

export function GlassPanel({
  title,
  icon,
  meta,
  children,
  className,
  bodyClassName,
  labelledBy,
}: GlassPanelProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/40 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400">
            {icon}
          </span>
          <h2 id={labelledBy} className="text-sm font-medium tracking-tight text-zinc-100">
            {title}
          </h2>
        </div>
        {meta}
      </header>
      <div className={cn('relative min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}
