import Node, { AbstractNode } from "./Node";

/**
 * Represents a tree in the network.
 *
 * Insertion in the tree is done until all top-most levels have their nodes
 * non-null. This does not mean, however, that the tree balances itself
 */
export default class Tree<K, V> {
  private root: Node<K, V> | null = null;

  /**
   * Inserts a node into the tree
   * @param node The node to insert
   */
  insertNode(node: Node<K, V>) {
    if (!this.root) {
      this.root = node;
    } else {
      this.root.insertNode(node);
    }
  }

  /**
   * Removes the value by the given key.
   *
   * Will re-arrange the tree, so that we now have
   * @param key The key for which to look for the node, and remove
   */
  removeValueByKey(key: K) {
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

  /**
   * Sets the root node to the supplied node, and rearranges the tree
   * @param node The node to set as the root node. The node does not need to
   *   have any children
   */
  setRootNode(node: Node<K, V>) {
    const oldRoot = this.root;
    this.root = node;
    if (oldRoot) {
      this.root.insertNode(oldRoot);
    }
  }

  /**
   * Gets a `true` or `false` value to determine whether the tree is devoid of
   * any value (e.g. is empty).
   *
   * `true` if the tree is indeed empty; `false` otherwise
   */
  get isEmpty() {
    return this.root === null;
  }

  /**
   * Gets the root node in the format of an abstract node
   */
  get rootNode(): AbstractNode<K, V> | null {
    return this.root ? Node.bareNode(this.root) : null;
  }

  *[Symbol.iterator](): IterableIterator<AbstractNode<K, V>> {
    if (this.root) {
      yield* this.root;
    }
  }
}
