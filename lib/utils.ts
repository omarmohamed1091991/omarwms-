import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// يسمح فقط بمسارات داخلية لإعادة التوجيه بعد تسجيل الدخول.
export function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : undefined
}
