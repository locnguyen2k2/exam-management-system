// Fisher–Yate shuffle
export function shuffle(arr: any[]): any[] {
  let i = arr.length;
  let j: any;
  let temp: any;

  while (--i > 0) {
    j = Math.floor(Math.random() * (i + 1));
    temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }

  return arr;
}
