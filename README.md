# 深入理解 Mobx 原理
## 1. 前言
Mobx 是 React 的另一种经过战火洗礼的状态管理方案，和 Redux 不同的地方是 Mobx 是一个响应式编程（`Reactive Programming`）库，在一定程度上可以看做没有模板的 Vue，基本原理和 Vue 一致。

Mobx 借助于装饰器的实现，使得代码更加简洁易懂。由于使用了可观察对象，所以 Mobx 可以做到直接修改状态，而不必像 Redux 一样编写繁琐的 actions 和 reducers。

![code.png-50.7kB][1]

Mobx 的执行流程和 Redux 有一些相似。这里借用 Mobx 官网的一张图：

![image.png-238kB][2]

简单的概括一下，一共有这么几个步骤：
1. 页面事件（生命周期、点击事件等等）触发 action 的执行。
2. 通过 action 来修改状态。
3. 状态更新后，`computed` 计算属性也会根据依赖的状态重新计算属性值。
4. 状态更新后会触发 `reaction`，从而响应这次状态变化来进行一些操作（渲染组件、打印日志等等）。
## 2. Mobx 核心概念
Mobx 的概念没有 Redux 那么多，学习和上手成本也更低。以下介绍全部基于 ES 装饰器来讲解，更多细节可以参考 Mobx 中文文档：[Mobx 中文文档][3]
对于一些实践的用法，也可以参考我一年前写的文章：[Mobx 实践][4]
本文涉及到的代码都放到了我的 GitHub 上面：[simple-mobx][5]
### 2.1 observable
observable 可以将接收到的值包装成可观察对象，这个值可以是 JS 基本数据类型、引用类型、普通对象、类实例、数组和映射等等等。
```
const list = observable([1, 2, 4]);
list[2] = 3;

const person = observable({
    firstName: "Clive Staples",
    lastName: "Lewis"
});
person.firstName = "C.S.";
```
如果在对象里面使用 get，那就是计算属性了。计算属性一般使用 `get` 来实现，当依赖的属性发生变化的时候，就会重新计算出新的值，常用于一些计算衍生状态。
```
const todoStore = observable({
    // observable 属性:
    todos: []

    // 计算属性:
    get completedCount() {
        return (this.todos.filter(todo => todo.isCompleted) || []).length
    }
});
```
更多时候，我们会配合装饰器一起使用来使用 `observable` 方法。
```
class Store {
    @observable count = 0;
}
```
### 2.2 computed
想像一下，在 Redux 中，如果一个值 A 是由另外几个值 B、C、D 计算出来的，在 store 中该怎么实现？
如果要实现这么一个功能，最麻烦的做法是在所有 B、C、D 变化的地方重新计算得出 A，最后存入 store。
当然我也可以在组件渲染 A 的地方根据 B、C、D 计算出 A，但是这样会把逻辑和组件耦合到一起，如果我需要在其他地方用到 A 怎么办？
我甚至还可以在所有 `connect` 的地方计算 A，最后传入组件。但由于 Redux 监听的是整个 `store` 的变化，所以无法准确的监听到 B、C、D 变化后才重新计算 A。
但是 Mobx 中提供了 `computed` 来解决这个问题。正如 Mobx 官方介绍的一样，`computed` 是基于现有状态或计算值衍生出的值，如下面 todoList 的例子，一旦已完成事项数量改变，那么 `completedCount` 会自动更新。
```js
class TodoStore {
    @observable todos = []
    @computed get completedCount() {
		return (this.todos.filter(todo => todo.isCompleted) || []).length
	}
}
```
### 2.3 reaction & autorun
`autorun` 接收一个函数，当这个函数中依赖的可观察属性发生变化的时候，`autorun` 里面的函数就会被触发。除此之外，`autorun` 里面的函数在第一次会立即执行一次。
```
const person = observable({
    age: 20
}) 
// autorun 里面的函数会立即执行一次，当 age 变化的时候会再次执行一次
autorun(() => {
    console.log("age", person.age);
})
person.age = 21;
// 输出：
// age 20
// age 21
```
但是很多人经常会用错 autorun，导致属性修改了也没有触发重新执行。
常见的几种错误用法如下：

 1. 错误的修改了可观察对象的引用
```
let person = observable({
    age: 20
})
// 不会起作用
autorun(() => {
    console.log("age", person.age);
})
person = observable({
    age: 21
})
```

 2. 在追踪函数外进行间接引用
```
const age = person.age;
// 不会起作用
autorun(() => {
    console.log('age', age)
})
person.age = 21
```

`reaction` 则是和 `autorun` 功能类似，但是 `autorun` 会立即执行一次，而 `reaction` 不会，使用 reaction 可以在监听到指定数据变化的时候执行一些操作，有利于和副作用代码解耦。reaction 和 Vue 中的 `watch` 非常像。
```
// 当todos改变的时候将其存入缓存
reaction(
    () => toJS(this.todos),
    (todos) =>  localStorage.setItem('mobx-react-todomvc-todos', JSON.stringify({ todos }))
)
```
看到 autorun 和 reaction 的用法后，也许你会想到，如果将其和 React 组件结合到一起，那不就可以实现很细粒度的更新了吗？
没错，Mobx-React 就是来解决这个问题的。
### 2.4 observer
Mobx-React 中提供了一个 `observer` 方法，这个方法主要是改写了 React 的 `render` 函数，当监听到 `render` 中依赖属性变化的时候就会重新渲染组件，这样就可以做到高性能更新。
```
@observer
class App extends Component {
    @observable count = 0;
    @action 
    increment = () => {
        this.count++;
    }
    render() {
        <h1 onClick={this.increment}>{ this.count }</h1>
    }
}
```
## 3. mobx 原理
从上面的一些用法来看，很明显实现上用到了 `Object.defineProperty` 或者 `Proxy`。当 autorun 第一次执行的时候会触发依赖属性的 `getter`，从而收集当前函数的依赖。
```js
const person = observable({ name: 'tom' })
autorun(function func() {
    console.log(person.name)
})

```
在 autorun 里面相当于做了这么一件事情。
```js
person.watches.push(func)
```
当依赖属性触发 `setter` 的时候，就会将所有订阅了变化的函数都执行一遍，从而实现了数据响应式。
```js
person.watches.forEach(watch => watch())
```
![image.png-101.5kB][6]

知道原理之后，那我们就可以来一步步去实现这个 Mobx，这里将会以装饰器写法为例子。

### 3.1 observable
前面在讲解装饰器的时候说过，装饰器函数一般接收三个参数，分别是目标对象、属性、属性描述符。
我们都知道，被 observable 包装过的对象，其属性也是可观察的，也就是说需要递归处理其属性。
其次，由于需要收集依赖的方法，某个方法可能依赖了多个可观察属性，相当于这些可观察属性都有自己的订阅方法数组。
```js
const cat = observable({name: "tom"})
const mice = observable({name: "jerry"})
autorun(function func1 (){
    console.log(`${cat.name} and ${mice.name}`)
})
autorun(function func2(){
    console.log(mice.name)
})
```
以上面这段代码为例，可观察对象 `cat` 只有 `func1` 一个订阅方法，而 `mice` 则有 `func1` 和 `func2` 两个方法。
```js
cat.watches = [func1]
mice.watches = [func1, func2]
```
可见 `observable` 在调用的时候，使用了类似 `id` 之类的来对不同调用做区分。
我们可以先简单地实现一下 observable 方法。首先，实现一个可以根据 id 来区分的类。
```
let observableId = 0
class Observable {
    id = 0
    constructor(v) {
        this.id = observableId++;
        this.value = v;
    }
}
```
然后我们要实现一个装饰器，这个方法支持拦截属性的 `get/set`。这个 `observable` 装饰器其实就是利用了 `Observable` 这个类。
```
function observable(target, name, descriptor) {
    const v = descriptor.initializer.call(this);
    const o = new Observable(v);
    return {
        enumerable: true,
        configurable: true,
        get: function() {
            return o.get();
        },
        set: function(v) {
            return o.set(v);
        }
    };
};
```
然后我们要来实现 `Observable` 类里面的 `get/set`，但这个 `get/set` 和 `autorun` 也是密切相关的。
`get/set` 做了什么呢？`get` 会在 `autorun` 执行的时候，将传给 `autorun` 的函数依赖收集到 `id` 相关的数组里面。
而 `set` 则是会触发数组中相关函数的执行。
```js
let observableId = 0
class Observable {
    id = 0
    constructor(v) {
        this.id = observableId++;
        this.value = v;
    }
    set(v) {
        this.value = v;
        dependenceManager.trigger(this.id);
    }
    get() {
        dependenceManager.collect(this.id);
        return this.value;
    }
}
```
### 3.2 依赖收集autorun
前面讲了，`autorun` 会立即执行一次，并且会将其函数收集起来，存到和 `observable. id` 相关的数组中去。那么 `autorun` 就是一个收集依赖、执行函数的过程。实际上，在执行函数的时候，就已经触发了 `get` 来做了收集。
```js
import dependenceManager from './dependenceManager'

export default function autorun(handler) {
    dependenceManager.beginCollect(handler);
    handler(); // 触发 get，执行了 dependenceManager.collect()
    dependenceManager.endCollect();
}
```
接着我们来实现一下 `dependenceManager` 的几个方法，首先定义一个 `DependenceManager` 类。
再来拆解一下 `DependenceManager` 中的方法，如下：

1. **beginCollect：** 用一个全局变量保存着函数依赖。
2. **collect：** 当执行 `get` 的时候，根据传入的 `id`，将函数依赖放入数组中。
3. **endCollect：** 清除刚开始的函数依赖，以便于下一次收集。
4. **trigger：** 当执行 `set` 的时候，根据 `id` 来执行数组中的函数依赖。

```
class DependenceManager {
    Dep = null;
    _store = {};
    beginCollect(handler) {
        DependenceManager.Dep = handler
    }
    collect(id) {
        if (DependenceManager.Dep) {
            this._store[id] = this._store[id] || {}
            this._store[id].watchers = this._store[id].watchers || []
            this._store[id].watchers.push(DependenceManager.Dep);
        }
    }
    endCollect() {
        DependenceManager.Dep = null
    }
    trigger(id) {
        const store = this._store[id];
        if(store && store.watchers) {
            store.watchers.forEach(s => {
                s.call(this);
            });
        }
    }
}
export default new DependenceManager()
```
至此，我们已经完成了一个完整的 Mobx 骨架，可以做一些有意思的事情了。写个简单的例子来试试：
```
class Counter {
    @observable count = 0;
    increment() {
        this.count++;
    }
}
const counter = new Counter()
autorun(() => {
    console.log(`count=${counter.count}`)
})

counter.increment()
```
可以看到 `autorun` 里面的函数被执行了两次，说明我们已经实现了一个简单的 Mobx。但这个 Mobx 还有很多问题，比如不支持更深层的对象，也监听不到数组等等。
### 3.3 对深层对象和数组的处理
在前面我们讲解 `Proxy` 和 `Object.defineProperty` 的时候就已经说过，由于 `Object.defineProperty` 的问题，无法监听到新增加的项，因此对于动态添加的属性或者下标就无法进行监听。
据尤雨溪所讲，在 Vue 里面由于考虑性能就放弃了监听数组的下标变化。而在 Mobx4 中使用了比较极端的方式，那就是不管数组中有多少项，都是用一个长度 1000 的数组来存放，去监听这 1000 个下标变化，可以满足大多数场景。
但是在未来的 Vue3 和已面世的 Mobx5 中，都已经使用 Proxy 来实现对数组的拦截了。这里我们使用 Proxy 来增加对数组的监听。
```
class Observable {
    set(v) {
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
                obj[key] = value;
                // 如果是修改数组项的值，那么就触发通知
                if(key !== 'length') {
                    dependenceManager.trigger(this.id);
                }
                return true;
            }
        });
    }

```
现在已经可以监听到数组的变化了，那么用一个例子试试吧。
```js
class Store {
    @observable list = [1, 2, 3];
    increment() {
        this.list[0]++
    }
}
const store = new Store()
autorun(() => {
    console.log(store.list[0])
})
store.list[0]++;
```
原本预想中会打印两次，结果却只打印了一个1，这是为什么？来翻查一下前面 `Observable.set` 的代码会发现，我们只拦截了对象最外层属性的变化，如果有更深层的就拦截不到了。如果对 `list` 重新赋值就会生效，但修改 `list` 中第一项就不会生效。
所以我们还需要对对象深层属性做个递归包装，这也是 Mobx 中 `observable` 的功能之一。

1. 首先，我们来判断包裹的属性是否为对象。
2. 如果是个对象，那么就遍历其属性，对属性值创建新的 `Observable` 实例。
3. 如果属性也是个对象，那么就进行递归，重复步骤1、2。

```
function createObservable(target) {
    if (typeof target === "object") {
        for(let property in target) {
            if(target.hasOwnProperty(property)) {
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
```
这个 `createObservable` 方法，我们只需要在 `observable` 装饰器里面执行就行了。
```js
function observable(target, name, descriptor) {
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
```
继续使用上面那个例子，会发现成功打印出来了1、2，说明我们实现的这个简单的 Mobx 即支持拦截数组，又支持拦截深层属性。
### 3.4 computed
我们都知道 `computed` 有三个特点，分别是：
1. `computed` 是个 get 方法，会缓存上一次的值
2. `computed` 会根据依赖的可观察属性重新计算
3. 依赖了 `computed` 的函数也会被重新执行

其实 `computed` 和 `observable` 的实现思路类似，区别在于 `computed` 需要收集两次依赖，一次是 `computed` 依赖的可观察属性，一次是依赖了 `computed` 的方法。
首先，我们来定义一个 `computed` 的，这个方法依然是个装饰器。
```js
function computed(target, name, descriptor) {
    const getter = descriptor.get; // get 函数
    const computed = new Computed(target, getter);

    return {
        enumerable: true,
        configurable: true,
        get: function() {
            return computed.get();
        }
    };
}
```
接下来实现这个 `Computed` 类，这个类的实现方式和 `Observable` 差不多。
```js
let id = 0
class Computed {
    constructor(target, getter) {
        this.id = id++
        this.target = target
        this.getter = getter
    }
    get() {
        dependenceManager.collect(this.id);
    }
}
```
在执行 get 方法的时候，就会去收集依赖了当前 `computed` 的方法。我们还需要去收集当前 `computed` 依赖的属性。
这里是不是可以利用前面的 `dependenceManager.beginCollect` 呢？没错，我们可以用 `dependenceManager.beginCollect` 来收集到重新计算的 `get` 函数，并且通知依赖了 `computed` 的方法。
```js
    registerReComputed() {
        if(!this.hasBindAutoReCompute) {
            this.hasBindAutoReCompute = true;
            dependenceManager.beginCollect(this._reCompute, this);
            this._reCompute();
            dependenceManager.endCollect();
        }
    }
    reComputed() {
        this.value = this.getter.call(this.target);
        dependenceManager.trigger(this.id);
    }
```
最终，我们的实现是这样的：
```js
let id = 0
class Computed {
    constructor(target, getter) {
        this.id = id++
        this.target = target
        this.getter = getter
    }
    registerReComputed() {
        if(!this.hasBindAutoReCompute) {
            this.hasBindAutoReCompute = true;
            dependenceManager.beginCollect(this._reCompute, this);
            this._reCompute();
            dependenceManager.endCollect();
        }
    }
    reComputed() {
        this.value = this.getter.call(this.target);
        dependenceManager.trigger(this.id);
    }
    get() {
        this.registerReComputed();
        dependenceManager.collect(this.id);
        return this.value;
    }
}
```
### 3.5 observer
而 observer 的实现比较简单，就是利用了 React 的 `render` 方法执行进行依赖收集，我们可以在 `componentWillMount` 里面注册 `autorun`。
```js
function observer(target) {
    const componentWillMount = target.prototype.componentWillMount;
    target.prototype.componentWillMount = function() {
        componentWillMount && componentWillMount.call(this);
        autorun(() => {
            this.render();
            this.forceUpdate();
        });
    };
}
```
至此，我们已经实现了一个完整的 `Mobx` 库，可以看到 `Mobx` 的实现原理比较简单，使用起来也没有 Redux 那么繁琐。


  [1]: http://static.zybuluo.com/gyyin/9cn8sjizzgsuu8nhga60r8om/code.png
  [2]: http://static.zybuluo.com/gyyin/ewidvcp69m5sc65ch22e8iz5/image.png
  [3]: https://cn.mobx.js.org/
  [4]: https://juejin.im/post/5c1478dd6fb9a049f361fe35
  [5]: https://github.com/yinguangyao/simple-mobx
  [6]: http://static.zybuluo.com/gyyin/n1xdxztuu6gnpjbo5221og4q/image.png
