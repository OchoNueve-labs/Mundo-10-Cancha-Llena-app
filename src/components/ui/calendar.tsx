"use client"

import * as React from "react"
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
  isToday,
} from "date-fns"
import { es, type Locale } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
  locale?: Locale
  initialFocus?: boolean
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  className,
  disabled,
  locale = es,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected ? startOfMonth(selected) : startOfMonth(new Date())
  )

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const weekDays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"]

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleDayClick = (clickedDay: Date) => {
    if (disabled?.(clickedDay)) return
    onSelect?.(clickedDay)
  }

  return (
    <div className={cn("p-3 w-[288px]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium capitalize">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7">
        {weekDays.map((wd) => (
          <div
            key={wd}
            className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIdx) =>
          week.map((d, dayIdx) => {
            const isSelected = selected ? isSameDay(d, selected) : false
            const isCurrentMonth = isSameMonth(d, currentMonth)
            const isDayToday = isToday(d)
            const isDisabled = disabled?.(d) ?? false

            return (
              <button
                key={`${weekIdx}-${dayIdx}`}
                type="button"
                disabled={isDisabled}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDayClick(d)
                }}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm h-9 w-full transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  !isCurrentMonth && "text-muted-foreground opacity-40",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isDayToday && !isSelected && "bg-accent text-accent-foreground font-semibold",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                {format(d, "d")}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
