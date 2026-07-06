declare var process: any

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

declare module 'mysql2/promise' {
  const mod: any
  export = mod
}

declare module 'node:assert/strict' {
  const mod: any
  export = mod
}

declare module 'next/link' {
  const Link: any
  export default Link
}

declare module 'next/navigation' {
  export function useRouter(): any
  export function usePathname(): string
  export function redirect(url: string): never
  export function notFound(): never
}

declare module 'next/server' {
  export const NextResponse: any
}

declare module 'lucide-react' {
  export const Bell: any
  export const Search: any
  export const BadgeDollarSign: any
  export const BriefcaseBusiness: any
  export const ClipboardList: any
  export const LayoutDashboard: any
  export const ShieldCheck: any
  export const SquareKanban: any
  export const Users: any
  export const Warehouse: any
  export const Wrench: any
  export type LucideIcon = any
}

