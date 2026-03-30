<template>
  <div class="card p-4 space-y-4">
    <h2 class="text-xl font-bold text-zinc-100 flex items-center">
      <span class="mr-2">🛠️</span> System Utilities
    </h2>
    
    <div class="grid grid-cols-2 gap-2">
      <!-- Reboot Device -->
      <button @click="handleCommand('reboot')"
        class="btn btn-danger text-xs py-2 flex flex-col items-center justify-center gap-1">
        <span class="text-lg">🔄</span>
        <span>Reboot</span>
      </button>

      <!-- System Info -->
      <button @click="handleCommand('info')"
        class="btn btn-primary text-xs py-2 flex flex-col items-center justify-center gap-1">
        <span class="text-lg">ℹ️</span>
        <span>Sys Info</span>
      </button>

      <!-- Clear Lists -->
      <button @click="handleCommand('clearlist -a')"
        class="btn bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 flex flex-col items-center justify-center gap-1">
        <span class="text-lg">🧹</span>
        <span>Clear APs</span>
      </button>

      <!-- Clear Bluetooth -->
      <button @click="handleCommand('clearlist -c')"
        class="btn bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 flex flex-col items-center justify-center gap-1">
        <span class="text-lg">📡</span>
        <span>Clear BT</span>
      </button>
    </div>

    <!-- Additional Tools -->
    <div class="space-y-2 pt-2 border-t border-zinc-800">
      <button @click="handleCommand('scanall')"
        class="w-full btn btn-accent text-xs">
        Scan Everything (All Channels)
      </button>
      <button @click="handleCommand('evilportal -c start')"
        class="w-full btn btn-danger text-xs">
        Start Evil Portal (Requires SD)
      </button>
    </div>
  </div>
</template>

<script setup>
import { useSerialConnection } from '../utils/serialConnection'

const { sendCommand } = useSerialConnection()

const handleCommand = async (cmd) => {
  if (confirm(`Are you sure you want to execute: ${cmd}?`)) {
    await sendCommand(cmd)
  }
}
</script>
