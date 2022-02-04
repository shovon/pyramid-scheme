import { strict as assert } from "assert";
import { EventEmitter } from "events";

/**
 * An abstract node that encapsulate the bare minimum that a node represents.
 * More specifically, it hides away all destructive methods
 */
export interface AbstractNode<K, V> {
  readonly key: K;
  readonly value: V;
  readonly parent: AbstractNode<K, V> | null;
  readonly left: AbstractNode<K, V> | null;
  readonly right: AbstractNode<K, V> | null;
  readonly children: AbstractNode<K, V>[];
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

  detachLeftSubTree(): Node<K, V> | null {
    const left = this._left;
    this._left = null;
    if (left) {
      left._parent = null;
    }
    return left;
  }

  detachRightSubTree(): Node<K, V> | null {
    const right = this._right;
    this._right = null;
    if (right) {
      right._parent = null;
    }
    return right;
  }

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

  get key() {
    return this.k;
  }

  get value() {
    return this.v;
  }

  static bareNode<K, V>(node: AbstractNode<K, V>): AbstractNode<K, V> {
    return {
      get key() {
        return node.key;
      },
      get value() {
        return node.value;
      },
      get parent() {
        return node.parent ? Node.bareNode(node) : null;
      },
      get left() {
        return node.parent ? Node.bareNode(node) : null;
      },
      get right() {
        return node.parent ? Node.bareNode(node) : null;
      },
      get children() {
        return node.children?.map((child) => Node.bareNode(child)) ?? [];
      },
    };
  }

  get left() {
    return this._left;
  }

  get right() {
    return this._right;
  }

  get children(): AbstractNode<K, V>[] {
    return [this.left, this.right].filter((v) => !!v) as Node<K, V>[];
  }

  get parent() {
    return this._parent;
  }

  get adjacentNodes(): AbstractNode<K, V>[] {
    if (this.parent) {
      return [...this.children, this.parent];
    }
    return this.children;
  }

  *[Symbol.iterator](): IterableIterator<AbstractNode<K, V>> {
    if (this._left) {
      yield* this._left;
    }
    yield Node.bareNode(this);
    if (this._right) {
      yield* this._right;
    }
  }
}
