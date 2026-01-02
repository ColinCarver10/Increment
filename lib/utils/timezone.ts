import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz"

export function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number } {
  const now = new Date()
  const timeStr = formatInTimeZone(now, timezone, "HH:mm")
  const [hour, minute] = timeStr.split(":").map(Number)
  return { hour, minute }
}

export function convertLocalTimeToUtc(
  localTime: string,
  timezone: string,
  date: Date = new Date()
): { hour: number; minute: number } {
  const [hour, minute] = localTime.split(":").map(Number)
  const dateStr = formatInTimeZone(date, timezone, "yyyy-MM-dd")
  const localDateTime = `${dateStr}T${localTime}:00`
  const utcDate = zonedTimeToUtc(localDateTime, timezone)
  return {
    hour: utcDate.getUTCHours(),
    minute: utcDate.getUTCMinutes(),
  }
}

export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
] as const

