// أدوات مشتركة (خادم + متصفح) لقوالب رسائل تأكيد المواعيد. لا تستورد قاعدة البيانات هنا.

export const APPOINTMENT_VARIABLES = [
  { key: "name", token: "{{الاسم}}", label: "اسم المريض" },
  { key: "phone", token: "{{رقم_الجوال}}", label: "رقم الجوال" },
  { key: "date", token: "{{التاريخ}}", label: "التاريخ" },
  { key: "time", token: "{{الساعة}}", label: "الساعة" },
  { key: "doctor", token: "{{اسم_الطبيب}}", label: "اسم الطبيب" },
] as const

export type AppointmentVariable = (typeof APPOINTMENT_VARIABLES)[number]["key"]
export type AppointmentValues = Record<AppointmentVariable, string>

export const DEFAULT_APPOINTMENT_TEMPLATE = {
  name: "تأكيد موعد",
  body: "مرحباً {{الاسم}} 👋\nنؤكد لك موعدك مع {{اسم_الطبيب}} يوم {{التاريخ}} الساعة {{الساعة}}.\nنرجو الحضور قبل الموعد بـ 10 دقائق، وللتعديل أو الإلغاء يرجى الرد على هذه الرسالة.\nرقم الجوال المسجل: {{رقم_الجوال}}",
}

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g
const TOKEN_TO_KEY = new Map(APPOINTMENT_VARIABLES.map((v) => [v.token.slice(2, -2), v.key as AppointmentVariable]))

/** المتغيرات الخاصة بقوالب Meta (مثل {{1}} أو {{patient_name}}) بالترتيب، دون متغيرات الموقع العربية. */
export function extractMetaPlaceholders(body: string) {
  const found: string[] = []
  for (const match of body.matchAll(PLACEHOLDER)) {
    const name = match[1]
    if (!TOKEN_TO_KEY.has(name) && !found.includes(name)) found.push(name)
  }
  return found.sort((a, b) => (/^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : 0))
}

/** يستبدل متغيرات الموقع ومتغيرات قالب Meta (حسب paramMap) بالقيم الفعلية. */
export function renderAppointmentMessage(body: string, values: Partial<AppointmentValues>, paramMap: Record<string, string> = {}) {
  return body.replace(PLACEHOLDER, (whole, name: string) => {
    const key = TOKEN_TO_KEY.get(name) ?? (paramMap[name] as AppointmentVariable | undefined)
    if (!key) return whole
    const value = values[key]?.trim()
    return value || whole
  })
}

export function formatAppointmentDate(iso: string) {
  if (!iso) return ""
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

export function formatAppointmentTime(hhmm: string) {
  if (!hhmm) return ""
  const [h, m] = hhmm.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
}

export const COUNTRY_CODES = [
  { code: "966", name: "السعودية", flag: "🇸🇦" },
  { code: "20", name: "مصر", flag: "🇪🇬" },
  { code: "971", name: "الإمارات", flag: "🇦🇪" },
  { code: "965", name: "الكويت", flag: "🇰🇼" },
  { code: "974", name: "قطر", flag: "🇶🇦" },
  { code: "973", name: "البحرين", flag: "🇧🇭" },
  { code: "968", name: "عمان", flag: "🇴🇲" },
  { code: "962", name: "الأردن", flag: "🇯🇴" },
]

/** يحوّل الرقم المحلي (05xxxxxxx) إلى صيغة دولية بدون + كما يطلبها واتساب. */
export function normalizePhone(phone: string, countryCode: string) {
  const cleaned = phone.replace(/\D/g, "").replace(/^00/, "")
  if (!cleaned) return ""
  if (COUNTRY_CODES.some((c) => cleaned.startsWith(c.code) && cleaned.length > c.code.length + 7)) return cleaned
  if (cleaned.startsWith("0")) return `${countryCode}${cleaned.slice(1)}`
  return `${countryCode}${cleaned}`
}
