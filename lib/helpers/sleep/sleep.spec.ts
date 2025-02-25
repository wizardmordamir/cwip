import { sleep } from '.';

describe('sleep', () => {
  it('should sleep to finish between setTimeouts', async () => {
    const waitTimes: number[] = [5, 20, 45];
    const completedTimes: number[] = [];

    setTimeout(() => completedTimes.push(waitTimes[0]), waitTimes[0]);
    setTimeout(() => completedTimes.push(waitTimes[2]), waitTimes[2]);

    await sleep(waitTimes[1]);

    completedTimes.push(waitTimes[1]);

    await sleep(waitTimes[waitTimes.length - 1]); // wait for final timer

    expect(completedTimes).toEqual(waitTimes);
  });
});
