<template>
  <div>
    <h1>{{ msg }}</h1>

    <p>
      <a
        href="https://vitejs.dev/guide/features.html"
        target="_blank"
      >Vite Documentation</a>
      |
      <a
        href="https://vuejs.org/v2/guide/"
        target="_blank"
      >Vue 2 Documentation</a>
    </p>

    <button @click="count++">
      count is: {{ count }}
    </button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test hot module replacement.
    </p>
  </div>
</template>

<script>
export default {
  props: {
    msg: {
      type: String,
      required: true
    },
  },
  data() {
    return {
      count: 0,
    }
  },
}
</script>

<style scoped>
a {
  color: #42b983;
}
</style>
