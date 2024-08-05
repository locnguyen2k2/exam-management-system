import { alphabet, numbs } from '~/modules/system/exam/exam.constant';

function random(data: string, length: number) {
  return new Array(length)
    .fill('')
    .map(() =>
      data.charAt(Math.floor(Math.random() * data.length)).toUpperCase(),
    )
    .join('');
}

export function randomChars(length: number) {
  return random(alphabet, length);
}

export function randomNumbs(length: number) {
  return random(numbs, length);
}
