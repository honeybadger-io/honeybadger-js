<template>
  <div id="app">
    <img
      alt="Vue logo"
      src="./assets/logo.png"
    >
    <HelloWorld msg="Hello Vue 2 + Vite" />
    <Miniwolf :initial-value="50" />
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import Miniwolf from './components/Miniwolf.vue'
export default {
  name: 'App',
  components: {
    HelloWorld,
    Miniwolf
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
