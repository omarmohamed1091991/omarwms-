"use client"
import { useState } from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { CalendarIcon, X, Check } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  onConfirm?: () => void
  className?: string
}

export function DateRangePicker({ dateRange, onDateRangeChange, onConfirm, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange)

  const handleConfirm = () => {
    onDateRangeChange(tempDateRange)
    onConfirm?.()
    setOpen(false)
  }

  const handleCancel = () => {
    setTempDateRange(dateRange)
    setOpen(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTempDateRange(dateRange)
    }
    setOpen(isOpen)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-[300px] justify-start text-right font-normal", !dateRange && "text-muted-foreground")}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "d MMM yyyy", { locale: ar })} -{" "}
                  {format(dateRange.to, "d MMM yyyy", { locale: ar })}
                </>
              ) : (
                format(dateRange.from, "d MMM yyyy", { locale: ar })
              )
            ) : (
              <span>اختر فترة زمنية</span>
            )}
            {dateRange && (
              <X
                className="mr-auto h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onDateRangeChange(undefined)
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempDateRange?.from}
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={2}
            locale={ar}
            dir="rtl"
          />
          <div className="p-3 border-t flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date()
                setTempDateRange({ from: today, to: today })
              }}
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date()
                const weekAgo = new Date(today)
                weekAgo.setDate(weekAgo.getDate() - 7)
                setTempDateRange({ from: weekAgo, to: today })
              }}
            >
              آخر 7 أيام
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date()
                const monthAgo = new Date(today)
                monthAgo.setDate(monthAgo.getDate() - 30)
                setTempDateRange({ from: monthAgo, to: today })
              }}
            >
              آخر 30 يوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date()
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
                setTempDateRange({ from: monthStart, to: today })
              }}
            >
              هذا الشهر
            </Button>
          </div>
          <div className="p-3 border-t flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              إلغاء
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!tempDateRange?.from} className="bg-primary">
              <Check className="ml-2 h-4 w-4" />
              موافق
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
