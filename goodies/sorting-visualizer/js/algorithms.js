/**
 * Generator-based Sorting Algorithms for Step-by-Step Interactive Visualization
 * Each step yields an action event object: { type: 'compare' | 'swap' | 'write' | 'sorted' | 'pivot', indices: [i, j], ... }
 */

const SortingAlgorithms = {
  info: {
    quick: { name: 'Quick Sort (Dual-Pivot)', time: 'O(N log N)', space: 'O(log N)', stable: 'No' },
    merge: { name: 'Merge Sort', time: 'O(N log N)', space: 'O(N)', stable: 'Yes' },
    heap: { name: 'Heap Sort', time: 'O(N log N)', space: 'O(1)', stable: 'No' },
    radix: { name: 'Radix Sort (LSD)', time: 'O(N · K)', space: 'O(N + K)', stable: 'Yes' },
    shell: { name: 'Shell Sort', time: 'O(N^(4/3))', space: 'O(1)', stable: 'No' },
    tim: { name: 'Tim Sort (Adaptive)', time: 'O(N log N)', space: 'O(N)', stable: 'Yes' },
    insertion: { name: 'Insertion Sort', time: 'O(N²)', space: 'O(1)', stable: 'Yes' },
    bubble: { name: 'Cocktail Shaker Sort', time: 'O(N²)', space: 'O(1)', stable: 'Yes' },
    selection: { name: 'Selection Sort', time: 'O(N²)', space: 'O(1)', stable: 'No' },
    bogo: { name: 'Bogo Sort', time: 'O((N+1)!)', space: 'O(1)', stable: 'No' }
  },

  // 1. Quick Sort
  *quick(arr) {
    function* quickSortHelper(low, high) {
      if (low < high) {
        const pivotIndex = yield* partition(low, high);
        yield* quickSortHelper(low, pivotIndex - 1);
        yield* quickSortHelper(pivotIndex + 1, high);
      } else if (low === high) {
        yield { type: 'sorted', indices: [low] };
      }
    }

    function* partition(low, high) {
      const pivot = arr[high];
      yield { type: 'pivot', indices: [high] };
      let i = low - 1;

      for (let j = low; j < high; j++) {
        yield { type: 'compare', indices: [j, high] };
        if (arr[j] < pivot) {
          i++;
          if (i !== j) {
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            yield { type: 'swap', indices: [i, j] };
          }
        }
      }

      const temp = arr[i + 1];
      arr[i + 1] = arr[high];
      arr[high] = temp;
      yield { type: 'swap', indices: [i + 1, high] };
      yield { type: 'sorted', indices: [i + 1] };
      return i + 1;
    }

    yield* quickSortHelper(0, arr.length - 1);
  },

  // 2. Merge Sort
  *merge(arr) {
    function* mergeSortHelper(start, end) {
      if (start >= end) {
        if (start === end) yield { type: 'sorted', indices: [start] };
        return;
      }
      const mid = Math.floor((start + end) / 2);
      yield* mergeSortHelper(start, mid);
      yield* mergeSortHelper(mid + 1, end);
      yield* mergeSubarrays(start, mid, end);
    }

    function* mergeSubarrays(start, mid, end) {
      const left = arr.slice(start, mid + 1);
      const right = arr.slice(mid + 1, end + 1);
      let i = 0, j = 0, k = start;

      while (i < left.length && j < right.length) {
        yield { type: 'compare', indices: [start + i, mid + 1 + j] };
        if (left[i] <= right[j]) {
          arr[k] = left[i];
          yield { type: 'write', indices: [k], value: left[i] };
          i++;
        } else {
          arr[k] = right[j];
          yield { type: 'write', indices: [k], value: right[j] };
          j++;
        }
        k++;
      }

      while (i < left.length) {
        arr[k] = left[i];
        yield { type: 'write', indices: [k], value: left[i] };
        i++;
        k++;
      }

      while (j < right.length) {
        arr[k] = right[j];
        yield { type: 'write', indices: [k], value: right[j] };
        j++;
        k++;
      }
    }

    yield* mergeSortHelper(0, arr.length - 1);
  },

  // 3. Heap Sort
  *heap(arr) {
    const n = arr.length;

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      yield* heapify(n, i);
    }

    for (let i = n - 1; i > 0; i--) {
      const temp = arr[0];
      arr[0] = arr[i];
      arr[i] = temp;
      yield { type: 'swap', indices: [0, i] };
      yield { type: 'sorted', indices: [i] };
      yield* heapify(i, 0);
    }
    yield { type: 'sorted', indices: [0] };

    function* heapify(size, root) {
      let largest = root;
      const left = 2 * root + 1;
      const right = 2 * root + 2;

      if (left < size) {
        yield { type: 'compare', indices: [left, largest] };
        if (arr[left] > arr[largest]) largest = left;
      }

      if (right < size) {
        yield { type: 'compare', indices: [right, largest] };
        if (arr[right] > arr[largest]) largest = right;
      }

      if (largest !== root) {
        const swap = arr[root];
        arr[root] = arr[largest];
        arr[largest] = swap;
        yield { type: 'swap', indices: [root, largest] };
        yield* heapify(size, largest);
      }
    }
  },

  // 4. Radix Sort (LSD)
  *radix(arr) {
    const maxVal = Math.max(...arr);
    let exp = 1;

    while (Math.floor(maxVal / exp) > 0) {
      const output = new Array(arr.length);
      const count = new Array(10).fill(0);

      for (let i = 0; i < arr.length; i++) {
        const digit = Math.floor(arr[i] / exp) % 10;
        count[digit]++;
        yield { type: 'compare', indices: [i] };
      }

      for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
      }

      for (let i = arr.length - 1; i >= 0; i--) {
        const digit = Math.floor(arr[i] / exp) % 10;
        output[count[digit] - 1] = arr[i];
        count[digit]--;
      }

      for (let i = 0; i < arr.length; i++) {
        arr[i] = output[i];
        yield { type: 'write', indices: [i], value: output[i] };
      }

      exp *= 10;
    }
  },

  // 5. Shell Sort
  *shell(arr) {
    const n = arr.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      for (let i = gap; i < n; i++) {
        const temp = arr[i];
        let j = i;
        yield { type: 'pivot', indices: [i] };

        while (j >= gap) {
          yield { type: 'compare', indices: [j - gap, j] };
          if (arr[j - gap] > temp) {
            arr[j] = arr[j - gap];
            yield { type: 'write', indices: [j], value: arr[j - gap] };
            j -= gap;
          } else {
            break;
          }
        }
        arr[j] = temp;
        yield { type: 'write', indices: [j], value: temp };
      }
    }
  },

  // 6. Tim Sort (Simplified)
  *tim(arr) {
    const RUN = 32;
    const n = arr.length;

    for (let i = 0; i < n; i += RUN) {
      yield* insertionSortSub(i, Math.min(i + RUN - 1, n - 1));
    }

    for (let size = RUN; size < n; size = 2 * size) {
      for (let left = 0; left < n; left += 2 * size) {
        const mid = left + size - 1;
        const right = Math.min(left + 2 * size - 1, n - 1);
        if (mid < right) {
          yield* mergeTim(left, mid, right);
        }
      }
    }

    function* insertionSortSub(left, right) {
      for (let i = left + 1; i <= right; i++) {
        const temp = arr[i];
        let j = i - 1;
        while (j >= left) {
          yield { type: 'compare', indices: [j, i] };
          if (arr[j] > temp) {
            arr[j + 1] = arr[j];
            yield { type: 'write', indices: [j + 1], value: arr[j] };
            j--;
          } else {
            break;
          }
        }
        arr[j + 1] = temp;
        yield { type: 'write', indices: [j + 1], value: temp };
      }
    }

    function* mergeTim(l, m, r) {
      const len1 = m - l + 1, len2 = r - m;
      const left = new Array(len1);
      const right = new Array(len2);
      for (let x = 0; x < len1; x++) left[x] = arr[l + x];
      for (let x = 0; x < len2; x++) right[x] = arr[m + 1 + x];

      let i = 0, j = 0, k = l;
      while (i < len1 && j < len2) {
        yield { type: 'compare', indices: [l + i, m + 1 + j] };
        if (left[i] <= right[j]) {
          arr[k] = left[i];
          yield { type: 'write', indices: [k], value: left[i] };
          i++;
        } else {
          arr[k] = right[j];
          yield { type: 'write', indices: [k], value: right[j] };
          j++;
        }
        k++;
      }

      while (i < len1) {
        arr[k] = left[i];
        yield { type: 'write', indices: [k], value: left[i] };
        i++; k++;
      }
      while (j < len2) {
        arr[k] = right[j];
        yield { type: 'write', indices: [k], value: right[j] };
        j++; k++;
      }
    }
  },

  // 7. Insertion Sort
  *insertion(arr) {
    for (let i = 1; i < arr.length; i++) {
      const key = arr[i];
      let j = i - 1;
      yield { type: 'pivot', indices: [i] };

      while (j >= 0) {
        yield { type: 'compare', indices: [j, j + 1] };
        if (arr[j] > key) {
          arr[j + 1] = arr[j];
          yield { type: 'write', indices: [j + 1], value: arr[j] };
          j--;
        } else {
          break;
        }
      }
      arr[j + 1] = key;
      yield { type: 'write', indices: [j + 1], value: key };
    }
  },

  // 8. Cocktail Shaker Sort
  *bubble(arr) {
    let start = 0;
    let end = arr.length - 1;
    let swapped = true;

    while (swapped) {
      swapped = false;
      for (let i = start; i < end; ++i) {
        yield { type: 'compare', indices: [i, i + 1] };
        if (arr[i] > arr[i + 1]) {
          const temp = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = temp;
          yield { type: 'swap', indices: [i, i + 1] };
          swapped = true;
        }
      }
      yield { type: 'sorted', indices: [end] };
      if (!swapped) break;
      swapped = false;
      end--;

      for (let i = end - 1; i >= start; --i) {
        yield { type: 'compare', indices: [i, i + 1] };
        if (arr[i] > arr[i + 1]) {
          const temp = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = temp;
          yield { type: 'swap', indices: [i, i + 1] };
          swapped = true;
        }
      }
      yield { type: 'sorted', indices: [start] };
      start++;
    }
  },

  // 9. Selection Sort
  *selection(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      yield { type: 'pivot', indices: [i] };

      for (let j = i + 1; j < n; j++) {
        yield { type: 'compare', indices: [j, minIdx] };
        if (arr[j] < arr[minIdx]) {
          minIdx = j;
        }
      }

      if (minIdx !== i) {
        const temp = arr[i];
        arr[i] = arr[minIdx];
        arr[minIdx] = temp;
        yield { type: 'swap', indices: [i, minIdx] };
      }
      yield { type: 'sorted', indices: [i] };
    }
    yield { type: 'sorted', indices: [n - 1] };
  },

  // 10. Bogo Sort (with 10,000 operations safety cap)
  *bogo(arr) {
    let steps = 0;
    const isSorted = () => {
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] > arr[i + 1]) return false;
      }
      return true;
    };

    while (!isSorted() && steps < 5000) {
      steps++;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        yield { type: 'swap', indices: [i, j] };
      }
      for (let i = 0; i < arr.length - 1; i++) {
        yield { type: 'compare', indices: [i, i + 1] };
        if (arr[i] > arr[i + 1]) break;
      }
    }
  }
};
