/**
 * 日付のサニタイズ
 */
export function sanitizeDate(dateStr : string) {
  if (/^\d{4,}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""
  
  return date.toLocaleString("sv-SE").split(" ")[0] // YYYY-MM-DD
}

/**
 * 今日の日付をYYYYMMDDで返す
 */
export function getDateString() {
  const date = new Date()

  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
}
