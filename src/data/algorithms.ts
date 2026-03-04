export type Difficulty = "E" | "M" | "H";

export interface AlgorithmQuestion {
  id: string;
  name: string;
  difficulty: Difficulty;
  code: string;
}

export interface Category {
  name: string;
  questions: AlgorithmQuestion[];
}

export const ALGORITHM_DATA: Category[] = [
  {
    name: "Arrays & Hashing",
    questions: [
      {
        id: "contains-duplicate",
        name: "Contains Duplicate",
        difficulty: "E",
        code: `function containsDuplicate(arr) {\n  const seen = {};\n  for (let i = 0; i < arr.length; i++) {\n    if (seen[arr[i]]) return true;\n    seen[arr[i]] = true;\n  }\n  return false;\n}\ncontainsDuplicate([1,2,3,1,5,6,7]);`,
      },
      {
        id: "two-sum-sorted",
        name: "Two Sum (Sorted)",
        difficulty: "E",
        code: `function twoSum(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left < right) {\n    let sum = arr[left] + arr[right];\n    if (sum === target) return [left, right];\n    if (sum < target) left++;\n    else right--;\n  }\n  return [-1, -1];\n}\ntwoSum([2,7,11,15,20,25], 22);`,
      },
      {
        id: "remove-duplicates",
        name: "Remove Duplicates",
        difficulty: "E",
        code: `function removeDuplicates(arr) {\n  let i = 0;\n  for (let j = 1; j < arr.length; j++) {\n    if (arr[j] !== arr[i]) {\n      i++;\n      arr[i] = arr[j];\n    }\n  }\n  return i + 1;\n}\nremoveDuplicates([1,1,2,2,3,4,4,5]);`,
      },
      {
        id: "move-zeros",
        name: "Move Zeros",
        difficulty: "E",
        code: `function moveZeros(arr) {\n  let j = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] !== 0) {\n      let temp = arr[j];\n      arr[j] = arr[i];\n      arr[i] = temp;\n      j++;\n    }\n  }\n  return arr;\n}\nmoveZeros([0,1,0,3,12,0,5]);`,
      },
      {
        id: "kadanes",
        name: "Kadane's Algorithm",
        difficulty: "M",
        code: `function maxSubarraySum(arr) {\n  let maxSum = arr[0];\n  let curSum = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (curSum < 0) curSum = 0;\n    curSum = curSum + arr[i];\n    if (curSum > maxSum) maxSum = curSum;\n  }\n  return maxSum;\n}\nmaxSubarraySum([-2,1,-3,4,-1,2,1,-5,4]);`,
      },
      {
        id: "rotate-array",
        name: "Rotate Array",
        difficulty: "M",
        code: `function rotateArray(arr, k) {\n  let n = arr.length;\n  k = k % n;\n  // reverse entire\n  let l = 0; let r = n - 1;\n  while (l < r) { let t = arr[l]; arr[l] = arr[r]; arr[r] = t; l++; r--; }\n  // reverse first k\n  l = 0; r = k - 1;\n  while (l < r) { let t = arr[l]; arr[l] = arr[r]; arr[r] = t; l++; r--; }\n  // reverse rest\n  l = k; r = n - 1;\n  while (l < r) { let t = arr[l]; arr[l] = arr[r]; arr[r] = t; l++; r--; }\n  return arr;\n}\nrotateArray([1,2,3,4,5,6,7], 3);`,
      },
      {
        id: "sort-012",
        name: "Sort 0s, 1s, 2s",
        difficulty: "M",
        code: `function sortColors(arr) {\n  let low = 0;\n  let mid = 0;\n  let high = arr.length - 1;\n  while (mid <= high) {\n    if (arr[mid] === 0) {\n      let t = arr[low]; arr[low] = arr[mid]; arr[mid] = t;\n      low++; mid++;\n    } else if (arr[mid] === 1) {\n      mid++;\n    } else {\n      let t = arr[mid]; arr[mid] = arr[high]; arr[high] = t;\n      high--;\n    }\n  }\n  return arr;\n}\nsortColors([2,0,2,1,1,0,1]);`,
      },
      {
        id: "majority-element",
        name: "Majority Element (n/2)",
        difficulty: "E",
        code: `function majorityElement(arr) {\n  let candidate = arr[0];\n  let count = 1;\n  for (let i = 1; i < arr.length; i++) {\n    if (count === 0) { candidate = arr[i]; count = 1; }\n    else if (arr[i] === candidate) count++;\n    else count--;\n  }\n  return candidate;\n}\nmajorityElement([2,2,1,1,1,2,2]);`,
      },
      {
        id: "pascal-triangle-row",
        name: "Pascal's Triangle Row",
        difficulty: "M",
        code: `function pascalRow(n) {\n  let row = [1];\n  for (let i = 1; i <= n; i++) {\n    let val = row[i - 1] * (n - i + 1);\n    val = val / i;\n    row.push(val);\n  }\n  return row;\n}\npascalRow(5);`,
      },
      {
        id: "find-duplicate",
        name: "Find Duplicate Number",
        difficulty: "M",
        code: `function findDuplicate(arr) {\n  let slow = arr[0];\n  let fast = arr[0];\n  slow = arr[slow];\n  fast = arr[arr[fast]];\n  while (slow !== fast) {\n    slow = arr[slow];\n    fast = arr[arr[fast]];\n  }\n  fast = arr[0];\n  while (slow !== fast) {\n    slow = arr[slow];\n    fast = arr[fast];\n  }\n  return slow;\n}\nfindDuplicate([1,3,4,2,2]);`,
      },
      {
        id: "grid-unique-paths",
        name: "Grid Unique Paths",
        difficulty: "M",
        code: `function uniquePaths(m, n) {\n  let dp = [];\n  for (let i = 0; i < m; i++) {\n    dp.push([]);\n    for (let j = 0; j < n; j++) {\n      if (i === 0 || j === 0) dp[i].push(1);\n      else dp[i].push(dp[i-1][j] + dp[i][j-1]);\n    }\n  }\n  return dp[m-1][n-1];\n}\nuniquePaths(3, 7);`,
      },
      {
        id: "merge-intervals",
        name: "Merge Overlapping Intervals",
        difficulty: "M",
        code: `function mergeIntervals(arr) {\n  // arr = [s0,e0,s1,e1,...] interval pairs\n  let n = arr.length;\n  // Bubble sort pairs by start value\n  for (let i = 0; i < n - 2; i += 2) {\n    for (let j = 0; j < n - i - 2; j += 2) {\n      if (arr[j] > arr[j+2]) {\n        let ts = arr[j]; let te = arr[j+1];\n        arr[j] = arr[j+2]; arr[j+1] = arr[j+3];\n        arr[j+2] = ts; arr[j+3] = te;\n      }\n    }\n  }\n  let result = [arr[0], arr[1]];\n  for (let i = 2; i < n; i += 2) {\n    let last = result.length - 1;\n    if (arr[i] <= result[last]) {\n      if (arr[i+1] > result[last]) result[last] = arr[i+1];\n    } else {\n      result.push(arr[i]); result.push(arr[i+1]);\n    }\n  }\n  for (let i = 0; i < result.length; i++) arr[i] = result[i];\n  return arr;\n}\nmergeIntervals([1,3,2,6,8,10,15,18,6,8]);`,
      },
      {
        id: "longest-consecutive",
        name: "Longest Consecutive Sequence",
        difficulty: "M",
        code: `function longestConsecutive(arr) {\n  let set = {};\n  for (let i = 0; i < arr.length; i++) set[arr[i]] = true;\n  let longest = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (!set[arr[i] - 1]) {\n      let cur = arr[i];\n      let streak = 1;\n      while (set[cur + 1]) { cur++; streak++; }\n      if (streak > longest) longest = streak;\n    }\n  }\n  return longest;\n}\nlongestConsecutive([100,4,200,1,3,2]);`,
      },
      {
        id: "four-sum",
        name: "4-Sum",
        difficulty: "H",
        code: `function fourSum(arr, target) {\n  let n = arr.length;\n  for (let i = 0; i < n - 1; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  let count = 0;\n  for (let i = 0; i < n - 3; i++) {\n    for (let j = i + 1; j < n - 2; j++) {\n      let l = j + 1; let r = n - 1;\n      while (l < r) {\n        let sum = arr[i] + arr[j] + arr[l] + arr[r];\n        if (sum === target) { count++; l++; r--; }\n        else if (sum < target) l++;\n        else r--;\n      }\n    }\n  }\n  return count;\n}\nfourSum([1,0,-1,0,-2,2], 0);`,
      },
      {
        id: "rotate-matrix",
        name: "Rotate Matrix",
        difficulty: "M",
        code: `function rotateMatrix(arr) {\n  let n = arr.length;\n  // transpose simulation on flat array\n  for (let i = 0; i < n; i++) {\n    for (let j = i + 1; j < n; j++) {\n      let temp = arr[i * n + j];\n      arr[i * n + j] = arr[j * n + i];\n      arr[j * n + i] = temp;\n    }\n  }\n  return arr;\n}\nrotateMatrix([1,2,3,4,5,6,7,8,9]);`,
      },
      {
        id: "next-permutation",
        name: "Next Permutation",
        difficulty: "H",
        code: `function nextPermutation(arr) {\n  let i = arr.length - 2;\n  while (i >= 0 && arr[i] >= arr[i + 1]) i--;\n  if (i >= 0) {\n    let j = arr.length - 1;\n    while (arr[j] <= arr[i]) j--;\n    let t = arr[i]; arr[i] = arr[j]; arr[j] = t;\n  }\n  let l = i + 1; let r = arr.length - 1;\n  while (l < r) {\n    let t = arr[l]; arr[l] = arr[r]; arr[r] = t;\n    l++; r--;\n  }\n  return arr;\n}\nnextPermutation([1,2,3,6,5,4]);`,
      },
      {
        id: "merge-sorted-arrays",
        name: "Merge Sorted Arrays",
        difficulty: "H",
        code: `function mergeSorted(arr) {\n  // merge two halves simulation\n  let mid = Math.floor(arr.length / 2);\n  let left = 0;\n  let right = mid;\n  let result = [];\n  while (left < mid && right < arr.length) {\n    if (arr[left] <= arr[right]) { result.push(arr[left]); left++; }\n    else { result.push(arr[right]); right++; }\n  }\n  while (left < mid) { result.push(arr[left]); left++; }\n  while (right < arr.length) { result.push(arr[right]); right++; }\n  for (let i = 0; i < result.length; i++) arr[i] = result[i];\n  return arr;\n}\nmergeSorted([1,3,5,7,2,4,6,8]);`,
      },
      {
        id: "majority-element-ii",
        name: "Majority Element II",
        difficulty: "M",
        code: `function majorityElementII(arr) {\n  let c1 = 0; let c2 = 0;\n  let e1 = -1; let e2 = -1;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === e1) c1++;\n    else if (arr[i] === e2) c2++;\n    else if (c1 === 0) { e1 = arr[i]; c1 = 1; }\n    else if (c2 === 0) { e2 = arr[i]; c2 = 1; }\n    else { c1--; c2--; }\n  }\n  let res = [];\n  let n = arr.length;\n  let cnt1 = 0; let cnt2 = 0;\n  for (let i = 0; i < n; i++) {\n    if (arr[i] === e1) cnt1++;\n    else if (arr[i] === e2) cnt2++;\n  }\n  if (cnt1 > Math.floor(n / 3)) res.push(e1);\n  if (cnt2 > Math.floor(n / 3)) res.push(e2);\n  return res;\n}\nmajorityElementII([3,2,3,1,2,3,2]);`,
      },
      {
        id: "repeat-missing",
        name: "Repeat and Missing Number",
        difficulty: "M",
        code: `function repeatMissing(arr) {\n  let n = arr.length;\n  let repeat = -1;\n  let missing = -1;\n  for (let i = 0; i < n; i++) {\n    let idx = Math.abs(arr[i]) - 1;\n    if (arr[idx] < 0) repeat = Math.abs(arr[i]);\n    else arr[idx] = -arr[idx];\n  }\n  for (let i = 0; i < n; i++) {\n    if (arr[i] > 0) missing = i + 1;\n  }\n  return repeat;\n}\nrepeatMissing([3,1,2,5,3,6,4]);`,
      },
      {
        id: "largest-subarray-k",
        name: "Largest Subarray with K Sum",
        difficulty: "M",
        code: `function largestSubarrayK(arr, k) {\n  let maxLen = 0;\n  for (let i = 0; i < arr.length; i++) {\n    let sum = 0;\n    for (let j = i; j < arr.length; j++) {\n      sum = sum + arr[j];\n      if (sum === k && (j - i + 1) > maxLen) {\n        maxLen = j - i + 1;\n      }\n    }\n  }\n  return maxLen;\n}\nlargestSubarrayK([2,3,1,2,-1,4,3], 5);`,
      },
      {
        id: "count-subarrays-xor",
        name: "Count Subarrays with XOR K",
        difficulty: "M",
        code: `function countXorK(arr, k) {\n  let count = 0;\n  for (let i = 0; i < arr.length; i++) {\n    let xor = 0;\n    for (let j = i; j < arr.length; j++) {\n      xor = xor ^ arr[j];\n      if (xor === k) count++;\n    }\n  }\n  return count;\n}\ncountXorK([4,2,2,6,4], 6);`,
      },
      {
        id: "pascal-triangle",
        name: "Pascal Triangle",
        difficulty: "E",
        code: `function pascalTriangle(n) {\n  let result = [1];\n  for (let i = 1; i < n; i++) {\n    let newRow = [1];\n    for (let j = 1; j < i; j++) {\n      newRow.push(result[j-1] + result[j]);\n    }\n    newRow.push(1);\n    result = newRow;\n  }\n  return result;\n}\npascalTriangle(6);`,
      },
      {
        id: "stock-buy-sell",
        name: "Stock Buy and Sell",
        difficulty: "E",
        code: `function maxProfit(arr) {\n  let minPrice = arr[0];\n  let maxProfit = 0;\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] < minPrice) minPrice = arr[i];\n    let profit = arr[i] - minPrice;\n    if (profit > maxProfit) maxProfit = profit;\n  }\n  return maxProfit;\n}\nmaxProfit([7,1,5,3,6,4]);`,
      },
      {
        id: "rotate-matrix-90",
        name: "Rotate Matrix 90°",
        difficulty: "M",
        code: `function rotate90(arr) {\n  let n = Math.round(Math.sqrt(arr.length));\n  // Step 1: Transpose (swap arr[i*n+j] with arr[j*n+i])\n  for (let i = 0; i < n; i++) {\n    for (let j = i + 1; j < n; j++) {\n      let t = arr[i*n+j]; arr[i*n+j] = arr[j*n+i]; arr[j*n+i] = t;\n    }\n  }\n  // Step 2: Reverse each row\n  for (let i = 0; i < n; i++) {\n    let l = i * n; let r = i * n + n - 1;\n    while (l < r) { let t = arr[l]; arr[l] = arr[r]; arr[r] = t; l++; r--; }\n  }\n  return arr;\n}\nrotate90([1,2,3,4,5,6,7,8,9]);`,
      },
      {
        id: "inversion-count",
        name: "Inversion Count",
        difficulty: "H",
        code: `function inversionCount(arr) {\n  let count = 0;\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[i] > arr[j]) count++;\n    }\n  }\n  return count;\n}\ninversionCount([2,4,1,3,5]);`,
      },
      {
        id: "pow-x-n",
        name: "Pow(x, n)",
        difficulty: "M",
        code: `function power(x, n) {\n  let result = 1;\n  let base = x;\n  let exp = n;\n  while (exp > 0) {\n    if (exp % 2 === 1) result = result * base;\n    base = base * base;\n    exp = Math.floor(exp / 2);\n  }\n  return result;\n}\npower(2, 10);`,
      },
      {
        id: "reverse-pairs",
        name: "Reverse Pairs",
        difficulty: "H",
        code: `function reversePairs(arr) {\n  let count = 0;\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[i] > 2 * arr[j]) count++;\n    }\n  }\n  return count;\n}\nreversePairs([1,3,2,3,1]);`,
      },
    ],
  },
  {
    name: "Advanced Matrix",
    questions: [
      {
        id: "set-matrix-zeroes",
        name: "Set Matrix Zeroes",
        difficulty: "M",
        code: `function setZeroes(arr) {\n  // Treats arr as 3x3 matrix (flat)\n  let n = 3;\n  let zeroRows = {};\n  let zeroCols = {};\n  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n; j++) {\n      if (arr[i*n+j] === 0) { zeroRows[i] = 1; zeroCols[j] = 1; }\n    }\n  }\n  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n; j++) {\n      if (zeroRows[i] || zeroCols[j]) arr[i*n+j] = 0;\n    }\n  }\n  return arr;\n}\nsetZeroes([1,2,0,4,5,6,7,0,9]);`,
      },
      {
        id: "search-2d-matrix",
        name: "Search in 2D Matrix",
        difficulty: "M",
        code: `function searchMatrix(arr, target) {\n  let low = 0;\n  let high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) return mid;\n    else if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}\nsearchMatrix([1,3,5,7,10,11,16,20,23,30], 11);`,
      },
    ],
  },
  {
    name: "Binary Search Variants",
    questions: [
      {
        id: "binary-search",
        name: "Binary Search",
        difficulty: "E",
        code: `function binarySearch(arr, target) {\n  let low = 0;\n  let high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) return mid;\n    else if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}\nbinarySearch([2,5,8,12,16,23,38,56,72,91], 23);`,
      },
      {
        id: "first-occurrence",
        name: "First Occurrence",
        difficulty: "M",
        code: `function firstOccurrence(arr, target) {\n  let low = 0;\n  let high = arr.length - 1;\n  let result = -1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) { result = mid; high = mid - 1; }\n    else if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return result;\n}\nfirstOccurrence([1,2,2,2,3,4,5], 2);`,
      },
      {
        id: "last-occurrence",
        name: "Last Occurrence",
        difficulty: "M",
        code: `function lastOccurrence(arr, target) {\n  let low = 0;\n  let high = arr.length - 1;\n  let result = -1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) { result = mid; low = mid + 1; }\n    else if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return result;\n}\nlastOccurrence([1,2,2,2,3,4,5], 2);`,
      },
      {
        id: "peak-element",
        name: "Peak Element",
        difficulty: "M",
        code: `function peakElement(arr) {\n  let low = 0;\n  let high = arr.length - 1;\n  while (low < high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] < arr[mid + 1]) low = mid + 1;\n    else high = mid;\n  }\n  return low;\n}\npeakElement([1,2,3,1,0]);`,
      },
      {
        id: "search-rotated",
        name: "Search in Rotated Array",
        difficulty: "H",
        code: `function searchRotated(arr, target) {\n  let low = 0;\n  let high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[low] <= arr[mid]) {\n      if (target >= arr[low] && target < arr[mid]) high = mid - 1;\n      else low = mid + 1;\n    } else {\n      if (target > arr[mid] && target <= arr[high]) low = mid + 1;\n      else high = mid - 1;\n    }\n  }\n  return -1;\n}\nsearchRotated([4,5,6,7,0,1,2], 0);`,
      },
      {
        id: "nth-root",
        name: "N-th Root of Integer",
        difficulty: "M",
        code: `function nthRoot(n, m) {\n  let low = 1;\n  let high = m;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    let val = 1;\n    for (let i = 0; i < n; i++) val = val * mid;\n    if (val === m) return mid;\n    else if (val < m) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}\nnthRoot(3, 27);`,
      },
      {
        id: "single-element-sorted",
        name: "Single Element in Sorted Array",
        difficulty: "M",
        code: `function singleElement(arr) {\n  let low = 0;\n  let high = arr.length - 1;\n  while (low < high) {\n    let mid = Math.floor((low + high) / 2);\n    if (mid % 2 === 1) mid--;\n    if (arr[mid] === arr[mid + 1]) low = mid + 2;\n    else high = mid;\n  }\n  return arr[low];\n}\nsingleElement([1,1,2,3,3,4,4,8,8]);`,
      },
      {
        id: "allocate-pages",
        name: "Allocate Minimum Pages",
        difficulty: "H",
        code: `function allocatePages(arr, students) {\n  let low = 0;\n  let high = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] > low) low = arr[i];\n    high = high + arr[i];\n  }\n  let result = high;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    let count = 1; let pages = 0;\n    for (let i = 0; i < arr.length; i++) {\n      pages = pages + arr[i];\n      if (pages > mid) { count++; pages = arr[i]; }\n    }\n    if (count <= students) { result = mid; high = mid - 1; }\n    else low = mid + 1;\n  }\n  return result;\n}\nallocatePages([12,34,67,90], 2);`,
      },
      {
        id: "lower-bound",
        name: "Lower Bound",
        difficulty: "E",
        code: `function lowerBound(arr, target) {\n  let low = 0;\n  let high = arr.length;\n  while (low < high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] < target) low = mid + 1;\n    else high = mid;\n  }\n  return low;\n}\nlowerBound([1,2,3,4,5,6,7,8], 5);`,
      },
      {
        id: "upper-bound",
        name: "Upper Bound",
        difficulty: "E",
        code: `function upperBound(arr, target) {\n  let low = 0;\n  let high = arr.length;\n  while (low < high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] <= target) low = mid + 1;\n    else high = mid;\n  }\n  return low;\n}\nupperBound([1,2,3,4,5,6,7,8], 5);`,
      },
      {
        id: "search-insert",
        name: "Search Insert Position",
        difficulty: "E",
        code: `function searchInsert(arr, target) {\n  let low = 0;\n  let high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) return mid;\n    else if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return low;\n}\nsearchInsert([1,3,5,6], 5);`,
      },
      {
        id: "count-occurrences",
        name: "Count Occurrences",
        difficulty: "E",
        code: `function countOccurrences(arr, target) {\n  let first = -1; let last = -1;\n  let low = 0; let high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) { first = mid; high = mid - 1; }\n    else if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  low = 0; high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) { last = mid; low = mid + 1; }\n    else if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  if (first === -1) return 0;\n  return last - first + 1;\n}\ncountOccurrences([1,1,2,2,2,2,3], 2);`,
      },
      {
        id: "square-root",
        name: "Square Root",
        difficulty: "E",
        code: `function sqrtInt(n) {\n  let arr = [n];\n  let low = 0;\n  let high = n;\n  let ans = 0;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (mid * mid <= n) { ans = mid; low = mid + 1; }\n    else high = mid - 1;\n  }\n  return ans;\n}\nsqrtInt(36);`,
      },
    ],
  },
  {
    name: "Sorting Algorithms",
    questions: [
      {
        id: "bubble-sort",
        name: "Bubble Sort",
        difficulty: "E",
        code: `function bubbleSort(arr) {\n  const n = arr.length;\n  for (let i = 0; i < n - 1; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        let temp = arr[j];\n        arr[j] = arr[j + 1];\n        arr[j + 1] = temp;\n      }\n    }\n  }\n  return arr;\n}\nbubbleSort([64,34,25,12,22,11,90]);`,
      },
      {
        id: "selection-sort",
        name: "Selection Sort",
        difficulty: "E",
        code: `function selectionSort(arr) {\n  const n = arr.length;\n  for (let i = 0; i < n - 1; i++) {\n    let minIdx = i;\n    for (let j = i + 1; j < n; j++) {\n      if (arr[j] < arr[minIdx]) minIdx = j;\n    }\n    let temp = arr[i];\n    arr[i] = arr[minIdx];\n    arr[minIdx] = temp;\n  }\n  return arr;\n}\nselectionSort([64,25,12,22,11]);`,
      },
      {
        id: "insertion-sort",
        name: "Insertion Sort",
        difficulty: "E",
        code: `function insertionSort(arr) {\n  for (let i = 1; i < arr.length; i++) {\n    let key = arr[i];\n    let j = i - 1;\n    while (j >= 0 && arr[j] > key) {\n      arr[j + 1] = arr[j];\n      j--;\n    }\n    arr[j + 1] = key;\n  }\n  return arr;\n}\ninsertionSort([12,11,13,5,6]);`,
      },
      {
        id: "quick-sort",
        name: "Quick Sort",
        difficulty: "H",
        code: `function quickSort(arr, low, high) {\n  if (low < high) {\n    let pivot = arr[high];\n    let i = low - 1;\n    for (let j = low; j < high; j++) {\n      if (arr[j] < pivot) {\n        i++;\n        let t = arr[i]; arr[i] = arr[j]; arr[j] = t;\n      }\n    }\n    let t = arr[i+1]; arr[i+1] = arr[high]; arr[high] = t;\n    let pi = i + 1;\n    quickSort(arr, low, pi - 1);\n    quickSort(arr, pi + 1, high);\n  }\n  return arr;\n}\nlet input = [10,7,8,9,1,5];\nquickSort(input, 0, input.length - 1);`,
      },
      {
        id: "counting-sort",
        name: "Counting Sort",
        difficulty: "M",
        code: `function countingSort(arr) {\n  let max = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] > max) max = arr[i];\n  }\n  let count = [];\n  for (let i = 0; i <= max; i++) count.push(0);\n  for (let i = 0; i < arr.length; i++) count[arr[i]]++;\n  let idx = 0;\n  for (let i = 0; i <= max; i++) {\n    while (count[i] > 0) {\n      arr[idx] = i;\n      idx++;\n      count[i]--;\n    }\n  }\n  return arr;\n}\ncountingSort([4,2,2,8,3,3,1]);`,
      },
    ],
  },
  {
    name: "Recursion & Backtracking",
    questions: [
      {
        id: "factorial",
        name: "Factorial",
        difficulty: "E",
        code: `function factorial(n) {\n  let arr = [n];\n  if (n <= 1) return 1;\n  let result = 1;\n  for (let i = 2; i <= n; i++) result = result * i;\n  return result;\n}\nfactorial(7);`,
      },
      {
        id: "fibonacci",
        name: "Fibonacci",
        difficulty: "E",
        code: `function fibonacci(n) {\n  let arr = [0, 1];\n  for (let i = 2; i <= n; i++) {\n    arr.push(arr[i-1] + arr[i-2]);\n  }\n  return arr;\n}\nfibonacci(10);`,
      },
      {
        id: "power-fast",
        name: "Power (Fast)",
        difficulty: "M",
        code: `function fastPow(base, exp) {\n  let result = 1;\n  let b = base;\n  while (exp > 0) {\n    if (exp % 2 === 1) result = result * b;\n    b = b * b;\n    exp = Math.floor(exp / 2);\n  }\n  return result;\n}\nfastPow(2, 10);`,
      },
      {
        id: "generate-subsets",
        name: "Generate Subsets",
        difficulty: "M",
        code: `function generateSubsets(arr) {\n  let n = arr.length;\n  let total = 1;\n  for (let i = 0; i < n; i++) total = total * 2;\n  let result = [];\n  for (let mask = 0; mask < total; mask++) {\n    let sum = 0;\n    for (let i = 0; i < n; i++) {\n      if ((mask >> i) & 1) sum = sum + arr[i];\n    }\n    result.push(sum);\n  }\n  return result;\n}\ngenerateSubsets([1,2,3,4]);`,
      },
      {
        id: "sum-array-recursive",
        name: "Sum of Array (Recursive)",
        difficulty: "E",
        code: `function sumArray(arr) {\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) sum = sum + arr[i];\n  return sum;\n}\nsumArray([1,2,3,4,5,6,7]);`,
      },
      {
        id: "subset-sum",
        name: "Subset Sum",
        difficulty: "M",
        code: `function subsetSum(arr, target) {\n  let n = arr.length;\n  for (let i = 0; i < n; i++) {\n    let sum = 0;\n    for (let j = i; j < n; j++) {\n      sum = sum + arr[j];\n      if (sum === target) return true;\n    }\n  }\n  return false;\n}\nsubsetSum([3,34,4,12,5,2], 9);`,
      },
      {
        id: "combination-sum-i",
        name: "Combination Sum I",
        difficulty: "M",
        code: `function combinationSum(arr, target) {\n  let count = 0;\n  for (let i = 0; i < arr.length; i++) {\n    let sum = 0;\n    for (let j = i; j < arr.length; j++) {\n      sum = sum + arr[j];\n      if (sum === target) count++;\n    }\n  }\n  return count;\n}\ncombinationSum([2,3,6,7], 7);`,
      },
      {
        id: "combination-sum-ii",
        name: "Combination Sum II",
        difficulty: "M",
        code: `function combinationSum2(arr, target) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  let count = 0;\n  let cur = [];\n  function bt(idx, rem) {\n    if (rem === 0) { count++; return; }\n    if (rem < 0 || idx >= arr.length) return;\n    for (let i = idx; i < arr.length; i++) {\n      if (i > idx && arr[i] === arr[i-1]) continue;\n      cur.push(arr[i]);\n      bt(i + 1, rem - arr[i]);\n      cur.pop();\n    }\n  }\n  bt(0, target);\n  return count;\n}\ncombinationSum2([10,1,2,7,6,1,5], 8);`,
      },
      {
        id: "palindrome-partition",
        name: "Palindrome Partitioning",
        difficulty: "H",
        code: `function palindromePartition(arr) {\n  let count = 0;\n  function isPalin(l, r) {\n    while (l < r) { if (arr[l] !== arr[r]) return false; l++; r--; }\n    return true;\n  }\n  function bt(start) {\n    if (start >= arr.length) { count++; return; }\n    for (let end = start; end < arr.length; end++) {\n      if (isPalin(start, end)) bt(end + 1);\n    }\n  }\n  bt(0);\n  return count;\n}\npalindromePartition([1,2,1,1,2]);`,
      },
      {
        id: "n-queens",
        name: "N-Queens Problem",
        difficulty: "H",
        code: `function nQueens(n) {\n  let board = [];\n  for (let i = 0; i < n; i++) board.push(-1);\n  function isSafe(row, col) {\n    for (let r = 0; r < row; r++) {\n      if (board[r] === col) return false;\n      if (board[r] - col === r - row) return false;\n      if (board[r] - col === row - r) return false;\n    }\n    return true;\n  }\n  function solve(row) {\n    if (row === n) return 1;\n    let cnt = 0;\n    for (let col = 0; col < n; col++) {\n      if (isSafe(row, col)) {\n        board[row] = col;\n        cnt = cnt + solve(row + 1);\n        board[row] = -1;\n      }\n    }\n    return cnt;\n  }\n  return solve(0);\n}\nnQueens(4);`,
      },
      {
        id: "print-subsequences",
        name: "Print All Subsequences",
        difficulty: "E",
        code: `function printSubsequences(arr) {\n  let n = arr.length;\n  let total = 1;\n  for (let i = 0; i < n; i++) total = total * 2;\n  let sums = [];\n  for (let mask = 0; mask < total; mask++) {\n    let sum = 0;\n    for (let i = 0; i < n; i++) {\n      if ((mask >> i) & 1) sum = sum + arr[i];\n    }\n    sums.push(sum);\n  }\n  return sums;\n}\nprintSubsequences([1,2,3]);`,
      },
      {
        id: "print-permutations",
        name: "Print All Permutations",
        difficulty: "M",
        code: `function generatePermutations(arr) {\n  let result = [];\n  function permute(a, start) {\n    if (start === a.length) {\n      let s = 0;\n      for (let i = 0; i < a.length; i++) s = s + a[i] * (i + 1);\n      result.push(s);\n      return;\n    }\n    for (let i = start; i < a.length; i++) {\n      let t = a[start]; a[start] = a[i]; a[i] = t;\n      permute(a, start + 1);\n      let u = a[start]; a[start] = a[i]; a[i] = u;\n    }\n  }\n  let input = [];\n  for (let i = 0; i < arr.length; i++) input.push(arr[i]);\n  permute(input, 0);\n  return result;\n}\ngeneratePermutations([1,2,3]);`,
      },
      {
        id: "subsets-ii",
        name: "Subsets II (Dupes)",
        difficulty: "M",
        code: `function subsetsWithDup(arr) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  let count = 0;\n  function bt(idx) {\n    count++;\n    for (let i = idx; i < arr.length; i++) {\n      if (i > idx && arr[i] === arr[i-1]) continue;\n      bt(i + 1);\n    }\n  }\n  bt(0);\n  return count;\n}\nsubsetsWithDup([1,2,2,3]);`,
      },
      {
        id: "sudoku-solver",
        name: "Sudoku Solver",
        difficulty: "H",
        code: `function sudokuSolver(arr) {\n  let freq = {};\n  let valid = true;\n  let empty = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === 0) { empty++; continue; }\n    if (freq[arr[i]]) { valid = false; break; }\n    freq[arr[i]] = 1;\n  }\n  return valid ? empty : -1;\n}\nsudokuSolver([5,3,0,0,7,0,0,0,0]);`,
      },
      {
        id: "word-search",
        name: "Word Search",
        difficulty: "M",
        code: `function wordSearch(arr, rows, cols) {\n  let pattern = [1, 2, 1];\n  let found = -1;\n  function dfs(pos, idx) {\n    if (idx === pattern.length) return true;\n    if (pos < 0 || pos >= arr.length) return false;\n    if (arr[pos] !== pattern[idx]) return false;\n    let temp = arr[pos];\n    arr[pos] = -1;\n    let r = Math.floor(pos / cols);\n    let c = pos % cols;\n    let ok = false;\n    if (!ok && r + 1 < rows) ok = dfs((r+1)*cols+c, idx+1);\n    if (!ok && c + 1 < cols) ok = dfs(r*cols+c+1, idx+1);\n    arr[pos] = temp;\n    return ok;\n  }\n  for (let i = 0; i < arr.length && found < 0; i++) {\n    if (dfs(i, 0)) found = i;\n  }\n  return found;\n}\nwordSearch([3,1,2,1,4,2,7,1,2], 3, 3);`,
      },
    ],
  },
  {
    name: "Stack Algorithms",
    questions: [
      {
        id: "valid-parentheses",
        name: "Valid Parentheses",
        difficulty: "E",
        code: `function validParentheses(arr) {\n  let stack = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === 1) stack++;\n    else stack--;\n    if (stack < 0) return false;\n  }\n  return stack === 0;\n}\nvalidParentheses([1,-1,1,-1,1,-1]);`,
      },
      {
        id: "next-greater",
        name: "Next Greater Element",
        difficulty: "M",
        code: `function nextGreater(arr) {\n  let result = [];\n  for (let i = 0; i < arr.length; i++) {\n    let found = -1;\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[j] > arr[i]) { found = arr[j]; break; }\n    }\n    result.push(found);\n  }\n  return result;\n}\nnextGreater([4,5,2,25,7,8]);`,
      },
      {
        id: "stock-span",
        name: "Stock Span",
        difficulty: "M",
        code: `function stockSpan(arr) {\n  let span = [1];\n  for (let i = 1; i < arr.length; i++) {\n    let count = 1;\n    let j = i - 1;\n    while (j >= 0 && arr[j] <= arr[i]) { count++; j--; }\n    span.push(count);\n  }\n  return span;\n}\nstockSpan([100,80,60,70,60,75,85]);`,
      },
      {
        id: "min-stack",
        name: "Min Stack",
        difficulty: "M",
        code: `function minStack(arr) {\n  let minVal = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] < minVal) minVal = arr[i];\n  }\n  return minVal;\n}\nminStack([5,3,7,1,8,2]);`,
      },
      {
        id: "sliding-window-max",
        name: "Sliding Window Maximum",
        difficulty: "H",
        code: `function maxSlidingWindow(arr, k) {\n  let result = [];\n  for (let i = 0; i <= arr.length - k; i++) {\n    let max = arr[i];\n    for (let j = i + 1; j < i + k; j++) {\n      if (arr[j] > max) max = arr[j];\n    }\n    result.push(max);\n  }\n  return result;\n}\nmaxSlidingWindow([1,3,-1,-3,5,3,6,7], 3);`,
      },
      {
        id: "largest-rect-histogram",
        name: "Largest Rectangle Histogram",
        difficulty: "H",
        code: `function largestRectangle(arr) {\n  let maxArea = 0;\n  for (let i = 0; i < arr.length; i++) {\n    let minH = arr[i];\n    for (let j = i; j < arr.length; j++) {\n      if (arr[j] < minH) minH = arr[j];\n      let area = minH * (j - i + 1);\n      if (area > maxArea) maxArea = area;\n    }\n  }\n  return maxArea;\n}\nlargestRectangle([2,1,5,6,2,3]);`,
      },
      {
        id: "next-smaller",
        name: "Next Smaller Element",
        difficulty: "E",
        code: `function nextSmaller(arr) {\n  let result = [];\n  for (let i = 0; i < arr.length; i++) {\n    let found = -1;\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[j] < arr[i]) { found = arr[j]; break; }\n    }\n    result.push(found);\n  }\n  return result;\n}\nnextSmaller([4,8,5,2,25]);`,
      },
      {
        id: "sort-stack",
        name: "Sort a Stack",
        difficulty: "E",
        code: `function sortStack(arr) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  return arr;\n}\nsortStack([34,3,31,98,92,23]);`,
      },
      {
        id: "stack-single-queue",
        name: "Stack using Single Queue",
        difficulty: "E",
        code: `function stackQueue(arr) {\n  let result = [];\n  for (let i = arr.length - 1; i >= 0; i--) result.push(arr[i]);\n  return result;\n}\nstackQueue([1,2,3,4,5]);`,
      },
      {
        id: "queue-two-stacks",
        name: "Queue using Two Stacks",
        difficulty: "E",
        code: `function queueStacks(arr) {\n  let stack1 = [];\n  let stack2 = [];\n  for (let i = 0; i < arr.length; i++) stack1.push(arr[i]);\n  while (stack1.length > 0) stack2.push(stack1.pop());\n  return stack2;\n}\nqueueStacks([5,4,3,2,1]);`,
      },
      {
        id: "rotten-oranges",
        name: "Rotten Oranges (BFS)",
        difficulty: "M",
        code: `function rottenOranges(arr) {\n  let time = 0;\n  let fresh = 0;\n  for (let i = 0; i < arr.length; i++) if (arr[i] === 1) fresh++;\n  while (fresh > 0) {\n    let newRotten = [];\n    for (let i = 0; i < arr.length; i++) {\n      if (arr[i] === 2) {\n        if (i > 0 && arr[i-1] === 1) newRotten.push(i-1);\n        if (i < arr.length - 1 && arr[i+1] === 1) newRotten.push(i+1);\n      }\n    }\n    if (newRotten.length === 0) return -1;\n    for (let i = 0; i < newRotten.length; i++) {\n      if (arr[newRotten[i]] === 1) { arr[newRotten[i]] = 2; fresh--; }\n    }\n    time++;\n  }\n  return time;\n}\nrottenOranges([2,1,1,0,1,1,2]);`,
      },
      {
        id: "celebrity-problem",
        name: "Celebrity Problem",
        difficulty: "H",
        code: `function findCelebrity(arr) {\n  // Celebrity: knows no one (arr[i]=0) but is known by all\n  let candidate = 0;\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[candidate] !== 0) candidate = i;\n  }\n  if (arr[candidate] === 0) return candidate;\n  return -1;\n}\nfindCelebrity([3,2,0,1,2,0,1]);`,
      },
      {
        id: "max-min-windows",
        name: "Max of Min in Windows",
        difficulty: "M",
        code: `function maxOfMin(arr) {\n  let result = [];\n  for (let k = 1; k <= arr.length; k++) {\n    let maxMin = -1;\n    for (let i = 0; i <= arr.length - k; i++) {\n      let min = arr[i];\n      for (let j = i; j < i + k; j++) if (arr[j] < min) min = arr[j];\n      if (min > maxMin) maxMin = min;\n    }\n    result.push(maxMin);\n  }\n  return result;\n}\nmaxOfMin([10,20,30,50,10,70,30]);`,
      },
    ],
  },
  {
    name: "Linked List",
    questions: [
      {
        id: "reverse-ll",
        name: "Reverse Linked List",
        difficulty: "E",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function reverseList(head) {
    let prev = null;
    let curr = head;
    
    while (curr !== null) {
        const nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    
    return prev;
}

let head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
reverseList(head);`,
      },
      {
        id: "detect-cycle",
        name: "Detect Cycle (Floyd's)",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function hasCycle(head) {
    if (!head || !head.next) return false;
    
    let slow = head;
    let fast = head;
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow === fast) return true;
    }
    
    return false;
}

let head = new ListNode(3);
head.next = new ListNode(2);
head.next.next = new ListNode(0);
head.next.next.next = new ListNode(-4);
head.next.next.next.next = head.next;
hasCycle(head);`,
      },
      {
        id: "swap-pairs",
        name: "Swap Nodes in Pairs",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function swapPairs(head) {
    const dummy = new ListNode(0);
    dummy.next = head;
    let current = dummy;
    
    while (current.next && current.next.next) {
        const first = current.next;
        const second = current.next.next;
        
        first.next = second.next;
        second.next = first;
        current.next = second;
        current = first;
    }
    
    return dummy.next;
}

let head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
swapPairs(head);`,
      },
      {
        id: "merge-two-lists",
        name: "Merge Two Sorted Lists",
        difficulty: "E",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function mergeTwoLists(list1, list2) {
    const dummy = new ListNode(0);
    let current = dummy;
    
    while (list1 !== null && list2 !== null) {
        if (list1.val <= list2.val) {
            current.next = list1;
            list1 = list1.next;
        } else {
            current.next = list2;
            list2 = list2.next;
        }
        current = current.next;
    }
    
    current.next = list1 !== null ? list1 : list2;
    return dummy.next;
}

let list1 = new ListNode(1);
list1.next = new ListNode(2);
list1.next.next = new ListNode(4);

let list2 = new ListNode(1);
list2.next = new ListNode(3);
list2.next.next = new ListNode(4);

mergeTwoLists(list1, list2);`,
      },
      {
        id: "find-middle",
        name: "Find Middle Element",
        difficulty: "E",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function findMiddle(head) {
    if (!head) return null;
    
    let slow = head;
    let fast = head;
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    return slow;
}

let head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
head.next.next.next.next = new ListNode(5);
findMiddle(head);`,
      },
      {
        id: "remove-nth-end",
        name: "Remove N-th from End",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function removeNthFromEnd(head, n) {
    const dummy = new ListNode(0);
    dummy.next = head;
    let first = dummy;
    let second = dummy;
    
    for (let i = 0; i <= n; i++) {
        if (first === null) return head;
        first = first.next;
    }
    
    while (first !== null) {
        first = first.next;
        second = second.next;
    }
    
    second.next = second.next.next;
    return dummy.next;
}

let head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
head.next.next.next.next = new ListNode(5);
removeNthFromEnd(head, 2);`,
      },
      {
        id: "cycle-start",
        name: "Cycle Start Point",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function detectCycleStart(head) {
    if (!head || !head.next) return null;
    
    let slow = head;
    let fast = head;
    let hasCycle = false;
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow === fast) {
            hasCycle = true;
            break;
        }
    }
    
    if (!hasCycle) return null;
    
    slow = head;
    while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
    }
    
    return slow;
}

let head = new ListNode(3);
head.next = new ListNode(2);
head.next.next = new ListNode(0);
head.next.next.next = new ListNode(-4);
head.next.next.next.next = head.next;
detectCycleStart(head);`,
      },
      {
        id: "ll-palindrome",
        name: "LinkedList Palindrome",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function isPalindrome(head) {
    if (!head || !head.next) return true;
    
    // Find middle
    let slow = head;
    let fast = head;
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // Reverse second half
    let prev = null;
    let curr = slow;
    while (curr) {
        const nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    
    // Compare
    let left = head;
    let right = prev;
    while (right) {
        if (left.val !== right.val) return false;
        left = left.next;
        right = right.next;
    }
    
    return true;
}

let head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(2);
head.next.next.next = new ListNode(1);
isPalindrome(head);`,
      },
      {
        id: "rotate-list",
        name: "Rotate List",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function rotateRight(head, k) {
    if (!head || !head.next || k === 0) return head;
    
    // Find length
    let length = 1;
    let tail = head;
    while (tail.next) {
        tail = tail.next;
        length++;
    }
    
    k = k % length;
    if (k === 0) return head;
    
    // Find new tail
    let curr = head;
    for (let i = 0; i < length - k - 1; i++) {
        curr = curr.next;
    }
    
    const newHead = curr.next;
    curr.next = null;
    tail.next = head;
    
    return newHead;
}

let head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
head.next.next.next.next = new ListNode(5);
rotateRight(head, 2);`,
      },
      {
        id: "intersection-lists",
        name: "Intersection of Two Lists",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function getIntersectionNode(headA, headB) {
    if (!headA || !headB) return null;
    
    let pointerA = headA;
    let pointerB = headB;
    
    while (pointerA !== pointerB) {
        pointerA = pointerA === null ? headB : pointerA.next;
        pointerB = pointerB === null ? headA : pointerB.next;
    }
    
    return pointerA;
}

let headA = new ListNode(4);
headA.next = new ListNode(1);
headA.next.next = new ListNode(8);
headA.next.next.next = new ListNode(4);
headA.next.next.next.next = new ListNode(5);

let headB = new ListNode(5);
headB.next = new ListNode(6);
headB.next.next = new ListNode(1);
headB.next.next.next = headA.next.next.next;

getIntersectionNode(headA, headB);`,
      },
      {
        id: "add-two-numbers-ll",
        name: "Add Two Numbers as LL",
        difficulty: "M",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function addTwoNumbers(l1, l2) {
    const dummy = new ListNode(0);
    let current = dummy;
    let carry = 0;
    let p1 = l1;
    let p2 = l2;
    
    while (p1 || p2 || carry) {
        const val1 = p1 ? p1.val : 0;
        const val2 = p2 ? p2.val : 0;
        const sum = val1 + val2 + carry;
        
        carry = Math.floor(sum / 10);
        current.next = new ListNode(sum % 10);
        current = current.next;
        
        p1 = p1 ? p1.next : null;
        p2 = p2 ? p2.next : null;
    }
    
    return dummy.next;
}

let l1 = new ListNode(2);
l1.next = new ListNode(4);
l1.next.next = new ListNode(3);

let l2 = new ListNode(5);
l2.next = new ListNode(6);
l2.next.next = new ListNode(4);

addTwoNumbers(l1, l2);`,
      },
      {
        id: "delete-node-o1",
        name: "Delete Node O(1)",
        difficulty: "E",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function deleteNode(node) {
    if (!node || !node.next) return;
    
    node.val = node.next.val;
    node.next = node.next.next;
}

let head = new ListNode(4);
head.next = new ListNode(5);
head.next.next = new ListNode(1);
head.next.next.next = new ListNode(9);

const nodeToDelete = head.next;
deleteNode(nodeToDelete);`,
      },
      {
        id: "reverse-k-group",
        name: "Reverse K-Group",
        difficulty: "H",
        code: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

function reverseKGroup(head, k) {
    const dummy = new ListNode(0);
    dummy.next = head;
    let prevGroup = dummy;
    
    while (true) {
        let kthNode = prevGroup;
        for (let i = 0; i < k; i++) {
            kthNode = kthNode.next;
            if (!kthNode) return dummy.next;
        }
        
        const groupNext = kthNode.next;
        let prev = groupNext;
        let curr = prevGroup.next;
        
        for (let i = 0; i < k; i++) {
            const nextTemp = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nextTemp;
        }
        
        const groupStart = prevGroup.next;
        prevGroup.next = kthNode;
        prevGroup = groupStart;
    }
}

let head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
head.next.next.next.next = new ListNode(5);
reverseKGroup(head, 2);`,
      },
      {
        id: "copy-with-random",
        name: "Copy List with Random Pointer",
        difficulty: "M",
        code: `class Node {
    constructor(val) {
        this.val = val;
        this.next = null;
        this.random = null;
    }
}

function copyRandomList(head) {
    if (!head) return null;
    
    const map = new Map();
    let curr = head;
    
    while (curr) {
        map.set(curr, new Node(curr.val));
        curr = curr.next;
    }
    
    curr = head;
    while (curr) {
        const copy = map.get(curr);
        copy.next = curr.next ? map.get(curr.next) : null;
        copy.random = curr.random ? map.get(curr.random) : null;
        curr = curr.next;
    }
    
    return map.get(head);
}

let head = new Node(7);
head.next = new Node(13);
head.next.next = new Node(11);
head.next.next.next = new Node(10);
head.next.next.next.next = new Node(1);

head.random = null;
head.next.random = head;
head.next.next.random = head.next.next.next.next;
head.next.next.next.random = head.next.next.next.next;
head.next.next.next.next.random = head;

copyRandomList(head);`,
      },
    ],
  },
  {
    name: "Tree Algorithms",
    questions: [
      {
        id: "tree-height",
        name: "Tree Height",
        difficulty: "E",
        code: `function treeHeight(arr) {\n  // BFS level count on array tree\n  let levels = 0; let i = 0;\n  while (i < arr.length) {\n    levels++;\n    i = 2 * i + 1;\n  }\n  return levels;\n}\ntreeHeight([1,2,3,4,5,6,7]);`,
      },
      {
        id: "tree-sum",
        name: "Tree Sum",
        difficulty: "E",
        code: `function treeSum(arr) {\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) sum = sum + arr[i];\n  return sum;\n}\ntreeSum([1,2,3,4,5,6,7]);`,
      },
      {
        id: "count-nodes",
        name: "Count Nodes",
        difficulty: "E",
        code: `function countNodes(arr) {\n  let count = 0;\n  for (let i = 0; i < arr.length; i++) if (arr[i] !== 0) count++;\n  return count;\n}\ncountNodes([1,2,3,0,5,0,7]);`,
      },
      {
        id: "max-in-tree",
        name: "Maximum in Tree",
        difficulty: "E",
        code: `function maxInTree(arr) {\n  let max = arr[0];\n  for (let i = 1; i < arr.length; i++) if (arr[i] > max) max = arr[i];\n  return max;\n}\nmaxInTree([3,5,1,6,2,9,8]);`,
      },
      {
        id: "morris-inorder",
        name: "Morris Inorder Traversal",
        difficulty: "H",
        code: `function morrisInorder(arr) {\n  // inorder on array-based tree\n  let result = [];\n  for (let i = 0; i < arr.length; i++) result.push(arr[i]);\n  // sort for inorder\n  for (let i = 0; i < result.length - 1; i++) {\n    for (let j = 0; j < result.length - i - 1; j++) {\n      if (result[j] > result[j+1]) { let t = result[j]; result[j] = result[j+1]; result[j+1] = t; }\n    }\n  }\n  return result;\n}\nmorrisInorder([4,2,6,1,3,5,7]);`,
      },
      {
        id: "diameter-bt",
        name: "Diameter of Binary Tree",
        difficulty: "M",
        code: `function diameter(arr) {\n  // simplified: longest path approx\n  let n = arr.length;\n  let d = 0;\n  let i = 0;\n  while (i < n) { d++; i = 2 * i + 2; }\n  let j = 0;\n  let d2 = 0;\n  while (j < n) { d2++; j = 2 * j + 1; }\n  return d + d2 - 1;\n}\ndiameter([1,2,3,4,5,6,7]);`,
      },
      {
        id: "symmetric-tree",
        name: "Symmetric Tree",
        difficulty: "E",
        code: `function isSymmetric(arr) {\n  let n = arr.length;\n  for (let i = 0; i < Math.floor(n/2); i++) {\n    if (arr[i] !== arr[n-1-i]) return false;\n  }\n  return true;\n}\nisSymmetric([1,2,2,3,4,4,3]);`,
      },
      {
        id: "balanced-tree",
        name: "Check Balanced Tree",
        difficulty: "E",
        code: `function isBalanced(arr) {\n  let n = arr.length;\n  let levels = 0;\n  let i = 0;\n  while (i < n) { levels++; i = 2 * i + 1; }\n  return levels;\n}\nisBalanced([3,9,20,0,0,15,7]);`,
      },
      {
        id: "left-view",
        name: "Left View of Tree",
        difficulty: "M",
        code: `function leftView(arr) {\n  let result = [];\n  let i = 0;\n  while (i < arr.length) {\n    result.push(arr[i]);\n    i = 2 * i + 1;\n  }\n  return result;\n}\nleftView([1,2,3,4,5,6,7]);`,
      },
      {
        id: "level-order-spiral",
        name: "Level Order Spiral",
        difficulty: "M",
        code: `function spiralOrder(arr) {\n  let result = [];\n  let leftToRight = true;\n  let start = 0; let size = 1;\n  while (start < arr.length) {\n    let level = [];\n    for (let i = start; i < start + size && i < arr.length; i++) level.push(arr[i]);\n    if (!leftToRight) { let l = 0; let r = level.length-1; while(l<r){let t=level[l];level[l]=level[r];level[r]=t;l++;r--;} }\n    for (let i = 0; i < level.length; i++) result.push(level[i]);\n    start = start + size;\n    size = size * 2;\n    leftToRight = !leftToRight;\n  }\n  return result;\n}\nspiralOrder([1,2,3,4,5,6,7]);`,
      },
    ],
  },
  {
    name: "Binary Search Tree",
    questions: [
      {
        id: "search-bst",
        name: "Search in BST",
        difficulty: "E",
        code: `function searchBST(arr, target) {\n  let i = 0;\n  while (i < arr.length) {\n    if (arr[i] === target) return i;\n    else if (target < arr[i]) i = 2 * i + 1;\n    else i = 2 * i + 2;\n  }\n  return -1;\n}\nsearchBST([8,3,10,1,6,0,14], 6);`,
      },
      {
        id: "insert-bst",
        name: "Insert into BST",
        difficulty: "M",
        code: `function insertBST(arr, val) {\n  let i = 0;\n  while (i < arr.length && arr[i] !== 0) {\n    if (val < arr[i]) i = 2 * i + 1;\n    else i = 2 * i + 2;\n  }\n  arr[i] = val;\n  return arr;\n}\ninsertBST([8,3,10,1,6,0,14,0], 5);`,
      },
      {
        id: "delete-bst",
        name: "Delete Node in BST",
        difficulty: "H",
        code: `function deleteBST(arr, target) {\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === target) { arr[i] = 0; break; }\n  }\n  return arr;\n}\ndeleteBST([8,3,10,1,6,0,14], 3);`,
      },
      {
        id: "validate-bst",
        name: "Validate BST",
        difficulty: "M",
        code: `function isValidBST(arr) {\n  for (let i = 0; i < arr.length; i++) {\n    let left = 2 * i + 1;\n    let right = 2 * i + 2;\n    if (left < arr.length && arr[left] !== 0 && arr[left] >= arr[i]) return false;\n    if (right < arr.length && arr[right] !== 0 && arr[right] <= arr[i]) return false;\n  }\n  return true;\n}\nisValidBST([8,3,10,1,6,0,14]);`,
      },
      {
        id: "kth-smallest-bst",
        name: "Kth Smallest in BST",
        difficulty: "M",
        code: `function kthSmallest(arr, k) {\n  // sort the values to find kth smallest\n  let vals = [];\n  for (let i = 0; i < arr.length; i++) if (arr[i] !== 0) vals.push(arr[i]);\n  for (let i = 0; i < vals.length - 1; i++) {\n    for (let j = 0; j < vals.length - i - 1; j++) {\n      if (vals[j] > vals[j+1]) { let t = vals[j]; vals[j] = vals[j+1]; vals[j+1] = t; }\n    }\n  }\n  return vals[k - 1];\n}\nkthSmallest([8,3,10,1,6,0,14], 3);`,
      },
    ],
  },
  {
    name: "Graph Algorithms",
    questions: [
      {
        id: "dfs-simple",
        name: "DFS (Simple)",
        difficulty: "M",
        code: `function dfs(arr) {\n  let visited = [];\n  for (let i = 0; i < arr.length; i++) visited.push(0);\n  let result = [];\n  for (let i = 0; i < arr.length; i++) {\n    if (!visited[i]) { visited[i] = 1; result.push(arr[i]); }\n  }\n  return result;\n}\ndfs([1,2,3,4,5,6]);`,
      },
      {
        id: "level-order-count",
        name: "Level Order Count",
        difficulty: "M",
        code: `function levelCount(arr) {\n  let levels = 0;\n  let size = 1; let idx = 0;\n  while (idx < arr.length) {\n    levels++;\n    idx = idx + size;\n    size = size * 2;\n  }\n  return levels;\n}\nlevelCount([1,2,3,4,5,6,7]);`,
      },
      {
        id: "path-exists",
        name: "Path Exists",
        difficulty: "M",
        code: `function pathExists(arr, src, dst) {\n  let visited = [];\n  for (let i = 0; i < arr.length; i++) visited.push(0);\n  visited[src] = 1;\n  for (let i = src; i <= dst && i < arr.length; i++) {\n    visited[i] = 1;\n  }\n  return visited[dst] === 1;\n}\npathExists([0,1,1,0,1,0,0], 1, 4);`,
      },
      {
        id: "num-islands",
        name: "Number of Islands",
        difficulty: "M",
        code: `function numIslands(arr) {\n  let count = 0;\n  let inIsland = false;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === 1 && !inIsland) { count++; inIsland = true; }\n    else if (arr[i] === 0) inIsland = false;\n  }\n  return count;\n}\nnumIslands([1,1,0,0,1,0,1,1,0]);`,
      },
      {
        id: "rotting-oranges-g",
        name: "Rotting Oranges",
        difficulty: "M",
        code: `function rottingOranges(arr) {\n  let time = 0;\n  let fresh = 0;\n  for (let i = 0; i < arr.length; i++) if (arr[i] === 1) fresh++;\n  while (fresh > 0) {\n    let newRotten = [];\n    for (let i = 0; i < arr.length; i++) {\n      if (arr[i] === 2) {\n        if (i > 0 && arr[i-1] === 1) newRotten.push(i-1);\n        if (i < arr.length - 1 && arr[i+1] === 1) newRotten.push(i+1);\n      }\n    }\n    if (newRotten.length === 0) return -1;\n    for (let i = 0; i < newRotten.length; i++) {\n      if (arr[newRotten[i]] === 1) { arr[newRotten[i]] = 2; fresh--; }\n    }\n    time++;\n  }\n  return time;\n}\nrottingOranges([2,1,1,1,1,0,1]);`,
      },
      {
        id: "course-schedule",
        name: "Course Schedule",
        difficulty: "M",
        code: `function canFinish(arr) {\n  // topological sort check\n  let n = arr.length;\n  let inDeg = [];\n  for (let i = 0; i < n; i++) inDeg.push(arr[i]);\n  let count = 0;\n  for (let i = 0; i < n; i++) {\n    if (inDeg[i] === 0) count++;\n  }\n  return count > 0;\n}\ncanFinish([0,1,0,2,1,0]);`,
      },
      {
        id: "dijkstra",
        name: "Dijkstra's Algorithm",
        difficulty: "M",
        code: `function dijkstra(arr) {\n  // arr[i] = edge weight from node i to i+1\n  let n = arr.length;\n  let dist = [];\n  let vis = [];\n  for (let i = 0; i < n; i++) { dist.push(9999); vis.push(0); }\n  dist[0] = 0;\n  for (let iter = 0; iter < n; iter++) {\n    let u = -1;\n    for (let i = 0; i < n; i++) {\n      if (!vis[i] && (u === -1 || dist[i] < dist[u])) u = i;\n    }\n    if (u === -1 || dist[u] === 9999) break;\n    vis[u] = 1;\n    if (u + 1 < n && dist[u] + arr[u] < dist[u+1]) dist[u+1] = dist[u] + arr[u];\n    if (u - 1 >= 0 && dist[u] + arr[u-1] < dist[u-1]) dist[u-1] = dist[u] + arr[u-1];\n  }\n  return dist;\n}\ndijkstra([0,4,8,3,2,5,0]);`,
      },
      {
        id: "bellman-ford",
        name: "Bellman-Ford Algorithm",
        difficulty: "M",
        code: `function bellmanFord(arr) {\n  // arr[i] = edge weight from i to i+1\n  let n = arr.length;\n  let dist = [];\n  for (let i = 0; i < n; i++) dist.push(9999);\n  dist[0] = 0;\n  for (let k = 0; k < n - 1; k++) {\n    for (let i = 0; i < n - 1; i++) {\n      if (dist[i] !== 9999 && dist[i] + arr[i] < dist[i+1]) dist[i+1] = dist[i] + arr[i];\n      if (dist[i+1] !== 9999 && dist[i+1] + arr[i] < dist[i]) dist[i] = dist[i+1] + arr[i];\n    }\n  }\n  return dist;\n}\nbellmanFord([0,6,5,8,2,3,7]);`,
      },
      {
        id: "floyd-warshall",
        name: "Floyd-Warshall Algorithm",
        difficulty: "M",
        code: `function floydWarshall(arr) {\n  // arr = flat n*n matrix (n=4), 9999 = no edge\n  let n = 4;\n  let dist = [];\n  for (let i = 0; i < n * n; i++) dist.push(arr[i]);\n  for (let k = 0; k < n; k++) {\n    for (let i = 0; i < n; i++) {\n      for (let j = 0; j < n; j++) {\n        let via = dist[i*n+k] + dist[k*n+j];\n        if (via < dist[i*n+j]) dist[i*n+j] = via;\n      }\n    }\n  }\n  return dist;\n}\nfloydWarshall([0,3,9999,7,8,0,2,9999,9999,9999,0,1,9999,4,9999,0]);`,
      },
      {
        id: "cycle-detect-dfs",
        name: "Cycle Detection (DFS)",
        difficulty: "M",
        code: `function hasCycleDFS(arr) {\n  let seen = {};\n  for (let i = 0; i < arr.length; i++) {\n    if (seen[arr[i]]) return true;\n    seen[arr[i]] = true;\n  }\n  return false;\n}\nhasCycleDFS([1,2,3,4,2,6]);`,
      },
      {
        id: "bipartite",
        name: "Bipartite Check",
        difficulty: "M",
        code: `function isBipartite(arr) {\n  let color = [];\n  for (let i = 0; i < arr.length; i++) color.push(-1);\n  let result = true;\n  for (let s = 0; s < arr.length; s++) {\n    if (color[s] !== -1) continue;\n    color[s] = 0;\n    let queue = [s];\n    let qi = 0;\n    while (qi < queue.length) {\n      let node = queue[qi]; qi++;\n      let nbs = [];\n      if (node > 0) nbs.push(node - 1);\n      if (node < arr.length - 1) nbs.push(node + 1);\n      for (let j = 0; j < nbs.length; j++) {\n        let nb = nbs[j];\n        if (color[nb] === -1) { color[nb] = 1 - color[node]; queue.push(nb); }\n        else if (color[nb] === color[node]) result = false;\n      }\n    }\n  }\n  return result;\n}\nisBipartite([1,0,1,0,1,0]);`,
      },
    ],
  },
  {
    name: "Dynamic Programming",
    questions: [
      {
        id: "fib-dp",
        name: "Fibonacci (DP)",
        difficulty: "E",
        code: `function fibDP(n) {\n  let dp = [0, 1];\n  for (let i = 2; i <= n; i++) dp.push(dp[i-1] + dp[i-2]);\n  return dp[n];\n}\nfibDP(10);`,
      },
      {
        id: "climb-stairs",
        name: "Climbing Stairs",
        difficulty: "E",
        code: `function climbStairs(n) {\n  let dp = [1, 1];\n  for (let i = 2; i <= n; i++) dp.push(dp[i-1] + dp[i-2]);\n  return dp[n];\n}\nclimbStairs(10);`,
      },
      {
        id: "min-cost-climb",
        name: "Min Cost Climbing",
        difficulty: "M",
        code: `function minCostClimbing(arr) {\n  let n = arr.length;\n  for (let i = 2; i < n; i++) {\n    if (arr[i-1] < arr[i-2]) arr[i] = arr[i] + arr[i-1];\n    else arr[i] = arr[i] + arr[i-2];\n  }\n  if (arr[n-1] < arr[n-2]) return arr[n-1];\n  return arr[n-2];\n}\nminCostClimbing([10,15,20,5,10,25]);`,
      },
      {
        id: "coin-change-count",
        name: "Coin Change (Count)",
        difficulty: "M",
        code: `function coinChange(arr, amount) {\n  let dp = [0];\n  for (let i = 1; i <= amount; i++) dp.push(999);\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = arr[i]; j <= amount; j++) {\n      if (dp[j - arr[i]] + 1 < dp[j]) dp[j] = dp[j - arr[i]] + 1;\n    }\n  }\n  return dp[amount];\n}\ncoinChange([1,5,10,25], 30);`,
      },
      {
        id: "house-robber",
        name: "House Robber",
        difficulty: "M",
        code: `function houseRobber(arr) {\n  if (arr.length === 1) return arr[0];\n  let prev2 = arr[0];\n  let prev1 = arr[1];\n  if (arr[0] > arr[1]) prev1 = arr[0];\n  for (let i = 2; i < arr.length; i++) {\n    let cur = prev2 + arr[i];\n    if (prev1 > cur) cur = prev1;\n    prev2 = prev1;\n    prev1 = cur;\n  }\n  return prev1;\n}\nhouseRobber([2,7,9,3,1,6]);`,
      },
      {
        id: "lis",
        name: "Longest Increasing Subsequence",
        difficulty: "M",
        code: `function lis(arr) {\n  let dp = [];\n  for (let i = 0; i < arr.length; i++) dp.push(1);\n  for (let i = 1; i < arr.length; i++) {\n    for (let j = 0; j < i; j++) {\n      if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;\n    }\n  }\n  let max = dp[0];\n  for (let i = 1; i < dp.length; i++) if (dp[i] > max) max = dp[i];\n  return max;\n}\nlis([10,9,2,5,3,7,101,18]);`,
      },
      {
        id: "house-robber-ii",
        name: "House Robber II",
        difficulty: "M",
        code: `function houseRobberII(arr) {\n  let n = arr.length;\n  if (n === 1) return arr[0];\n  let max1 = 0; let max2 = 0;\n  let p2 = 0; let p1 = 0;\n  for (let i = 0; i < n - 1; i++) {\n    let c = p2 + arr[i]; if (p1 > c) c = p1;\n    p2 = p1; p1 = c;\n  }\n  max1 = p1;\n  p2 = 0; p1 = 0;\n  for (let i = 1; i < n; i++) {\n    let c = p2 + arr[i]; if (p1 > c) c = p1;\n    p2 = p1; p1 = c;\n  }\n  max2 = p1;\n  if (max1 > max2) return max1;\n  return max2;\n}\nhouseRobberII([2,3,2,4,5]);`,
      },
      {
        id: "min-path-sum",
        name: "Minimum Path Sum",
        difficulty: "M",
        code: `function minPathSum(arr) {\n  let n = arr.length;\n  for (let i = 1; i < n; i++) arr[i] = arr[i] + arr[i-1];\n  return arr[n-1];\n}\nminPathSum([1,3,1,2,5,1]);`,
      },
      {
        id: "word-break",
        name: "Word Break",
        difficulty: "M",
        code: `function wordBreak(arr, target) {\n  let dp = [];\n  for (let i = 0; i <= arr.length; i++) dp.push(0);\n  dp[0] = 1;\n  for (let i = 1; i <= arr.length; i++) {\n    if (arr[i-1] === target) dp[i] = 1;\n    else if (dp[i-1]) dp[i] = 1;\n  }\n  return dp[arr.length];\n}\nwordBreak([1,2,3,2,1], 2);`,
      },
      {
        id: "unique-paths-ii",
        name: "Unique Paths II",
        difficulty: "M",
        code: `function uniquePathsII(arr) {\n  let n = arr.length;\n  let dp = [];\n  for (let i = 0; i < n; i++) {\n    if (arr[i] === 1) dp.push(0);\n    else if (i === 0) dp.push(1);\n    else dp.push(dp[i-1]);\n  }\n  return dp[n-1];\n}\nuniquePathsII([0,0,0,1,0,0,0]);`,
      },
    ],
  },
  {
    name: "Greedy Algorithms",
    questions: [
      {
        id: "activity-selection",
        name: "Activity Selection",
        difficulty: "M",
        code: `function activitySelection(arr) {\n  // sort by end time\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  let count = 1;\n  let last = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] >= last + 2) { count++; last = arr[i]; }\n  }\n  return count;\n}\nactivitySelection([1,3,0,5,8,5]);`,
      },
      {
        id: "jump-game",
        name: "Jump Game",
        difficulty: "M",
        code: `function canJump(arr) {\n  let maxReach = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (i > maxReach) return false;\n    if (i + arr[i] > maxReach) maxReach = i + arr[i];\n  }\n  return true;\n}\ncanJump([2,3,1,1,4]);`,
      },
      {
        id: "gas-station",
        name: "Gas Station",
        difficulty: "M",
        code: `function gasStation(arr) {\n  let total = 0;\n  let tank = 0;\n  let start = 0;\n  for (let i = 0; i < arr.length; i++) {\n    total = total + arr[i];\n    tank = tank + arr[i];\n    if (tank < 0) { start = i + 1; tank = 0; }\n  }\n  if (total < 0) return -1;\n  return start;\n}\ngasStation([1,2,3,4,5,-3,-4]);`,
      },
      {
        id: "best-buy-sell",
        name: "Best Time to Buy & Sell",
        difficulty: "E",
        code: `function bestBuySell(arr) {\n  let min = arr[0];\n  let profit = 0;\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] < min) min = arr[i];\n    if (arr[i] - min > profit) profit = arr[i] - min;\n  }\n  return profit;\n}\nbestBuySell([7,1,5,3,6,4]);`,
      },
      {
        id: "job-sequencing",
        name: "Job Sequencing",
        difficulty: "M",
        code: `function jobSequencing(arr) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] < arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  return arr;\n}\njobSequencing([20,15,10,5,1,25]);`,
      },
      {
        id: "fractional-knapsack",
        name: "Fractional Knapsack",
        difficulty: "M",
        code: `function fractionalKnapsack(arr, capacity) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] < arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  let total = 0;\n  for (let i = 0; i < arr.length && capacity > 0; i++) {\n    total = total + arr[i]; capacity--;\n  }\n  return total;\n}\nfractionalKnapsack([60,100,120,40,30], 3);`,
      },
      {
        id: "min-platforms",
        name: "Minimum Platforms",
        difficulty: "M",
        code: `function minPlatforms(arr) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  return arr;\n}\nminPlatforms([900,940,950,1100,1500,1800]);`,
      },
      {
        id: "jump-game-ii",
        name: "Jump Game II",
        difficulty: "H",
        code: `function jumpII(arr) {\n  let jumps = 0;\n  let curEnd = 0;\n  let farthest = 0;\n  for (let i = 0; i < arr.length - 1; i++) {\n    if (i + arr[i] > farthest) farthest = i + arr[i];\n    if (i === curEnd) { jumps++; curEnd = farthest; }\n  }\n  return jumps;\n}\njumpII([2,3,1,1,4]);`,
      },
      {
        id: "candy-distribution",
        name: "Candy Distribution",
        difficulty: "H",
        code: `function candy(arr) {\n  let n = arr.length;\n  let candies = [];\n  for (let i = 0; i < n; i++) candies.push(1);\n  for (let i = 1; i < n; i++) {\n    if (arr[i] > arr[i-1]) candies[i] = candies[i-1] + 1;\n  }\n  for (let i = n - 2; i >= 0; i--) {\n    if (arr[i] > arr[i+1] && candies[i] <= candies[i+1]) candies[i] = candies[i+1] + 1;\n  }\n  let total = 0;\n  for (let i = 0; i < n; i++) total = total + candies[i];\n  return total;\n}\ncandy([1,0,2,3,1,2]);`,
      },
    ],
  },
  {
    name: "String Algorithms",
    questions: [
      {
        id: "reverse-string",
        name: "Reverse String",
        difficulty: "E",
        code: `function reverseString(arr) {\n  let l = 0; let r = arr.length - 1;\n  while (l < r) { let t = arr[l]; arr[l] = arr[r]; arr[r] = t; l++; r--; }\n  return arr;\n}\nreverseString([72,101,108,108,111]);`,
      },
      {
        id: "max-consecutive-ones",
        name: "Max Consecutive Ones",
        difficulty: "E",
        code: `function maxConsecutiveOnes(arr) {\n  let max = 0; let cur = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === 1) { cur++; if (cur > max) max = cur; }\n    else cur = 0;\n  }\n  return max;\n}\nmaxConsecutiveOnes([1,1,0,1,1,1,0,1]);`,
      },
      {
        id: "longest-prefix",
        name: "Longest Common Prefix",
        difficulty: "E",
        code: `function longestPrefix(arr) {\n  let count = 0;\n  for (let i = 0; i < arr.length - 1; i++) {\n    if (arr[i] === arr[i+1]) count++;\n    else break;\n  }\n  return count;\n}\nlongestPrefix([1,1,1,2,3,4]);`,
      },
      {
        id: "check-anagram",
        name: "Check Anagram",
        difficulty: "E",
        code: `function isAnagram(arr) {\n  let sorted = [];\n  for (let i = 0; i < arr.length; i++) sorted.push(arr[i]);\n  for (let i = 0; i < sorted.length - 1; i++) {\n    for (let j = 0; j < sorted.length - i - 1; j++) {\n      if (sorted[j] > sorted[j+1]) { let t = sorted[j]; sorted[j] = sorted[j+1]; sorted[j+1] = t; }\n    }\n  }\n  return sorted;\n}\nisAnagram([108,105,115,116,101,110]);`,
      },
      {
        id: "three-sum",
        name: "3 Sum",
        difficulty: "M",
        code: `function threeSum(arr) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  return arr;\n}\nthreeSum([-1,0,1,2,-1,-4]);`,
      },
      {
        id: "trapping-rain",
        name: "Trapping Rainwater",
        difficulty: "H",
        code: `function trapWater(arr) {\n  let water = 0;\n  for (let i = 1; i < arr.length - 1; i++) {\n    let leftMax = 0; let rightMax = 0;\n    for (let j = 0; j <= i; j++) if (arr[j] > leftMax) leftMax = arr[j];\n    for (let j = i; j < arr.length; j++) if (arr[j] > rightMax) rightMax = arr[j];\n    let minH = leftMax; if (rightMax < minH) minH = rightMax;\n    water = water + minH - arr[i];\n  }\n  return water;\n}\ntrapWater([0,1,0,2,1,0,1,3,2,1,2,1]);`,
      },
      {
        id: "longest-unique-sub",
        name: "Longest Substring (Unique)",
        difficulty: "M",
        code: `function longestUnique(arr) {\n  let max = 0;\n  for (let i = 0; i < arr.length; i++) {\n    let seen = {}; let len = 0;\n    for (let j = i; j < arr.length; j++) {\n      if (seen[arr[j]]) break;\n      seen[arr[j]] = true; len++;\n    }\n    if (len > max) max = len;\n  }\n  return max;\n}\nlongestUnique([1,2,3,1,2,4,5,3]);`,
      },
      {
        id: "longest-common-seq",
        name: "Longest Common Sequence",
        difficulty: "M",
        code: `function lcs(arr) {\n  let n = arr.length;\n  let mid = Math.floor(n / 2);\n  let count = 0;\n  let j = mid;\n  for (let i = 0; i < mid; i++) {\n    while (j < n) {\n      if (arr[i] === arr[j]) { count++; j++; break; }\n      j++;\n    }\n  }\n  return count;\n}\nlcs([1,3,4,5,2,3,5,6]);`,
      },
      {
        id: "longest-palindrome-sub",
        name: "Longest Palindromic Substring",
        difficulty: "M",
        code: `function longestPalindrome(arr) {\n  let maxLen = 1;\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      let isPalin = true; let l = i; let r = j;\n      while (l < r) { if (arr[l] !== arr[r]) { isPalin = false; break; } l++; r--; }\n      if (isPalin && j - i + 1 > maxLen) maxLen = j - i + 1;\n    }\n  }\n  return maxLen;\n}\nlongestPalindrome([1,2,3,2,1,4]);`,
      },
      {
        id: "edit-distance",
        name: "Edit Distance",
        difficulty: "H",
        code: `function editDistance(arr) {\n  let n = arr.length;\n  let changes = 0;\n  for (let i = 0; i < n - 1; i++) {\n    if (arr[i] !== arr[i+1]) changes++;\n  }\n  return changes;\n}\neditDistance([1,2,2,3,3,3,4]);`,
      },
      {
        id: "reverse-words",
        name: "Reverse Words in String",
        difficulty: "M",
        code: `function reverseWords(arr) {\n  let l = 0; let r = arr.length - 1;\n  while (l < r) { let t = arr[l]; arr[l] = arr[r]; arr[r] = t; l++; r--; }\n  return arr;\n}\nreverseWords([104,101,108,108,111,32,119]);`,
      },
      {
        id: "atoi",
        name: "ATOI Implementation",
        difficulty: "M",
        code: `function atoi(arr) {\n  let result = 0;\n  for (let i = 0; i < arr.length; i++) {\n    result = result * 10 + arr[i];\n  }\n  return result;\n}\natoi([1,2,3,4,5]);`,
      },
      {
        id: "kmp",
        name: "KMP Algorithm",
        difficulty: "H",
        code: `function kmpSearch(text, pat) {\n  let m = pat.length;\n  let lps = [];\n  for (let i = 0; i < m; i++) lps.push(0);\n  let len = 0; let i = 1;\n  while (i < m) {\n    if (pat[i] === pat[len]) { len++; lps[i] = len; i++; }\n    else if (len !== 0) len = lps[len - 1];\n    else { lps[i] = 0; i++; }\n  }\n  let count = 0;\n  let ti = 0; let pi = 0;\n  while (ti < text.length) {\n    if (text[ti] === pat[pi]) { ti++; pi++; }\n    if (pi === m) { count++; pi = lps[pi-1]; }\n    else if (ti < text.length && text[ti] !== pat[pi]) {\n      if (pi !== 0) pi = lps[pi-1]; else ti++;\n    }\n  }\n  return count;\n}\nkmpSearch([1,2,1,2,1,3,1,2,1], [1,2,1]);`,
      },
      {
        id: "roman-to-int",
        name: "Roman to Integer",
        difficulty: "E",
        code: `function romanToInt(arr) {\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (i + 1 < arr.length && arr[i] < arr[i+1]) sum = sum - arr[i];\n    else sum = sum + arr[i];\n  }\n  return sum;\n}\nromanToInt([1,5,10,50,100]);`,
      },
      {
        id: "str-str",
        name: "Implement strStr()",
        difficulty: "E",
        code: `function strStr(arr, target) {\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === target) return i;\n  }\n  return -1;\n}\nstrStr([10,20,30,40,50], 30);`,
      },
      {
        id: "compare-versions",
        name: "Compare Version Numbers",
        difficulty: "M",
        code: `function compareVersions(arr) {\n  let mid = Math.floor(arr.length / 2);\n  for (let i = 0; i < mid; i++) {\n    if (arr[i] > arr[mid + i]) return 1;\n    if (arr[i] < arr[mid + i]) return -1;\n  }\n  return 0;\n}\ncompareVersions([1,2,3,1,2,4]);`,
      },
      {
        id: "count-and-say",
        name: "Count and Say",
        difficulty: "M",
        code: `function countAndSay(arr) {\n  let result = [];\n  let i = 0;\n  while (i < arr.length) {\n    let count = 1;\n    while (i + count < arr.length && arr[i] === arr[i + count]) count++;\n    result.push(count);\n    result.push(arr[i]);\n    i = i + count;\n  }\n  return result;\n}\ncountAndSay([1,1,2,3,3,3]);`,
      },
      {
        id: "longest-k-distinct",
        name: "Longest Substring K Distinct",
        difficulty: "M",
        code: `function longestKDistinct(arr, k) {\n  let max = 0;\n  for (let i = 0; i < arr.length; i++) {\n    let distinct = {}; let count = 0; let len = 0;\n    for (let j = i; j < arr.length; j++) {\n      if (!distinct[arr[j]]) { distinct[arr[j]] = true; count++; }\n      if (count > k) break;\n      len++;\n    }\n    if (len > max) max = len;\n  }\n  return max;\n}\nlongestKDistinct([1,2,1,2,3,4,5], 2);`,
      },
      {
        id: "check-rotation",
        name: "Check String Rotation",
        difficulty: "E",
        code: `function isRotation(arr) {\n  let n = arr.length;\n  let mid = Math.floor(n / 2);\n  for (let k = 0; k < n; k++) {\n    let match = true;\n    for (let i = 0; i < mid; i++) {\n      if (arr[(i + k) % n] !== arr[mid + i]) { match = false; break; }\n    }\n    if (match) return true;\n  }\n  return false;\n}\nisRotation([3,4,5,1,2,1,2,3,4,5]);`,
      },
      {
        id: "min-chars-palindrome",
        name: "Min Chars for Palindrome",
        difficulty: "H",
        code: `function minCharsPalindrome(arr) {\n  let n = arr.length;\n  let count = 0;\n  let l = 0; let r = n - 1;\n  while (l < r) {\n    if (arr[l] === arr[r]) { l++; r--; }\n    else { count++; r--; }\n  }\n  return count;\n}\nminCharsPalindrome([1,2,3,4,5]);`,
      },
    ],
  },
  {
    name: "Heap Algorithms",
    questions: [
      {
        id: "heap-sort",
        name: "Heap Sort",
        difficulty: "M",
        code: `function heapSort(arr) {\n  let n = arr.length;\n  for (let i = Math.floor(n/2) - 1; i >= 0; i--) heapify(arr, n, i);\n  for (let i = n - 1; i > 0; i--) {\n    let t = arr[0]; arr[0] = arr[i]; arr[i] = t;\n    heapify(arr, i, 0);\n  }\n  return arr;\n}\nfunction heapify(arr, n, i) {\n  let largest = i;\n  let l = 2 * i + 1; let r = 2 * i + 2;\n  if (l < n && arr[l] > arr[largest]) largest = l;\n  if (r < n && arr[r] > arr[largest]) largest = r;\n  if (largest !== i) {\n    let t = arr[i]; arr[i] = arr[largest]; arr[largest] = t;\n    heapify(arr, n, largest);\n  }\n}\nheapSort([12,11,13,5,6,7]);`,
      },
      {
        id: "k-largest",
        name: "K Largest Elements",
        difficulty: "M",
        code: `function kLargest(arr, k) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] < arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  return arr;\n}\nkLargest([3,2,1,5,6,4], 2);`,
      },
      {
        id: "kth-smallest-elem",
        name: "Kth Smallest Element",
        difficulty: "M",
        code: `function kthSmallestElem(arr, k) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  return arr[k - 1];\n}\nkthSmallestElem([7,10,4,3,20,15], 3);`,
      },
      {
        id: "k-frequent",
        name: "K Most Frequent Elements",
        difficulty: "M",
        code: `function kFrequent(arr) {\n  let freq = {};\n  for (let i = 0; i < arr.length; i++) {\n    if (freq[arr[i]]) freq[arr[i]]++;\n    else freq[arr[i]] = 1;\n  }\n  return arr;\n}\nkFrequent([1,1,1,2,2,3,4,4,4,4]);`,
      },
      {
        id: "min-heap",
        name: "Min Heap Construction",
        difficulty: "M",
        code: `function buildMinHeap(arr) {\n  let n = arr.length;\n  for (let i = Math.floor(n/2) - 1; i >= 0; i--) {\n    let smallest = i;\n    let l = 2*i+1; let r = 2*i+2;\n    if (l < n && arr[l] < arr[smallest]) smallest = l;\n    if (r < n && arr[r] < arr[smallest]) smallest = r;\n    if (smallest !== i) { let t = arr[i]; arr[i] = arr[smallest]; arr[smallest] = t; }\n  }\n  return arr;\n}\nbuildMinHeap([5,3,8,1,2,7]);`,
      },
      {
        id: "max-heap",
        name: "Max Heap Construction",
        difficulty: "M",
        code: `function buildMaxHeap(arr) {\n  let n = arr.length;\n  for (let i = Math.floor(n/2) - 1; i >= 0; i--) {\n    let largest = i;\n    let l = 2*i+1; let r = 2*i+2;\n    if (l < n && arr[l] > arr[largest]) largest = l;\n    if (r < n && arr[r] > arr[largest]) largest = r;\n    if (largest !== i) { let t = arr[i]; arr[i] = arr[largest]; arr[largest] = t; }\n  }\n  return arr;\n}\nbuildMaxHeap([3,5,1,8,2,7]);`,
      },
      {
        id: "connect-ropes",
        name: "Connect Ropes Cost",
        difficulty: "M",
        code: `function connectRopes(arr) {\n  for (let i = 0; i < arr.length - 1; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n    }\n  }\n  let cost = 0;\n  while (arr.length > 1) {\n    let sum = arr[0] + arr[1];\n    cost = cost + sum;\n    arr[1] = sum;\n    for (let i = 0; i < arr.length - 1; i++) arr[i] = arr[i+1];\n    arr.pop();\n  }\n  return cost;\n}\nconnectRopes([4,3,2,6]);`,
      },
      {
        id: "last-stone",
        name: "Last Stone Weight",
        difficulty: "E",
        code: `function lastStone(arr) {\n  while (arr.length > 1) {\n    for (let i = 0; i < arr.length - 1; i++) {\n      for (let j = 0; j < arr.length - i - 1; j++) {\n        if (arr[j] < arr[j+1]) { let t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }\n      }\n    }\n    let diff = arr[0] - arr[1];\n    arr[1] = diff;\n    for (let i = 0; i < arr.length - 1; i++) arr[i] = arr[i+1];\n    arr.pop();\n  }\n  return arr[0];\n}\nlastStone([2,7,4,1,8,1]);`,
      },
      {
        id: "median-stream",
        name: "Median of Data Stream",
        difficulty: "H",
        code: `function medianStream(arr) {\n  let sorted = [];\n  let medians = [];\n  for (let i = 0; i < arr.length; i++) {\n    sorted.push(arr[i]);\n    for (let j = sorted.length - 1; j > 0; j--) {\n      if (sorted[j] < sorted[j-1]) { let t = sorted[j]; sorted[j] = sorted[j-1]; sorted[j-1] = t; }\n    }\n    let mid = Math.floor(sorted.length / 2);\n    medians.push(sorted[mid]);\n  }\n  return medians;\n}\nmedianStream([5,2,8,1,9,3,7]);`,
      },
    ],
  },
  {
    name: "Graph Traversals",
    questions: [
      {
        id: "bfs-traversal",
        name: "BFS Graph Traversal",
        difficulty: "M",
        code: `function bfs(arr) {\n  let visited = [];\n  for (let i = 0; i < arr.length; i++) visited.push(0);\n  let queue = [0]; visited[0] = 1;\n  let result = [];\n  while (queue.length > 0) {\n    let node = queue[0];\n    for (let i = 0; i < queue.length - 1; i++) queue[i] = queue[i+1];\n    queue.pop();\n    result.push(arr[node]);\n    let left = 2 * node + 1; let right = 2 * node + 2;\n    if (left < arr.length && !visited[left]) { visited[left] = 1; queue.push(left); }\n    if (right < arr.length && !visited[right]) { visited[right] = 1; queue.push(right); }\n  }\n  return result;\n}\nbfs([1,2,3,4,5,6,7]);`,
      },
      {
        id: "dfs-traversal",
        name: "DFS Graph Traversal",
        difficulty: "M",
        code: `function dfsTraversal(arr) {\n  let visited = [];\n  for (let i = 0; i < arr.length; i++) visited.push(0);\n  let result = [];\n  for (let i = 0; i < arr.length; i++) {\n    if (!visited[i]) { visited[i] = 1; result.push(arr[i]); }\n  }\n  return result;\n}\ndfsTraversal([1,2,3,4,5,6,7]);`,
      },
      {
        id: "connected-components",
        name: "Connected Components",
        difficulty: "M",
        code: `function connectedComponents(arr) {\n  let count = 0;\n  let visited = [];\n  for (let i = 0; i < arr.length; i++) visited.push(0);\n  for (let i = 0; i < arr.length; i++) {\n    if (!visited[i]) {\n      count++;\n      visited[i] = 1;\n      let j = i + 1;\n      while (j < arr.length && arr[j] === arr[i]) { visited[j] = 1; j++; }\n    }\n  }\n  return count;\n}\nconnectedComponents([1,1,0,2,2,0,3]);`,
      },
    ],
  },
  {
    name: "Advanced Cache",
    questions: [
      {
        id: "lru-cache",
        name: "LRU Cache",
        difficulty: "H",
        code: `function lruCache(arr) {\n  let cache = [];\n  let capacity = 3;\n  for (let i = 0; i < arr.length; i++) {\n    let found = -1;\n    for (let j = 0; j < cache.length; j++) {\n      if (cache[j] === arr[i]) { found = j; break; }\n    }\n    if (found >= 0) {\n      for (let j = found; j < cache.length - 1; j++) cache[j] = cache[j+1];\n      cache[cache.length - 1] = arr[i];\n    } else {\n      if (cache.length >= capacity) {\n        for (let j = 0; j < cache.length - 1; j++) cache[j] = cache[j+1];\n        cache[cache.length - 1] = arr[i];\n      } else cache.push(arr[i]);\n    }\n  }\n  return cache;\n}\nlruCache([1,2,3,4,1,2,5,1,2,3]);`,
      },
      {
        id: "two-sum-hashmap",
        name: "Two Sum with HashMap",
        difficulty: "E",
        code: `function twoSumHash(arr, target) {\n  let map = {};\n  for (let i = 0; i < arr.length; i++) {\n    let complement = target - arr[i];\n    if (map[complement] !== undefined) return [map[complement], i];\n    map[arr[i]] = i;\n  }\n  return [-1, -1];\n}\ntwoSumHash([2,7,11,15], 9);`,
      },
      {
        id: "lfu-cache",
        name: "LFU Cache",
        difficulty: "H",
        code: `function lfuCache(arr) {\n  let cache = [];\n  let freq = [];\n  let capacity = 3;\n  for (let i = 0; i < arr.length; i++) {\n    let found = -1;\n    for (let j = 0; j < cache.length; j++) {\n      if (cache[j] === arr[i]) { found = j; freq[j]++; break; }\n    }\n    if (found < 0) {\n      if (cache.length >= capacity) {\n        let minF = freq[0]; let minI = 0;\n        for (let j = 1; j < freq.length; j++) if (freq[j] < minF) { minF = freq[j]; minI = j; }\n        cache[minI] = arr[i]; freq[minI] = 1;\n      } else { cache.push(arr[i]); freq.push(1); }\n    }\n  }\n  return cache;\n}\nlfuCache([1,2,3,4,1,2,5,1,2,3]);`,
      },
    ],
  },
];
