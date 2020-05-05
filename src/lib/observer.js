export default function observer(target) {
    const componentWillMount = target.prototype.componentWillMount;
    target.prototype.componentWillMount = function() {
        componentWillMount && componentWillMount.call(this);
        autorun(() => {
            this.render();
            this.forceUpdate();
        });
    };
}