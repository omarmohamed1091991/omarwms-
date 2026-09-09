-- جدول معلومات المستخدمين الإضافية
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  full_name TEXT,
  whatsapp_instance_id TEXT,
  whatsapp_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الرسائل الفردية
CREATE TABLE IF NOT EXISTS public.individual_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  media_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الرسائل الجماعية
CREATE TABLE IF NOT EXISTS public.bulk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  media_url TEXT,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, sending, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- جدول المستلمين للرسائل الجماعية
CREATE TABLE IF NOT EXISTS public.bulk_message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_message_id UUID NOT NULL REFERENCES public.bulk_messages(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الرسائل الواردة
CREATE TABLE IF NOT EXISTS public.incoming_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_phone TEXT NOT NULL,
  message_text TEXT,
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول إعدادات المستخدم
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT,
  notification_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول user_profiles
CREATE POLICY "Users can view their own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- سياسات الأمان لجدول individual_messages
CREATE POLICY "Users can view their own individual messages" 
  ON public.individual_messages FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own individual messages" 
  ON public.individual_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own individual messages" 
  ON public.individual_messages FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own individual messages" 
  ON public.individual_messages FOR DELETE 
  USING (auth.uid() = user_id);

-- سياسات الأمان لجدول bulk_messages
CREATE POLICY "Users can view their own bulk messages" 
  ON public.bulk_messages FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bulk messages" 
  ON public.bulk_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk messages" 
  ON public.bulk_messages FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bulk messages" 
  ON public.bulk_messages FOR DELETE 
  USING (auth.uid() = user_id);

-- سياسات الأمان لجدول bulk_message_recipients
CREATE POLICY "Users can view recipients of their own bulk messages" 
  ON public.bulk_message_recipients FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.bulk_messages 
      WHERE bulk_messages.id = bulk_message_recipients.bulk_message_id 
      AND bulk_messages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipients for their own bulk messages" 
  ON public.bulk_message_recipients FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bulk_messages 
      WHERE bulk_messages.id = bulk_message_recipients.bulk_message_id 
      AND bulk_messages.user_id = auth.uid()
    )
  );

-- سياسات الأمان لجدول incoming_messages
CREATE POLICY "Users can view their own incoming messages" 
  ON public.incoming_messages FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own incoming messages" 
  ON public.incoming_messages FOR UPDATE 
  USING (auth.uid() = user_id);

-- سياسات الأمان لجدول user_settings
CREATE POLICY "Users can view their own settings" 
  ON public.user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
  ON public.user_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
  ON public.user_settings FOR UPDATE 
  USING (auth.uid() = user_id);

-- إنشاء indexes لتحسين الأداء
CREATE INDEX idx_user_profiles_phone ON public.user_profiles(phone_number);
CREATE INDEX idx_individual_messages_user ON public.individual_messages(user_id);
CREATE INDEX idx_bulk_messages_user ON public.bulk_messages(user_id);
CREATE INDEX idx_incoming_messages_user ON public.incoming_messages(user_id);
CREATE INDEX idx_user_settings_user ON public.user_settings(user_id);
