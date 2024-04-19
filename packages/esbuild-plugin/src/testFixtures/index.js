class TestClass {
  constructor() {
    this.property1 = 'Property 1'
    this.property2 = 'Property 2'
    this.property3 = 'Property 3'
  }

  method1() {
    return `Method 1 called. Property 1: ${this.property1}`
  }

  method2() {
    return `Method 2 called. Property 2: ${this.property2}`
  }

  method3() {
    return `Method 3 called. Property 3: ${this.property3}`
  }
}

new TestClass().method1()
