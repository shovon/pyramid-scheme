import Node, { AbstractNode } from "./Node";
import { Subject, Subscribable, createSubject } from "./subscriber";

/**
 * Represents a tree in the network.
 *
 * Insertion in the tree is done until all top-most levels have their nodes
 * non-null. This does not mean, however, that the tree balances itself
 */
export default class Tree<K, V> {
  private root: Node<K, V> | null = null;
  private subject: Subject<Tree<K, V>> = createSubject();

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
    this.subject.emit(this);
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
    this.subject.emit(this);
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
    this.subject.emit(this);
  }

  /**
   * Deletes a node from the tree, given the key
   * @param key The key by which to find and delete the node from the tree
   */
  deleteNodeByKey(key: K) {
    if (!this.root) {
      return;
    }

    if (this.root.key === key) {
      const left = this.root.left;
      const right = this.root.right;
      if (!left) {
        this.root = right;
      } else {
        this.root = left;
        if (right) {
          this.root.insertNode(right);
        }
      }
    } else {
      this.root.deleteNodeByKey(key);
    }
  }

  /**
   * Determines if the tree has a node given the key; false otherwise
   * @param id The ID by which to check if the tree has a key set
   * @returns true if the tree has the node given the key; false otherwise
   */
  has(id: K): boolean {
    return this.root ? !!this.root.findNode(id) : false;
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

  /**
   * A subscribable object that handles tree change events
   */
  get treeChangeEvents(): Subscribable<Tree<K, V>> {
    return { subscribe: this.subject.subscribe };
  }

  /**
   * Allows for iterating all nodes in the tree (not only the keys and values)
   */
  *[Symbol.iterator](): IterableIterator<AbstractNode<K, V>> {
    if (this.root) {
      yield* this.root;
    }
  }
}
