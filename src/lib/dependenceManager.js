class DependenceManager {
    static Dep = null;
    static Target = null;
    _store = {};
    beginCollect(handler, target) {
        // console.log('handler', handler)
        // console.log('target', target)
        DependenceManager.Dep = handler
        DependenceManager.Target = target
    }
    collect(id) {
        // console.log('DependenceManager id', id)
        if (DependenceManager.Dep) {
            this._store[id] = this._store[id] || {}
            this._store[id].target = DependenceManager.Target;
            this._store[id].watchers = this._store[id].watchers || []
            this._store[id].watchers.push(DependenceManager.Dep);
        }
    }
    endCollect() {
        DependenceManager.Dep = null
        DependenceManager.Target = null
    }
    trigger = (id) => {
        const store = this._store[id];
        if(store && store.watchers) {
            store.watchers.forEach(s => {
                // console.log('watcher', s)
                s.call(store.target || this);
            });
        }
    }
}
export default new DependenceManager()