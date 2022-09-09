<template>
  <div>
    <test-component-with-props v-bind:title="name" v-bind:count="total"></test-component-with-props>
  </div>
</template>

<script>
import TestComponentWithProps from './TestComponentWithProps'
export default {
  name: 'TestCanvasForProps',
  components: {TestComponentWithProps},
  data () {
    return {
      name: 'Component 1',
      total: -1
    }
  },
  methods: {
  },
  filters: {
  }
}
</script>
<style scoped>
</style>
