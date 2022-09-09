<template>
  <div>
    <test-component-with-props
      ref="test-comp-with-props"
      :title="name"
      :count="total"
    />
  </div>
</template>

<script>
import TestComponentWithProps from './TestComponentWithProps'
export default {
  name: 'TestCanvasForProps',
  components: { TestComponentWithProps },
  data () {
    return {
      name: 'Component 1',
      total: 10
    }
  },
  methods: {
  }
}
</script>
<style scoped>
</style>
