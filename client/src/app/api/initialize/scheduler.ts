class Scheduler {
  private idMap: Record<
    string,
    { timerId: NodeJS.Timer; id: string; count: number }
  > = {};
  constructor() {
    this.idMap = {};
    console.log("Scheduler initialized");
  }
  start(id: string) {
    const timerId = setInterval(() => {
      this.idMap[id].count++;
      console.log("execute", JSON.stringify(this.idMap[id]));
    }, 1000);

    this.idMap[id] = {
      timerId,
      id,
      count: 0,
    };
  }

  stop(id: string) {
    clearInterval(this.idMap[id].timerId);
    delete this.idMap[id];
  }
}

const scheduler = new Scheduler();
export default scheduler;
