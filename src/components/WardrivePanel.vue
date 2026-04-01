<template>
  <div class="h-full flex flex-col">
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button @click="startWardrive('wardrive -serial')" class="btn btn-primary">WiFi Wardrive</button>
      <button @click="startWardrive('btwardrive')" class="btn btn-primary">BLE Wardrive</button>
      <button @click="sendCommand('stopscan')" class="btn btn-danger">Stop</button>
      <div class="flex-1"></div>
      <span class="text-sm text-zinc-500 font-mono">{{ entries.length }} networks</span>
      <button @click="exportCsv" :disabled="entries.length === 0"
        class="btn btn-accent" :class="{ 'opacity-50 cursor-not-allowed': entries.length === 0 }">
        Export CSV
      </button>
      <button @click="clearData" class="btn">Clear</button>
    </div>

    <!-- Table -->
    <div class="flex-1 min-h-0 overflow-auto border border-zinc-800 rounded bg-zinc-950/50">
      <table class="w-full text-sm">
        <thead class="bg-zinc-900 sticky top-0 z-10">
          <tr>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold w-12 text-zinc-400">#</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">MAC</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">SSID/Name</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">Auth</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold w-12 text-zinc-400">Ch</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold w-16 text-zinc-400">RSSI</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">Lat</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">Lon</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold w-16 text-zinc-400">Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="entries.length === 0">
            <td colspan="9" class="px-4 py-8 text-center text-zinc-600">
              No wardrive data yet. Press "WiFi Wardrive" or "BLE Wardrive" to start.
            </td>
          </tr>
          <tr v-for="(e, i) in entries" :key="i"
            class="hover:bg-zinc-800/50 border-b border-zinc-900">
            <td class="px-2 py-1 font-mono text-zinc-500">{{ i + 1 }}</td>
            <td class="px-2 py-1 font-mono text-zinc-400">{{ e.mac }}</td>
            <td class="px-2 py-1 font-medium text-zinc-200">{{ e.ssid || '-' }}</td>
            <td class="px-2 py-1 text-zinc-400 text-xs">{{ e.auth }}</td>
            <td class="px-2 py-1 font-mono text-zinc-400">{{ e.channel }}</td>
            <td class="px-2 py-1 font-mono text-emerald-500">{{ e.rssi }}</td>
            <td class="px-2 py-1 font-mono text-zinc-400">{{ e.lat }}</td>
            <td class="px-2 py-1 font-mono text-zinc-400">{{ e.lon }}</td>
            <td class="px-2 py-1 text-xs" :class="e.type === 'WIFI' ? 'text-cyan-400' : 'text-violet-400'">
              {{ e.type }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSerialConnection } from '../utils/serialConnection'

const { sendCommand, terminalOutput } = useSerialConnection()

const entries = ref([])
const csvHeader = ref('')
const csvColumnHeader = ref('')
const lastProcessedIndex = ref(0)

const startWardrive = async (command) => {
  await sendCommand(command)
}

const clearData = () => {
  entries.value = []
  csvHeader.value = ''
  csvColumnHeader.value = ''
}

const parseWardriveRow = (plain) => {
  // CSV format: MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,Lat,Lon,Alt,Accuracy,Type
  // BLE format: MAC,,AuthMode,FirstSeen,0,RSSI,Lat,Lon,Alt,Accuracy,BLE
  const parts = plain.split(',')
  if (parts.length < 11) return null

  const mac = parts[0].trim()
  // Validate MAC format
  if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(mac)) return null

  return {
    mac,
    ssid: parts[1] || '',
    auth: parts[2] || '',
    firstSeen: parts[3] || '',
    channel: parts[4] || '-',
    rssi: parts[5] || '',
    lat: parts[6] || '',
    lon: parts[7] || '',
    alt: parts[8] || '',
    accuracy: parts[9] || '',
    type: parts[10]?.trim() || ''
  }
}

watch(() => terminalOutput.value, (newLines) => {
  if (newLines.length <= lastProcessedIndex.value) {
    if (newLines.length < lastProcessedIndex.value) lastProcessedIndex.value = 0
    return
  }

  const linesToProcess = newLines.slice(lastProcessedIndex.value)
  lastProcessedIndex.value = newLines.length

  let changed = false

  linesToProcess.forEach(line => {
    const plain = line.replace(/<[^>]+>/g, '').trim()
    if (!plain) return

    // Capture Wigle header
    if (plain.startsWith('WigleWifi-1.4')) {
      csvHeader.value = plain
      return
    }

    // Capture column header
    if (plain.startsWith('MAC,SSID,AuthMode')) {
      csvColumnHeader.value = plain
      return
    }

    // Parse data rows
    const entry = parseWardriveRow(plain)
    if (entry) {
      entries.value = [...entries.value, entry]
      changed = true
    }
  })
}, { deep: true })

const exportCsv = () => {
  if (entries.value.length === 0) return

  const header = csvHeader.value || 'WigleWifi-1.4,appRelease=ESP32Marauder'
  const columns = csvColumnHeader.value || 'MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type'

  const rows = entries.value.map(e =>
    `${e.mac},${e.ssid},${e.auth},${e.firstSeen},${e.channel},${e.rssi},${e.lat},${e.lon},${e.alt},${e.accuracy},${e.type}`
  )

  const csv = [header, columns, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wardrive_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
