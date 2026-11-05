import type { SVGProps } from "react"

type LogoProps = SVGProps<SVGSVGElement> & { title?: string }

/** WhatsApp glyph (official brand green). */
export function WhatsAppLogo({ title = "WhatsApp", ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>{title}</title>
      <path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
      />
    </svg>
  )
}

/** WhatsApp Business glyph: chat bubble with a "B" mark. */
export function WhatsAppBusinessLogo({ title = "WhatsApp Business", ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>{title}</title>
      <path fill="#25D366" d="M24 3C12.4 3 3 12.4 3 24c0 3.9 1.1 7.6 3 10.8L3 45l10.5-2.8A20.9 20.9 0 0 0 24 45c11.6 0 21-9.4 21-21S35.6 3 24 3Z" />
      <path fill="#fff" d="M24 7.2c-9.3 0-16.8 7.5-16.8 16.8 0 3.4 1 6.6 2.8 9.3l-1.8 6.4 6.6-1.7A16.7 16.7 0 0 0 24 40.8c9.3 0 16.8-7.5 16.8-16.8S33.3 7.2 24 7.2Z" />
      <path
        fill="#128C7E"
        d="M17.5 14.5h7.4c3.6 0 5.8 1.8 5.8 4.6 0 1.9-1.1 3.3-2.7 3.9 2.1.5 3.5 2.1 3.5 4.3 0 3.2-2.5 5.2-6.4 5.2h-7.6v-18Zm4.1 3.3v4h2.6c1.4 0 2.3-.8 2.3-2s-.9-2-2.3-2h-2.6Zm0 7v4.9h3c1.6 0 2.6-.9 2.6-2.5 0-1.5-1-2.4-2.7-2.4h-2.9Z"
      />
    </svg>
  )
}

/** Meta infinity mark (brand blue gradient). */
export function MetaLogo({ title = "Meta", ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 28" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="meta-logo-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0064E0" />
          <stop offset="55%" stopColor="#0073EE" />
          <stop offset="100%" stopColor="#0082FB" />
        </linearGradient>
      </defs>
      <path
        fill="none"
        stroke="url(#meta-logo-gradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M24 14C20 7.5 16.5 4 12.5 4 7.5 4 4 9.5 4 16c0 4.6 2.6 8 6.6 8 5.4 0 8.6-5.6 13.4-10s8-10 13.4-10c4 0 6.6 3.4 6.6 8 0 6.5-3.5 12-8.5 12-4 0-7.5-3.5-11.5-10"
      />
    </svg>
  )
}

/** Meta Business Suite: Meta mark inside a rounded tile. */
export function MetaBusinessSuiteLogo({ title = "Meta Business Suite", ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="meta-suite-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0064E0" />
          <stop offset="100%" stopColor="#0082FB" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#meta-suite-gradient)" />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M24 24c-2.6-4.3-4.9-6.6-7.5-6.6-3.3 0-5.6 3.6-5.6 7.9 0 3 1.7 5.2 4.4 5.2 3.5 0 5.6-3.7 8.7-6.5s5.2-6.6 8.7-6.6c2.7 0 4.4 2.2 4.4 5.2 0 4.3-2.3 7.9-5.6 7.9-2.6 0-4.9-2.3-7.5-6.5"
      />
    </svg>
  )
}
