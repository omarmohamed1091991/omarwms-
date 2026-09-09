import FreeMessagesClient from "@/components/users/free-messages-client"

export const revalidate = 0

export default async function FreeMessagesPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  return <FreeMessagesClient userId={userId} />
}
