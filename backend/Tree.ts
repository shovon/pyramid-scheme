import Node, { AbstractNode } from "./Node";

export default class Tree<K, V> {
  private root: Node<K, V> | null = null;

  insertNode(node: Node<K, V>) {
    if (!this.root) {
      this.root = node;
    } else {
      this.root.insertNode(node);
    }
  }

  removeNodeByKey(key: K) {
    if (this.root?.key === key) {
      const left = this.root.left;
      const right = this.root.right;
      this.root = left;
      if (right) {
        this.root?.insertNode(right);
      }
    } else {
      this.root?.deleteNodeByKey(key);
    }
  }

  setRootNode(node: Node<K, V>) {
    const oldRoot = this.root;
    this.root = node;
    if (oldRoot) {
      this.root.insertNode(oldRoot);
    }
  }

  get isEmpty() {
    return this.root === null;
  }

  get node(): AbstractNode<K, V> | null {
    return this.root ? Node.bareNode(this.root) : null;
  }

  *[Symbol.iterator](): IterableIterator<AbstractNode<K, V>> {
    if (this.root) {
      yield* this.root;
    }
  }
}
