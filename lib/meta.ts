export const GRAPH_API_VERSION = "v21.0"

// إعدادات تطبيق Meta الخاص بالمنصة والمستخدمة في الربط التلقائي (Embedded Signup)
export function getMetaConfig() {
  return {
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || "",
    configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || "",
  }
}

// القيم العامة فقط (بدون الـ App Secret) لتمريرها إلى المتصفح
export function getPublicMetaConfig() {
  const { appId, appSecret, configId } = getMetaConfig()
  return { appId, configId, enabled: Boolean(appId && configId && appSecret) }
}
