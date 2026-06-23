/** Formats a route's length and driving time, e.g. "12.3 km · 18 min" or "90.0 km · 1 h 5 min". */
export function formatRouteSummary(distanceMeters: number, durationSeconds: number): string {
  const km = (distanceMeters / 1000).toFixed(1)
  const totalMinutes = Math.round(durationSeconds / 60)

  let time: string
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    time = minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
  } else {
    time = `${totalMinutes} min`
  }

  return `${km} km · ${time}`
}
