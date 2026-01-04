"use client"

interface LocalTimeProps {
  date: string | Date
  format?: "time" | "date" | "datetime"
  className?: string
}

export function LocalTime({ date, format = "time", className }: LocalTimeProps) {
  const dateObj = typeof date === "string" ? new Date(date) : date

  const formatted = (() => {
    switch (format) {
      case "time":
        return dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      case "date":
        return dateObj.toLocaleDateString()
      case "datetime":
        return dateObj.toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      default:
        return dateObj.toLocaleTimeString()
    }
  })()

  return <span className={className}>{formatted}</span>
}
