<script setup lang="ts">
import { useHoneybadger } from '@honeybadger-io/vue'
const honeybadger = useHoneybadger()

function notify() {
  honeybadger.notify('Hello from Vue 3!')
}
</script>

<template>
  <div class="greetings">
    <button @click="notify">Send a notice to Honeybadger</button>
  </div>
</template>

<style scoped>
</style>
