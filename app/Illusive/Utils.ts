export function swapItems(arr: any[], i: number, j: number): any[]{
    arr[i] = arr.splice(j, 1, arr[i])[0];
    return arr;
}