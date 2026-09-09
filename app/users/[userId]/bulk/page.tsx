import BulkMessagesClient from "@/components/users/bulk-messages-client"

export const revalidate = 0

export default async function BulkMessagesPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  return <BulkMessagesClient userId={userId} />
}
