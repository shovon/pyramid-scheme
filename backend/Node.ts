import { strict as assert } from "assert";

/**
 * An abstract node that encapsulate the bare minimum that a node represents.
 * More specifically, it hides away all destructive methods
 */
export interface AbstractNode<K, V> {
  /**
   * The lookup key associated with the key-value pair
   */
  readonly key: K;

  /**
   * The value associated with the key
   */
  readonly value: V;

  /**
   * The parent node.
   *
   * An orphaned or a root node will never have a parent, and will thus have a
   * value of null
   */
  readonly parent: AbstractNode<K, V> | null;

  /**
   * The left node. Not all nodes will have a left node.
   */
  readonly left: AbstractNode<K, V> | null;

  /**
   * The right node. Not all nodes will have a right node.
   */
  readonly right: AbstractNode<K, V> | null;
}

/**
 * An equivalent of the AbstarctNode, but without any parent information.
 *
 * Avoids circular references.
 *
 * Especially useful for serializing data.
 */
export interface NoParent<K, V> {
  /**
   * The lookup key associated with the key-value pair
   */
  readonly key: K;

  /**
   * The value associated with the key
   */
  readonly value: V;

  /**
   * The left node. Not all nodes will have a left node.
   */
  readonly left: NoParent<K, V> | null;

  /**
   * The right node. Not all nodes will have a right node.
   */
  readonly right: NoParent<K, V> | null;
}

/**
 * Represents a key/value pairing in a key/value store, represented by an
 * unordered binary tree
 */
export default class Node<K, V> implements AbstractNode<K, V> {
  private _left: Node<K, V> | null = null;
  private _right: Node<K, V> | null = null;
  private _parent: Node<K, V> | null = null;

  constructor(private k: K, private v: V) {}

  private setOrInsertLeftNode(node: Node<K, V>) {
    if (node._parent) {
      throw new Error("The node is not an orphan");
    }

    if (!this._left) {
      this._left = node;
      node._parent = this;
    } else {
      this._left.insertNode(node);
    }

    this.leftDepth = null;
  }

  private setOrInsertRightNode(node: Node<K, V>) {
    if (node._parent) {
      throw new Error("Not is not an orphan");
    }

    if (!this._right) {
      this._right = node;
      node._parent = this;
    } else {
      this._right.insertNode(node);
    }

    this.rightDepth = null;
  }

  /**
   * Inserts the specified node into the node
   *
   * Note: this has a worst-case running time of O(n²)!
   * @param node The node to insert
   * @returns nothing
   */
  insertNode(node: Node<K, V>) {
    if (node._parent !== null) {
      throw new Error("The node is not an orphan");
    }

    assert(node !== this);

    const leftDepth = this.getLeftDepth();
    const rightDepth = this.getRightDepth();

    if (leftDepth <= rightDepth) {
      this.setOrInsertLeftNode(node);
    } else {
      this.setOrInsertRightNode(node);
    }
  }

  /**
   * Deletes the node specified by the given key
   * @param key The key used to find the node that we intend to delete
   */
  deleteNodeByKey(key: K) {
    if (this.left?.k === key) {
      const left = this.detachLeftSubTree();
      if (!left) {
        console.error("This is a weird error");
        return;
      }

      const leftChild = left?.detachLeftSubTree() ?? null;
      const rightChild = left?.detachRightSubTree() ?? null;

      if (leftChild) {
        this.setOrInsertLeftNode(leftChild);
      }

      if (rightChild) {
        this.insertNode(rightChild);
      }
    } else if (this.right?.k === key) {
      const right = this.detachRightSubTree();

      const leftChild = right?.detachLeftSubTree() ?? null;
      const rightChild = right?.detachRightSubTree() ?? null;

      if (leftChild) {
        this.setOrInsertRightNode(leftChild);
      }

      if (rightChild) {
        this.setOrInsertRightNode(rightChild);
      }
    } else {
      if (this.left) {
        this.left.deleteNodeByKey(key);
      }

      if (this.right) {
        this.right.deleteNodeByKey(key);
      }
    }
  }

  /**
   * Detaches the left node, and returns it.
   *
   * The "this" node will therefore no longer have a left node, and the returned
   * node will be a new orphaned tree. In the space of nodes, we will now have a
   * forest of trees
   * @returns A Node object, that is supposed to be the left node element
   */
  detachLeftSubTree(): Node<K, V> | null {
    const left = this._left;
    this._left = null;
    if (left) {
      left._parent = null;
    }
    return left;
  }

  /**
   * Detaches the right node, and returns it.
   *
   * The "this" node will therefore no longer have a left node, and the returned
   * node will be a new orphaned tree. In the space of nodes, we will now have a
   * forest of trees
   * @returns A Node object, that is supposed to be the left node element
   */
  detachRightSubTree(): Node<K, V> | null {
    const right = this._right;
    this._right = null;
    if (right) {
      right._parent = null;
    }
    return right;
  }

  /**
   * Finds the node, given the key.
   * @param k The key for which to look for the specific node.
   * @returns The node if found; null otherwise.
   */
  findNode(k: K): Node<K, V> | null {
    if (this.k === k) {
      return this;
    }
    const left = this._left?.findNode(k);
    const right = this._right?.findNode(k);
    return left || right || null;
  }

  private leftDepth: number | null = null;
  private getLeftDepth(): number {
    if (this.leftDepth !== null) {
      return this.leftDepth;
    }
    if (!this._left) {
      return 0;
    }
    return 1 + Math.min(this._left.getLeftDepth(), this._left.getRightDepth());
  }

  private rightDepth: number | null = null;
  private getRightDepth(): number {
    if (this.rightDepth !== null) {
      return this.rightDepth;
    }
    if (!this._right) {
      return 0;
    }
    return (
      1 + Math.min(this._right.getLeftDepth(), this._right.getRightDepth())
    );
  }

  /**
   * The key associated with this node.
   */
  get key() {
    return this.k;
  }

  /**
   * The value associated with this node.
   */
  get value() {
    return this.v;
  }

  /**
   * The left child node.
   */
  get left() {
    return this._left;
  }

  /**
   * The right child node.
   */
  get right() {
    return this._right;
  }

  /**
   * The parent node.
   */
  get parent() {
    return this._parent;
  }

  /**
   * Gets all nodes (left, right, parent) linking with this node.
   */
  get adjacentNodes(): AbstractNode<K, V>[] {
    const nodes: AbstractNode<K, V>[] = [];
    if (this.left) {
      nodes.push(this.left);
    }
    if (this.right) {
      nodes.push(this.right);
    }
    if (this.parent) {
      nodes.push(this.parent);
    }
    return nodes;
  }

  /**
   * Iterates through all the childrens
   */
  *[Symbol.iterator](): IterableIterator<AbstractNode<K, V>> {
    if (this._left) {
      yield* this._left;
    }
    yield this;
    if (this._right) {
      yield* this._right;
    }
  }

  /**
   * Derives a node that is devoid of all destructive methods.
   *
   * Especially useful for serializing the node into JSON
   * @param node The node
   * @returns The node that has been rendered bare of all destructive methods
   */
  static bareNode<K, V>(node: AbstractNode<K, V>): AbstractNode<K, V> {
    const { key, value, parent, left, right } = node;
    return {
      get key() {
        return key;
      },
      get value() {
        return value;
      },
      get parent() {
        return parent ? Node.bareNode(parent) : null;
      },
      get left() {
        return left ? Node.bareNode(left) : null;
      },
      get right() {
        return right ? Node.bareNode(right) : null;
      },
    };
  }

  /**
   * Emits nodes without parents
   * @param node The node to turn into a parentless datastructure
   * @returns A node with the parent information removed
   */
  static noParents(
    node: AbstractNode<unknown, unknown>
  ): Omit<NoParent<unknown, unknown>, "parent"> {
    const { key, value, left, right } = node;
    return {
      get key() {
        return key;
      },
      get value() {
        return value;
      },
      get left() {
        return left ? Node.noParents(left) : null;
      },
      get right() {
        return right ? Node.noParents(right) : null;
      },
    };
  }
}
