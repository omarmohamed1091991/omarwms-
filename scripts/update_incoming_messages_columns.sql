-- إضافة أعمدة جديدة لجدول incoming_messages لدعم الرد على الرسائل

-- إضافة عمود اسم المرسل
ALTER TABLE incoming_messages 
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- إضافة عمود نوع الرسالة
ALTER TABLE incoming_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- إضافة عمود اتجاه الرسالة (واردة أو صادرة)
ALTER TABLE incoming_messages 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'incoming';

-- إضافة عمود معرف رسالة WhatsApp
ALTER TABLE incoming_messages 
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_incoming_messages_direction 
ON incoming_messages(direction);

CREATE INDEX IF NOT EXISTS idx_incoming_messages_sender_phone 
ON incoming_messages(sender_phone);
