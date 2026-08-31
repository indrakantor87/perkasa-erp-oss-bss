import Link from 'next/link'
import type { ReactNode } from 'react'

export type BreadcrumbItem = {
  label: string
  href?: string
}

type PageHeaderProps = {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  eyebrow?: string
  className?: string
  titleClassName?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  eyebrow,
  className = '',
  titleClassName = '',
}: PageHeaderProps) {
  return (
    <div
      className={[
        'flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0 space-y-3">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="min-w-0 flex items-center gap-1.5 overflow-x-auto">
            <ol className="flex items-center gap-1 text-xs">
              {breadcrumbs.map((item, index) => {
                const last = index === breadcrumbs.length - 1
                const content = last ? (
                  <span
                    className={
                      last
                        ? 'font-semibold text-inkStrong'
                        : 'text-mute hover:text-ink'
                    }
                    aria-current={last ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <span className="text-mute hover:text-ink">{item.label}</span>
                )
                return (
                  <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                    {item.href && !last ? (
                      <Link
                        href={item.href}
                        prefetch={false}
                        className="transition-colors duration-fast focus-visible:shadow-focus rounded-control px-1"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                    {!last ? (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mx-1 h-3 w-3 text-mute/60"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L9.94 11 7.23 8.29a.75.75 0 111.06-1.06l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </nav>
        ) : null}

        <div className="space-y-1.5">
          {eyebrow ? (
            <p className="section-title !text-muteStrong">{eyebrow}</p>
          ) : null}
          <h1
            className={[
              'font-[family-name:var(--font-heading)] tracking-tight text-inkStrong leading-tight',
              'text-[26px] font-semibold sm:text-[28px] lg:text-3xl',
              titleClassName,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-mute">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
