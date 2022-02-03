import { strict as assert } from "assert";

/**
 * An abstract node that encapsulate the bare minimum that a node represents.
 * More specifically, it hides away all destructive methods
 */
type AbstractNode<K, V> = {
  readonly key: K;
  readonly value: V;
  readonly left: AbstractNode<K, V> | null;
  readonly right: AbstractNode<K, V> | null;
};

/**
 * Represents a key/value pairing in a key/value store, represented by an
 * unordered binary tree
 */
export default class Node<K, V> {
  private _left: Node<K, V> | null = null;
  private _right: Node<K, V> | null = null;

  constructor(private k: K, private v: V) {}

  private hasCricularReference(node: Node<K, V>): boolean {
    if (this._left === node) {
      return true;
    }

    if (this._right === node) {
      return true;
    }

    return (
      (this._left?.hasCricularReference(node) ?? false) ||
      (this._right?.hasCricularReference(node) ?? false)
    );
  }

  /**
   * Inserts the specified node into the node
   *
   * Note: this has a worst-case running time of O(n²)!
   * @param node The node to insert
   * @returns nothing
   */
  insert(node: Node<K, V>) {
    assert(node !== this);

    const leftDepth = this.getLeftDepth();
    const rightDepth = this.getRightDepth();

    if (leftDepth <= rightDepth) {
      assert(!this._right?.hasCricularReference(node) ?? false);
      if (!this._left) {
        this._left = node;
      } else {
        this._left.insert(node);
      }
      this.leftDepth = null;
    } else {
      assert(!this._left?.hasCricularReference(node) ?? false);
      if (!this._right) {
        this._right = node;
      } else {
        this._right.insert(node);
      }
      this.rightDepth = null;
    }
  }

  /**
   * Deletes the node specified by the given key
   * @param key The key used to find the node that we intend to delete
   */
  delete(key: K) {
    if (this._left && this._left.k === key) {
      const leftChild = this._left._left;
      const rightChild = this._left._right;
      this._left = leftChild;
      this.leftDepth = null;
      if (rightChild) {
        this.insert(rightChild);
      }
    } else if (this._right && this._right.k === key) {
      const leftChild = this._right._left;
      const rightChild = this._right._right;
      this._right = leftChild;
      this.rightDepth = null;
      if (rightChild) {
        this.insert(rightChild);
      }
    } else {
      if (this._left) {
        this._left.delete(key);
      }

      if (this._right) {
        this._right.delete(key);
      }
    }
  }

  find(k: K): Node<K, V> | null {
    if (this.k === k) {
      return this;
    }
    const left = this._left?.find(k);
    const right = this._right?.find(k);
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

  get node(): AbstractNode<K, V> {
    const that = this;
    return {
      get key() {
        return that.k;
      },
      get value() {
        return that.value;
      },
      get left() {
        return that._left?.node ?? null;
      },
      get right() {
        return that._right?.node ?? null;
      },
    };
  }

  get left() {
    return this._left;
  }

  get right() {
    return this._right;
  }

  *[Symbol.iterator](): IterableIterator<AbstractNode<K, V>> {
    if (this._left) {
      yield* this._left;
    }
    yield this.node;
    if (this._right) {
      yield* this._right;
    }
  }
}
