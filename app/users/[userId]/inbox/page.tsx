import { InboxClient } from "@/components/users/inbox-client"
import { fetchMessagesFromServer } from "./actions"

export const revalidate = 0

export default async function InboxPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const initialMessages = await fetchMessagesFromServer(userId)

  return <InboxClient userId={userId} initialMessages={initialMessages} />
}
