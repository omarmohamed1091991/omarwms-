export interface UserProfile {
  id: string
  phone_number: string
  full_name: string | null
  whatsapp_instance_id: string | null
  whatsapp_token: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  role: "admin" | "user" // إضافة role
  email: string | null // إضافة email
  password_changed_at: string | null // إضافة password_changed_at
}

export interface IndividualMessage {
  id: string
  user_id: string
  recipient_phone: string
  message_text: string
  media_url: string | null
  status: "pending" | "sent" | "delivered" | "failed"
  sent_at: string | null
  created_at: string
}

export interface BulkMessage {
  id: string
  user_id: string
  campaign_name: string
  message_text: string
  media_url: string | null
  total_recipients: number
  sent_count: number
  failed_count: number
  status: "draft" | "sending" | "completed" | "failed"
  created_at: string
  completed_at: string | null
}

export interface BulkMessageRecipient {
  id: string
  bulk_message_id: string
  recipient_phone: string
  status: "pending" | "sent" | "delivered" | "failed"
  sent_at: string | null
  created_at: string
}

export interface IncomingMessage {
  id: string
  user_id: string
  sender_phone: string
  message_text: string | null
  media_url: string | null
  is_read: boolean
  received_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  webhook_url: string | null
  auto_reply_enabled: boolean
  auto_reply_message: string | null
  notification_email: string | null
  created_at: string
  updated_at: string
}
