const MAC_RE = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/
const MAC_IN_TEXT_RE = /([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}/g
const SERIAL_COUNTER_RE = /^\d+\s*\|\s*/
const BUFFER_MARKER_RE = /^\s*\[BUF\/(?:BEGIN|CLOSE)\]\s*/i

export function normalizeWardriveLine (line) {
  let normalized = String(line ?? '').replace(/<[^>]+>/g, '').trim()

  while (BUFFER_MARKER_RE.test(normalized)) {
    normalized = normalized.replace(BUFFER_MARKER_RE, '').trim()
  }

  normalized = normalized.replace(SERIAL_COUNTER_RE, '').trim()

  while (BUFFER_MARKER_RE.test(normalized)) {
    normalized = normalized.replace(BUFFER_MARKER_RE, '').trim()
    normalized = normalized.replace(SERIAL_COUNTER_RE, '').trim()
  }

  return normalized
}

export function parseWardriveHeader (line) {
  const plain = normalizeWardriveLine(line)
  if (!plain) return null

  if (plain.startsWith('WigleWifi-1.4')) {
    return { type: 'wigle', value: plain }
  }

  if (plain.startsWith('MAC,SSID,AuthMode')) {
    return { type: 'columns', value: plain }
  }

  return null
}

export function parseWardriveRow (line) {
  const plain = normalizeWardriveLine(line)
  if (!plain) return null

  const parts = plain.split(',')
  if (parts.length < 11) return null

  const firstField = parts[0].trim()
  const isBle = parts[2]?.trim() === '[BLE]' || parts[10]?.trim().toUpperCase() === 'BLE'
  let mac = firstField
  let ssid = parts[1] ?? ''

  if (!MAC_RE.test(mac) && isBle) {
    const matches = Array.from(firstField.matchAll(MAC_IN_TEXT_RE))
    const lastMatch = matches.at(-1)
    if (lastMatch) {
      mac = lastMatch[0]
      ssid = firstField.slice(0, lastMatch.index)
      if (ssid.toLowerCase() === mac.toLowerCase()) ssid = ''
    }
  }

  if (!MAC_RE.test(mac)) return null

  return {
    mac,
    ssid,
    auth: parts[2] ?? '',
    firstSeen: parts[3] ?? '',
    channel: parts[4] || '-',
    rssi: parts[5] ?? '',
    lat: parts[6] ?? '',
    lon: parts[7] ?? '',
    alt: parts[8] ?? '',
    accuracy: parts[9] ?? '',
    type: parts[10]?.trim() || ''
  }
}

export function wardriveEntryKey (entry) {
  return [
    entry.mac.toLowerCase(),
    entry.firstSeen,
    entry.channel,
    entry.rssi,
    entry.lat,
    entry.lon,
    entry.alt,
    entry.accuracy,
    entry.type
  ].join('|')
}
