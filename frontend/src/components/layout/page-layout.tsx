import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type PageLayoutProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Full-bleed app page shell — no narrow max-width centering. */
export function PageLayout({
  title,
  description,
  actions,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn('flex w-full flex-col gap-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  )
}
