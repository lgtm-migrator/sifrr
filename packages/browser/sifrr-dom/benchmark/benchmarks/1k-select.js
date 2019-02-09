const Benchmark = require('./benchmark');

class OnekRun extends Benchmark {
  static beforeAll() {
    return this.prototype.mainClick('#run');
  }

  static beforeAllWait() {
    return `${this.prototype.main} && ${this.prototype.main}.$$('tr').length === 1000`;
  }

  run() {
    return page.evaluate(`${this.main}.$$('tr .lbl')[${this.i + 5}].click()`);
  }

  runWait() {
    return `${this.main}.$$('tr')[${this.i + 5}].classList.contains('danger')`;
  }
}

module.exports = OnekRun;