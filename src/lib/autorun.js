import dependenceManager from './dependenceManager'

export default function autorun(handler) {
    dependenceManager.beginCollect(handler);
    handler(); // 触发 get，执行了 dependenceManager.collect()
    dependenceManager.endCollect();
}