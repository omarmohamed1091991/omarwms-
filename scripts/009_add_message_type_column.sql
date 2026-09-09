-- إضافة عمود message_type لجدول individual_messages إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'individual_messages' 
                   AND column_name = 'message_type') THEN
        ALTER TABLE individual_messages ADD COLUMN message_type text DEFAULT 'template';
    END IF;
END $$;

-- إضافة عمود delivery_status لتتبع حالة التسليم الفعلية
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'individual_messages' 
                   AND column_name = 'delivery_status') THEN
        ALTER TABLE individual_messages ADD COLUMN delivery_status text DEFAULT 'pending';
    END IF;
END $$;

-- إضافة عمود whatsapp_message_id لتتبع ID الرسالة من WhatsApp
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'individual_messages' 
                   AND column_name = 'whatsapp_message_id') THEN
        ALTER TABLE individual_messages ADD COLUMN whatsapp_message_id text;
    END IF;
END $$;

-- إضافة نفس الأعمدة لجدول bulk_message_recipients
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bulk_message_recipients' 
                   AND column_name = 'delivery_status') THEN
        ALTER TABLE bulk_message_recipients ADD COLUMN delivery_status text DEFAULT 'pending';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bulk_message_recipients' 
                   AND column_name = 'whatsapp_message_id') THEN
        ALTER TABLE bulk_message_recipients ADD COLUMN whatsapp_message_id text;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bulk_message_recipients' 
                   AND column_name = 'error_message') THEN
        ALTER TABLE bulk_message_recipients ADD COLUMN error_message text;
    END IF;
END $$;
