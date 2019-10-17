"use strict";

class WorkerPool
{
  constructor(size, cb)
  {
    this.size = size;
    this.workers = [];
    this.progress = new Array(size).fill(0);

    for (let i = 0; i < size; ++i)
    {
      let worker = new Worker('/static/js/thread.js');
      worker.onmessage = cb;
      worker.postMessage({"cmd": "id", "id": i});
      this.workers.push(worker);
    }
  }

  get count() { return this.size; }

  postAll(msg)
  {
    for (let i = 0; i < this.size; ++i)
      this.workers[i].postMessage(msg);
  }

  post(index, msg)
  {
    this.workers[index].postMessage(msg);
  }

  reset()
  {
    this.progress.fill(0);
  }
}
