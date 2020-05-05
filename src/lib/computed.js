import dependenceManager from './dependenceManager'

let id = 0
class Computed {
    constructor(target, getter) {
        this.id = `computed-${id++}`
        this.target = target
        this.getter = getter
    }
    registerReComputed() {
        if(!this.hasBindAutoReCompute) {
            this.hasBindAutoReCompute = true;
            dependenceManager.beginCollect(this.reComputed, this);
            this.reComputed();
            dependenceManager.endCollect();
        }
    }
    reComputed = () => {
        this.value = this.getter.call(this.target);
        dependenceManager.trigger(this.id);
    }
    get() {
        this.registerReComputed();
        dependenceManager.collect(this.id);
        return this.value;
    }
}
export default function computed(target, name, descriptor) {
    const getter = descriptor.get; // get 函数
    const _computed = new Computed(target, getter);

    return {
        enumerable: true,
        configurable: true,
        get: function () {
            console.log('computed get')
            _computed.target = this
            return _computed.get();
        }
    };
}
