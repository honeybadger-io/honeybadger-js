<template>
  <div id="app">
    <h1>hello honeybadger-vue</h1>
    <Miniwolf/>
  </div>
</template>

<script>
import Miniwolf from './components/Miniwolf'
export default {
  name: 'App',
  components: {
    Miniwolf: Miniwolf
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
