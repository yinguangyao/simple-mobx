import dependenceManager from './dependenceManager'

let observableId = 0
class Observable {
    id = 0
    constructor(v) {
        this.id = `ob-${observableId++}`;
        if(Array.isArray(v)) {
            this._wrapArray(v);
        } else {
            this.value = v;
        }
    }
    get() {
        // console.log('this.id', this.id)
        dependenceManager.collect(this.id);
        return this.value;
    }
    set(v) {
        // console.log('v', v)
        // 如果是数组，那么就对数组做特殊的处理
        if(Array.isArray(v)) {
            this._wrapArray(v);
        } else {
            this.value = v;
        }
        dependenceManager.trigger(this.id);
    }
    _wrapArray(arr) {
        this.value = new Proxy(arr, {
            set(obj, key, value) {
                // console.log(`obj=${JSON.stringify(obj)}|key=${key}|value=${value}`)
                obj[key] = value;
                // 如果是修改数组项的值，那么就触发通知
                if(key !== 'length') {
                    dependenceManager.trigger(this.id);
                }
                return true;
            }
        });
    }
}

function createObservable(target) {
    if (typeof target === "object") {
        for(let property in target) {
            if(target.hasOwnProperty(property)) {
                // console.log(`target=${target}|property=${property}`)
                const observable = new Observable(target[property]);
                Object.defineProperty(target, property, {
                    get() {
                        return observable.get();
                    },
                    set(value) {
                        return observable.set(value);
                    }
                });
                createObservable(target[property])
            }
        }
    }
}

export default function observable(target, name, descriptor) {
    const v = descriptor.initializer.call(this);
    createObservable(v)
    const o = new Observable(v);
    return {
        enumerable: true,
        configurable: true,
        get: function() {
            return o.get();
        },
        set: function(v) {
            createObservable(v)
            return o.set(v);
        }
    };
};