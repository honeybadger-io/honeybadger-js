<template>
  <div
    class="miniwolf"
    @customEvent="blowup()"
  >
    <h1>{{ msg }}</h1>
    <button
      id="componentErrantButton"
      @click="makeSomethingUnrenderable()"
    >
      Trigger a component Error
    </button>
    <button
      id="setValueButton"
      @click="setSomethingValue"
    >
      Set a value (no error)
    </button>
    <div>{{ somethingFormatted }}</div>
  </div>
</template>

<script>
export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Miniwolf',
  props: {
    initialValue: {
      type: Number,
      default: 50,
      required: false
    }
  },
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      something: this.initialValue
    }
  },
  computed: {
    somethingFormatted: function () {
      if (this.something === 'unrenderable') {
        throw new Error('Something is Unrenderable')
      }
      if (!parseInt(this.something)) { return '<Empty>' }
      return `${this.something}`
    }
  },
  methods: {
    blowup: () => {
      throw new Error('an error')
    },
    makeSomethingUnrenderable: function () {
      this.something = 'unrenderable'
      console.log(this.something)
    },
    setSomethingValue: function () {
      this.something = parseInt(Math.random() * 100)
      console.log(this.something)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
