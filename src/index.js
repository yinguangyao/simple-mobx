import { autorun, observable, computed } from './lib'

class Counter {
    @observable count = 0
    increment() {
        this.count++
    }
}
const counter = new Counter()
autorun(function() {
    console.log(counter.count)
})
counter.count++
counter.count++
counter.count++