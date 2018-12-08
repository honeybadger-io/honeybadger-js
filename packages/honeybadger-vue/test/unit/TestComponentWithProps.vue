<template>
  <div class="miniwolf" v-on:customEvent="blowup()">
    <h1>{{ title }}</h1>
    <div>{{ count | assertInRange }}</div>
  </div>
</template>

<script>
export default {
  name: 'TestComponentWithProps',
  props: {
    title: String,
    count: Number
  },
  filters: {
    assertInRange: function (value) {
      if (value < 0) { throw Error('out of range') }
      return value
    }
  }
}
</script>
<style scoped>
</style>
