import { TemplateBuilderClient } from "@/components/templates/template-builder-client"

export const dynamic = "force-dynamic"

export default async function TemplatesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  return <TemplateBuilderClient userId={userId} />
}
