<template>
  <div class="miniwolf" v-on:customEvent="blowup()">
    <h1>{{ msg }}</h1>
    <button id="#componentButton" v-on:click="makeSomething()">Trigger a component Error</button>
    <button id="#setValueButton" v-on:click="setSomethingValue(100)">Set a value</button>

    <div>{{something | formatSomething}}</div>
  </div>
</template>

<script>
export default {
  name: 'Miniwolf',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      something: 50
    }
  },
  methods: {
    blowup: () => {
      throw new Error('an error')
    },
    makeSomething: function () {
      this.something = 'unrenderable'
      console.log(this.something)
    },
    setSomethingValue: function (value) {
      console.log('something invoked, was ' + this.something)
      this.something = value
      this.message = 'Ya fool'
      console.log(this.something)
    }
  },
  filters: {
    formatSomething: function (value) {
      console.log('formatSomething: ' + value)
      if (value === 'unrenderable') {
        console.log('formatting unrenderable')
        throw new Error('Something is Unrenderable')
      }
      if (!parseInt(value)) { return '<Empty>' }
      return `${value}`
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
