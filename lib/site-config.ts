export const siteConfig = {
  name: "OWMS",
  legalName: "OWMS (o-wms)",
  url: "https://owms.site",
  email: "support@owms.site",
  phones: {
    egypt: { label: "مصر", labelEn: "Egypt", display: "+20 102 888 8236", tel: "+201028888236" },
    ksa: { label: "السعودية", labelEn: "KSA", display: "+966 56 652 9235", tel: "+966566529235" },
  },
  address: {
    ar: "مدينة 6 أكتوبر، الجيزة، جمهورية مصر العربية",
    en: "6th of October City, Giza, Egypt",
  },
  lastUpdated: "11 أكتوبر 2026",
}

export const mainNav = [
  { href: "/", label: "الرئيسية" },
  { href: "/#pricing", label: "الأسعار" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "اتصل بنا" },
]

export const legalNav = [
  { href: "/privacy-policy", label: "سياسة الخصوصية", labelEn: "Privacy Policy" },
  { href: "/refund-policy", label: "سياسة الاسترجاع والإلغاء", labelEn: "Refund & Cancellation" },
  { href: "/terms", label: "الشروط والأحكام وسياسة التسليم", labelEn: "Terms & Digital Delivery" },
]

export type PricingPlan = {
  id: string
  name: string
  nameEn: string
  description: string
  priceEgp: number
  priceSar: number
  period: string
  featured?: boolean
  features: string[]
}

// الأسعار شهرية وشاملة. سعر الريال السعودي هو المعادل المعتمد لكل باقة.
export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "الباقة الأساسية",
    nameEn: "Starter",
    description: "للأفراد والمشاريع الناشئة التي تبدأ التواصل عبر واتساب",
    priceEgp: 499,
    priceSar: 39,
    period: "شهرياً",
    features: [
      "مستخدم واحد",
      "رقم واتساب أعمال واحد",
      "حتى 1,000 رسالة جماعية شهرياً",
      "صندوق وارد مشترك",
      "تقارير أساسية",
      "دعم فني عبر البريد الإلكتروني",
    ],
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
    nameEn: "Professional",
    description: "للشركات الصغيرة والمتوسطة التي تحتاج حملات منتظمة",
    priceEgp: 999,
    priceSar: 77,
    period: "شهرياً",
    featured: true,
    features: [
      "حتى 3 مستخدمين",
      "رقم واتساب أعمال واحد",
      "حتى 5,000 رسالة جماعية شهرياً",
      "صندوق وارد مشترك ومكتبة وسائط",
      "تقارير وإحصائيات متقدمة",
      "دعم فني عبر واتساب والبريد",
    ],
  },
  {
    id: "business",
    name: "باقة الأعمال",
    nameEn: "Business",
    description: "للشركات والوكالات ذات أحجام الإرسال الكبيرة",
    priceEgp: 1999,
    priceSar: 155,
    period: "شهرياً",
    features: [
      "حتى 10 مستخدمين",
      "حتى 3 أرقام واتساب أعمال",
      "حتى 20,000 رسالة جماعية شهرياً",
      "جميع مزايا الباقة الاحترافية",
      "مدير حساب مخصص",
      "أولوية في الدعم الفني",
    ],
  },
]

export function formatPrice(value: number) {
  return value.toLocaleString("en-US")
}
