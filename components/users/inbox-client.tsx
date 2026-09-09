"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  CheckCheck,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Mic,
  FileText,
  FileSpreadsheet,
  MessageCircle,
  Download,
  X,
} from "lucide-react"
import { sendReplyMessage, fetchMessagesFromServer } from "@/app/users/[userId]/inbox/actions"
import jsPDF from "jspdf"

type FilterType = "all" | "unread" | "read"

interface IncomingMessage {
  id: string
  sender_phone: string
  sender_name: string | null
  message_text: string
  message_type: string
  media_url: string | null
  is_read: boolean
  received_at: string
  direction: "incoming" | "outgoing"
}

interface ConversationGroup {
  sender_phone: string
  sender_name: string | null
  messages: IncomingMessage[]
  lastMessage: IncomingMessage
  unreadCount: number
}

export function InboxClient({ userId, initialMessages = [] }: { userId: string; initialMessages?: any[] }) {
  const [conversations, setConversations] = useState<ConversationGroup[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [replyMessage, setReplyMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [exportMode, setExportMode] = useState(false)
  const [selectedForExport, setSelectedForExport] = useState<string[]>([])
  const [exportType, setExportType] = useState<"pdf" | "excel">("pdf")
  const [refreshing, setRefreshing] = useState(false)
  const [totalMessages, setTotalMessages] = useState(0)
  const [allMessages, setAllMessages] = useState<IncomingMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const selectedConversationRef = useRef<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    selectedConversationRef.current = selectedConversation?.sender_phone || null
  }, [selectedConversation])

  const buildConversations = useCallback((messages: IncomingMessage[]) => {
    if (messages.length === 0) {
      setConversations([])
      return
    }

    setTotalMessages(messages.length)

    const grouped = messages.reduce(
      (acc, msg) => {
        if (!acc[msg.sender_phone]) {
          acc[msg.sender_phone] = []
        }
        acc[msg.sender_phone].push({
          ...msg,
          direction: msg.direction || "incoming",
        })
        return acc
      },
      {} as Record<string, IncomingMessage[]>,
    )

    const conversationsList: ConversationGroup[] = Object.entries(grouped).map(([phone, msgs]) => {
      const latestNameMsg = (msgs as IncomingMessage[]).filter((m) => m.sender_name).pop()
      return {
        sender_phone: phone,
        sender_name: latestNameMsg?.sender_name || (msgs as IncomingMessage[])[0]?.sender_name || null,
        messages: (msgs as IncomingMessage[]).sort(
          (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
        ),
        lastMessage: (msgs as IncomingMessage[])[(msgs as IncomingMessage[]).length - 1],
        unreadCount: (msgs as IncomingMessage[]).filter((m) => !m.is_read && m.direction === "incoming").length,
      }
    })

    const sortedConversations = conversationsList.sort(
      (a, b) => new Date(b.lastMessage.received_at).getTime() - new Date(a.lastMessage.received_at).getTime(),
    )

    setConversations(sortedConversations)

    if (selectedConversationRef.current) {
      const updated = sortedConversations.find((c) => c.sender_phone === selectedConversationRef.current)
      if (updated) {
        setSelectedConversation(updated)
      }
    }
  }, [])

  const addNewMessage = useCallback(
    (newMessage: any) => {
      const formattedMessage: IncomingMessage = {
        id: newMessage.id,
        sender_phone: newMessage.sender_phone,
        sender_name: newMessage.sender_name || null,
        message_text: newMessage.message_text || "",
        message_type: newMessage.message_type || "text",
        media_url: newMessage.media_url || null,
        is_read: newMessage.is_read || false,
        received_at: newMessage.received_at,
        direction: newMessage.direction || "incoming",
      }

      setAllMessages((prev) => {
        if (prev.some((m) => m.id === formattedMessage.id)) {
          return prev
        }
        const updated = [...prev, formattedMessage]
        buildConversations(updated)
        return updated
      })
    },
    [buildConversations],
  )

  const updateMessage = useCallback(
    (updatedMessage: any) => {
      setAllMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === updatedMessage.id
            ? { ...m, ...updatedMessage, direction: updatedMessage.direction || m.direction }
            : m,
        )
        buildConversations(updated)
        return updated
      })
    },
    [buildConversations],
  )

  const deleteMessage = useCallback(
    (deletedId: string) => {
      setAllMessages((prev) => {
        const updated = prev.filter((m) => m.id !== deletedId)
        buildConversations(updated)
        return updated
      })
    },
    [buildConversations],
  )

  const loadMessages = useCallback(async () => {
    try {
      const messages = await fetchMessagesFromServer(userId)
      setAllMessages(messages)
      buildConversations(messages)
      setLoading(false)
    } catch (error) {
      console.error("Error loading messages:", error)
      setLoading(false)
    }
  }, [userId, buildConversations])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMessages()
    setRefreshing(false)
  }

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setAllMessages(initialMessages)
      buildConversations(initialMessages)
      setLoading(false)
    } else {
      loadMessages()
    }

    const channel = supabase
      .channel(`inbox_realtime_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incoming_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addNewMessage(payload.new)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "incoming_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          updateMessage(payload.new)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "incoming_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          deleteMessage(payload.old.id)
        },
      )
      .subscribe()

    const interval = setInterval(() => {
      loadMessages()
    }, 30000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [userId, initialMessages, buildConversations, loadMessages, addNewMessage, updateMessage, deleteMessage, supabase])

  useEffect(() => {
    if (messagesContainerRef.current && selectedConversation) {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      })
    }
  }, [selectedConversation])

  async function markAsRead(conversationPhone: string) {
    await supabase
      .from("incoming_messages")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("sender_phone", conversationPhone)

    loadMessages()
  }

  async function handleSendReply() {
    if (!replyMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    try {
      const result = await sendReplyMessage(userId, selectedConversation.sender_phone, replyMessage.trim())

      if (result.success) {
        setReplyMessage("")
        await loadMessages()
      } else {
        if (result.errorType === "TOKEN_EXPIRED") {
          alert(
            `⚠️ ${result.error}\n\n` +
              `الخطوات المطلوبة:\n` +
              `1. اذهب إلى صفحة الإعدادات\n` +
              `2. احصل على رمز وصول (Access Token) جديد من Meta Developer Dashboard\n` +
              `3. قم بتحديث الرمز في حقل "Access Token"\n` +
              `4. احفظ التغييرات`,
          )
        } else {
          alert(result.error || "فشل إرسال الرسالة")
        }
      }
    } catch (error) {
      console.error("Error sending reply:", error)
      alert("حدث خطأ أثناء إرسال الرسالة")
    } finally {
      setSending(false)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  function selectConversation(conv: ConversationGroup) {
    setSelectedConversation(conv)
    setShowMobileChat(true)
    if (conv.unreadCount > 0) {
      markAsRead(conv.sender_phone)
    }
  }

  function formatPhoneNumber(phone: string) {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length >= 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
    } else if (cleaned.length >= 10) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    return `+${cleaned}`
  }

  function getDisplayName(conv: ConversationGroup) {
    if (conv.sender_name && conv.sender_name.trim() !== "") {
      return conv.sender_name
    }
    return formatPhoneNumber(conv.sender_phone)
  }

  function getInitials(conv: ConversationGroup) {
    if (conv.sender_name && conv.sender_name.trim() !== "") {
      return conv.sender_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    }
    return conv.sender_phone.slice(-2)
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffTime = todayStart.getTime() - messageDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const period = hours >= 12 ? "م" : "ص"
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
    } else if (diffDays === 1) {
      return "أمس"
    } else if (diffDays < 7) {
      const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
      return days[date.getDay()]
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    }
  }

  function exportSelectedToPDF() {
    const conversationsToExport = conversations.filter((c) => selectedForExport.includes(c.sender_phone))
    if (conversationsToExport.length === 0) return

    const exportData = {
      conversations: conversationsToExport.map((conv) => ({
        sender_phone: conv.sender_phone,
        sender_name: conv.sender_name,
        messages: conv.messages.map((msg) => ({
          ...msg,
          direction: msg.direction || "incoming",
        })),
      })),
    }

    localStorage.setItem("exportData", JSON.stringify(exportData))
    window.open(`/users/${userId}/inbox/export`, "_blank", "width=1200,height=800")

    setExportMode(false)
    setSelectedForExport([])
  }

  function exportSelectedToExcel() {
    const conversationsToExport = conversations.filter((c) => selectedForExport.includes(c.sender_phone))
    if (conversationsToExport.length === 0) return

    const rows = [["اسم العميل", "رقم الجوال", "التاريخ", "الوقت", "الاتجاه", "نوع الرسالة", "محتوى الرسالة", "الحالة"]]

    conversationsToExport.forEach((conv) => {
      const displayName = conv.sender_name || formatPhoneNumber(conv.sender_phone)
      const phoneNumber = formatPhoneNumber(conv.sender_phone)

      conv.messages.forEach((msg) => {
        const dateObj = new Date(msg.received_at)
        const dateStr = dateObj.toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        const timeStr = dateObj.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        const direction = msg.direction === "outgoing" ? "مُرسلة" : "واردة"
        const messageType = msg.message_type || "text"
        let messageContent = msg.message_text || ""

        if (!messageContent && messageType !== "text") {
          messageContent = `[رسالة ${messageType.toUpperCase()}]`
        }

        rows.push([
          displayName,
          phoneNumber,
          dateStr,
          timeStr,
          direction,
          messageType.toUpperCase(),
          messageContent.replace(/"/g, '""'),
          msg.is_read ? "مقروءة" : "غير مقروءة",
        ])
      })

      rows.push(["", "", "", "", "", "", "", ""])
    })

    const csvContent =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell)
              return `"${cellStr}"`
            })
            .join(","),
        )
        .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `محادثات-واتساب-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    setExportMode(false)
    setSelectedForExport([])
  }

  function exportCurrentToPDF() {
    if (!selectedConversation) return

    const doc = new jsPDF()
    let yPos = 20

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("محادثة واتساب", 105, yPos, { align: "center" })
    yPos += 10

    doc.setDrawColor(0, 150, 136)
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 190, yPos)
    yPos += 10

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    const displayName = selectedConversation.sender_name || formatPhoneNumber(selectedConversation.sender_phone)
    doc.text(`اسم العميل: ${displayName}`, 20, yPos)
    yPos += 7

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`رقم الجوال: ${formatPhoneNumber(selectedConversation.sender_phone)}`, 20, yPos)
    yPos += 7

    doc.text(`عدد الرسائل: ${selectedConversation.messages.length}`, 20, yPos)
    yPos += 7

    doc.text(`التاريخ: ${new Date().toLocaleString("ar-SA")}`, 20, yPos)
    yPos += 15

    doc.setDrawColor(200, 200, 200)
    doc.line(20, yPos, 190, yPos)
    yPos += 10

    doc.setFontSize(11)
    selectedConversation.messages.forEach((msg, index) => {
      if (yPos > 260) {
        doc.addPage()
        yPos = 20
      }

      const dateObj = new Date(msg.received_at)
      const dateStr = dateObj.toLocaleDateString("ar-SA")
      const timeStr = dateObj.toLocaleTimeString("ar-SA")
      const direction = msg.direction === "outgoing" ? "مُرسلة ←" : "واردة →"

      doc.setFont("helvetica", "bold")
      doc.setTextColor(
        msg.direction === "outgoing" ? 0 : 66,
        msg.direction === "outgoing" ? 150 : 66,
        msg.direction === "outgoing" ? 136 : 66,
      )
      doc.text(direction, 20, yPos)

      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`${dateStr} | ${timeStr}`, 190, yPos, { align: "right" })
      yPos += 6

      doc.setTextColor(0, 0, 0)
      const messageText = msg.message_text || `[${msg.message_type?.toUpperCase() || "MEDIA"}]`
      const lines = doc.splitTextToSize(messageText, 165)
      lines.forEach((line) => {
        if (yPos > 260) {
          doc.addPage()
          yPos = 20
        }
        doc.text(line, 25, yPos)
        yPos += 5
      })

      yPos += 8

      if (index < selectedConversation.messages.length - 1) {
        doc.setDrawColor(230, 230, 230)
        doc.line(20, yPos, 190, yPos)
        yPos += 5
      }
    })

    doc.save(`محادثة-${selectedConversation.sender_phone}-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  function exportCurrentToExcel() {
    if (!selectedConversation) return

    const displayName = selectedConversation.sender_name || "Unknown"
    const phoneNumber = formatPhoneNumber(selectedConversation.sender_phone)

    const rows = [
      ["اسم العميل", displayName],
      ["رقم الجوال", phoneNumber],
      ["التاريخ", new Date().toLocaleString("ar-SA")],
      ["عدد الرسائل", selectedConversation.messages.length.toString()],
      [],
      ["التاريخ", "الوقت", "الاتجاه", "نوع الرسالة", "محتوى الرسالة", "الحالة"],
    ]

    selectedConversation.messages.forEach((msg) => {
      const dateObj = new Date(msg.received_at)
      const dateStr = dateObj.toLocaleDateString("ar-SA")
      const timeStr = dateObj.toLocaleTimeString("ar-SA")
      const direction = msg.direction === "outgoing" ? "مُرسلة" : "واردة"
      const messageType = msg.message_type || "text"
      const messageContent = msg.message_text || `[${messageType.toUpperCase()}]`

      rows.push([
        dateStr,
        timeStr,
        direction,
        messageType.toUpperCase(),
        `"${messageContent.replace(/"/g, '""')}"`,
        msg.is_read ? "مقروءة" : "غير مقروءة",
      ])
    })

    const csvContent = rows.map((row) => row.join(",")).join("\n")
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `محادثة-${selectedConversation.sender_phone}-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const filteredConversations = conversations.filter((conv) => {
    const matchesFilter = filter === "all" ? true : filter === "unread" ? conv.unreadCount > 0 : conv.unreadCount === 0
    const matchesSearch =
      conv.sender_phone.includes(searchQuery) ||
      conv.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.message_text?.includes(searchQuery)
    return matchesFilter && matchesSearch
  })

  const startExportMode = (type: "pdf" | "excel") => {
    setExportMode(true)
    setExportType(type)
  }

  const cancelExportMode = () => {
    setExportMode(false)
    setSelectedForExport([])
  }

  const selectAllForExport = () => {
    if (selectedForExport.length === filteredConversations.length) {
      setSelectedForExport([])
    } else {
      setSelectedForExport(filteredConversations.map((conv) => conv.sender_phone))
    }
  }

  const executeExport = () => {
    if (exportType === "pdf") {
      exportSelectedToPDF()
    } else if (exportType === "excel") {
      exportSelectedToExcel()
    }
  }

  const toggleExportSelection = (phone: string) => {
    setSelectedForExport((prev) => (prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]))
  }

  return (
    <div
      className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden shadow-2xl border border-[#222d34]"
      style={{ backgroundColor: "#111b21" }}
    >
      <div
        className={`${showMobileChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-[380px] border-l border-[#222d34]`}
        style={{ backgroundColor: "#111b21" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#202c33" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#00a884" }}
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-semibold text-lg" style={{ color: "#ffffff" }}>
              صندوق الوارد
            </h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-[#2a3942]" style={{ color: "#aebac1" }}>
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              style={{ backgroundColor: "#233138", borderColor: "#374248" }}
            >
              <DropdownMenuItem
                onClick={() => startExportMode("pdf")}
                className="cursor-pointer hover:bg-[#2a3942]"
                style={{ color: "#e9edef" }}
              >
                <FileText className="w-4 h-4 ml-2" />
                تصدير المحادثات PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => startExportMode("excel")}
                className="cursor-pointer hover:bg-[#2a3942]"
                style={{ color: "#e9edef" }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-2" />
                تصدير المحادثات Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ backgroundColor: "#374248" }} />
              <DropdownMenuItem
                onClick={handleRefresh}
                className="cursor-pointer hover:bg-[#2a3942]"
                style={{ color: "#e9edef" }}
              >
                تحديث المحادثات
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {exportMode && (
          <div className="px-3 py-3 flex items-center justify-between gap-2" style={{ backgroundColor: "#1f2c34" }}>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelExportMode}
                className="hover:bg-[#2a3942]"
                style={{ color: "#ffffff" }}
              >
                <X className="w-5 h-5" />
              </Button>
              <span className="font-semibold" style={{ color: "#ffffff" }}>
                {selectedForExport.length} محادثة محددة
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllForExport}
                className="hover:bg-[#2a3942] text-sm"
                style={{ color: "#00a884" }}
              >
                {selectedForExport.length === filteredConversations.length ? "إلغاء الكل" : "تحديد الكل"}
              </Button>
              <Button
                size="sm"
                onClick={executeExport}
                disabled={selectedForExport.length === 0}
                className="gap-1"
                style={{
                  backgroundColor: selectedForExport.length > 0 ? "#00a884" : "#374248",
                  color: "#ffffff",
                }}
              >
                <Download className="w-4 h-4" />
                تصدير
              </Button>
            </div>
          </div>
        )}

        <div className="px-3 py-2" style={{ backgroundColor: "#111b21" }}>
          <div className="relative">
            <Search
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: "#8696a0" }}
            />
            <Input
              placeholder="ابحث عن محادثة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 border-0 rounded-lg h-9 focus-visible:ring-1"
              style={
                {
                  backgroundColor: "#202c33",
                  color: "#ffffff",
                  "--tw-ring-color": "#00a884",
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            {[
              { key: "all", label: "الكل" },
              { key: "unread", label: "غير مقروء" },
              { key: "read", label: "مقروء" },
            ].map((f) => (
              <Button
                key={f.key}
                variant="ghost"
                size="sm"
                onClick={() => setFilter(f.key as FilterType)}
                className="rounded-full px-4 text-sm"
                style={{
                  backgroundColor: filter === f.key ? "#00a884" : "#202c33",
                  color: filter === f.key ? "#ffffff" : "#8696a0",
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
          {!exportMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-3 gap-1 text-sm"
                  style={{ backgroundColor: "#202c33", color: "#8696a0" }}
                >
                  <Download className="w-4 h-4" />
                  تصدير
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                style={{ backgroundColor: "#233138", borderColor: "#374248" }}
              >
                <DropdownMenuItem
                  onClick={() => startExportMode("pdf")}
                  className="cursor-pointer hover:bg-[#2a3942]"
                  style={{ color: "#e9edef" }}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => startExportMode("excel")}
                  className="cursor-pointer hover:bg-[#2a3942]"
                  style={{ color: "#e9edef" }}
                >
                  <FileSpreadsheet className="w-4 h-4 ml-2" />
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#00a884" }}></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: "#8696a0" }}>
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>لا توجد محادثات</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.sender_phone}
                onClick={() => {
                  if (exportMode) {
                    toggleExportSelection(conv.sender_phone)
                  } else {
                    selectConversation(conv)
                  }
                }}
                className="flex items-center gap-3 px-3 py-3 cursor-pointer border-b transition-colors"
                style={{
                  borderColor: "#222d34",
                  backgroundColor:
                    exportMode && selectedForExport.includes(conv.sender_phone)
                      ? "#1a3d30"
                      : selectedConversation?.sender_phone === conv.sender_phone
                        ? "#2a3942"
                        : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!exportMode && selectedConversation?.sender_phone !== conv.sender_phone) {
                    e.currentTarget.style.backgroundColor = "#202c33"
                  }
                }}
                onMouseLeave={(e) => {
                  const isSelected = exportMode
                    ? selectedForExport.includes(conv.sender_phone)
                    : selectedConversation?.sender_phone === conv.sender_phone
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent"
                  } else if (exportMode) {
                    e.currentTarget.style.backgroundColor = "#1a3d30"
                  }
                }}
              >
                {exportMode && (
                  <div className="flex-shrink-0">
                    <Checkbox
                      checked={selectedForExport.includes(conv.sender_phone)}
                      onCheckedChange={() => toggleExportSelection(conv.sender_phone)}
                      className="border-[#8696a0] data-[state=checked]:bg-[#00a884] data-[state=checked]:border-[#00a884]"
                    />
                  </div>
                )}

                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: "#00a884" }}
                  >
                    {getInitials(conv)}
                  </div>
                  {!exportMode && conv.unreadCount > 0 && (
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#25d366" }}
                    >
                      <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex flex-col flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-[15px]" style={{ color: "#ffffff" }}>
                        {getDisplayName(conv)}
                      </h3>
                      {conv.sender_name && conv.sender_name.trim() !== "" && (
                        <p className="text-xs truncate" dir="ltr" style={{ color: "#8696a0" }}>
                          {formatPhoneNumber(conv.sender_phone)}
                        </p>
                      )}
                    </div>
                    {!exportMode && (
                      <span className="text-xs flex-shrink-0 mr-2" style={{ color: "#8696a0" }}>
                        {formatTime(conv.lastMessage.received_at)}
                      </span>
                    )}
                  </div>
                  {!exportMode && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate" style={{ color: "#8696a0" }}>
                        {conv.lastMessage.direction === "outgoing" && "أنت: "}
                        {conv.lastMessage.message_text || "رسالة وسائط"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#25d366" }}
                        >
                          <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {exportMode && (
                    <p className="text-sm" style={{ color: "#8696a0" }}>
                      {conv.messages.length} رسالة
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={`${showMobileChat ? "flex" : "hidden md:flex"} flex-1 flex-col`}
        style={{ backgroundColor: "#0b141a" }}
      >
        {selectedConversation ? (
          <>
            <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#202c33" }}>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden hover:bg-[#2a3942]"
                  style={{ color: "#aebac1" }}
                  onClick={() => setShowMobileChat(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: "#00a884" }}
                >
                  {getInitials(selectedConversation)}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-semibold text-base leading-tight" style={{ color: "#ffffff" }}>
                    {getDisplayName(selectedConversation)}
                  </h3>
                  <p className="text-sm" dir="ltr" style={{ color: "#8696a0" }}>
                    {formatPhoneNumber(selectedConversation.sender_phone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="hover:bg-[#2a3942]" style={{ color: "#aebac1" }}>
                  <Video className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-[#2a3942]"
                  style={{ color: "#aebac1" }}
                  onClick={() => window.open(`tel:${selectedConversation.sender_phone}`, "_self")}
                  title="اتصال هاتفي"
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-[#2a3942]" style={{ color: "#aebac1" }}>
                  <Search className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-1"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='412' height='412' viewBox='0 0 412 412' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23111b21' fillOpacity='0.4'%3E%3Ccircle cx='206' cy='206' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: "#0b141a",
              }}
            >
              {selectedConversation.messages.map((msg, index) => {
                const isOutgoing = msg.direction === "outgoing"
                const showDate =
                  index === 0 ||
                  new Date(msg.received_at).toDateString() !==
                    new Date(selectedConversation.messages[index - 1].received_at).toDateString()

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span
                          className="text-xs px-3 py-1 rounded-lg shadow"
                          style={{ backgroundColor: "#182229", color: "#8696a0" }}
                        >
                          {new Date(msg.received_at).toLocaleDateString("ar-SA", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-1`}>
                      <div
                        className="max-w-[65%] rounded-lg px-3 py-2 shadow"
                        style={{
                          backgroundColor: isOutgoing ? "#005c4b" : "#202c33",
                          color: "#ffffff",
                        }}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 ${isOutgoing ? "text-[#ffffff99]" : "text-[#ffffff80]"}`}
                        >
                          <span className="text-[11px]">
                            {new Date(msg.received_at).toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isOutgoing && <CheckCheck className="w-4 h-4" style={{ color: "#53bdeb" }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3" style={{ backgroundColor: "#202c33" }}>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="hover:bg-[#2a3942]" style={{ color: "#8696a0" }}>
                  <Smile className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-[#2a3942]" style={{ color: "#8696a0" }}>
                  <Paperclip className="w-6 h-6" />
                </Button>
                <Input
                  placeholder="اكتب رسالة..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 border-0 rounded-lg"
                  style={{
                    backgroundColor: "#2a3942",
                    color: "#ffffff",
                  }}
                />
                {replyMessage.trim() ? (
                  <Button
                    size="icon"
                    onClick={handleSendReply}
                    disabled={sending}
                    className="rounded-full"
                    style={{ backgroundColor: "#00a884" }}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="hover:bg-[#2a3942]" style={{ color: "#8696a0" }}>
                    <Mic className="w-6 h-6" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: "#222e35" }}>
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "#00a884" }}
            >
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-light mb-2" style={{ color: "#e9edef" }}>
              واتساب ويب
            </h2>
            <p style={{ color: "#8696a0" }}>اختر محادثة لبدء المراسلة</p>
          </div>
        )}
      </div>
    </div>
  )
}
