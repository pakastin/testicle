import deepEqual from './deepequal.mjs';
import indent from './indentation.mjs';

import { green, red } from './colors.mjs';

let id = 0;

const nextTick = (cb) => {
  if (process && process.nextTick) {
    process.nextTick(cb);
  } else {
    setTimeout(cb, 0);
  }
};

export const factory = (parent, depth = -1) => {
  let timeout;

  const t = (description, test) => {
    const child = factory(t, depth + 1);
    child.description = description;
    child.test = test;

    t.queue || (t.queue = []);
    t.queue.push(child);

    nextTick(child.serve);
  };

  t.id = id++;
  t.parent = parent;

  t.depth = depth;
  t.introduced = false;
  t.timeout = 5000;

  t.plannedCount = 0;
  t.passedCount = 0;
  t.doneCount = 0;

  t.plannedDescendantCount = 0;
  t.passedDescendantCount = 0;

  t.serve = () => {
    const waitingChildren = t.plannedDescendantCount !== t.passedDescendantCount;
    const queueing = t.queue && t.queue.length;

    if (!waitingChildren) {
      if (queueing) {
        const child = t.queue.shift();

        child.test(child);
      } else if (t.plannedCount === t.passedCount) {
        parent.serve && parent.serve();
      }
    }
  };

  t.plan = (count) => {
    t.plannedCount += count;
    parent.planned && parent.planned(t, count);

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (t.doneCount !== t.plannedCount) {
        t.fail('Timeout');
      }
    }, t.timeout);
  };

  t.planned = (t, count) => {
    t.plannedDescendantCount += count;
    parent.planned && parent.planned(t, count);
  };

  t.pass = (message) => {
    t.passedCount++;
    t.doneCount++;
    parent.passed && parent.passed(t, message || 'passed');

    if (t.plannedCount === 0) {
      t.fail('Always plan');
    } else if (t.doneCount > t.plannedCount) {
      t.fail('Passed/failed too many times');
    }

    if (t.doneCount === t.plannedCount) {
      clearTimeout(timeout);
    }

    t.serve();
  };

  t.passed = (t, message) => {
    t.passedDescendantCount++;
    parent.passed && parent.passed(t, message);
    t.serve();
  };

  t.fail = (message) => {
    t.doneCount++;
    parent.failed && parent.failed(t, message || 'failed');

    if (t.doneCount === t.plannedCount) {
      clearTimeout(timeout);
    }
  };

  t.failed = (t, message) => {
    parent.failed && parent.failed(t, message);
  };

  t.ok = (value, message) => {
    if (value) {
      t.pass(message || 'ok');
    } else {
      t.fail(message || 'ok');
    }
  };

  t.notOk = (value, message) => {
    t.ok(!value, message || 'not ok');
  };

  t.equal = t.equals = (a, b, message) => {
    t.ok(a === b, message || 'equals');
  };

  t.deepEqual = (a, b, message) => {
    if (deepEqual(a, b)) {
      t.pass(message || 'deep equal');
    } else {
      t.fail(message || 'deep equal');
    }
  };

  return t;
};

const introduceParents = (t) => {
  const parents = [];
  let traverse = t;

  while (traverse) {
    if (traverse.introduced) {
      break;
    }
    parents.unshift(traverse);

    traverse = traverse.parent;
  }

  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];

    if (!parent.introduced) {
      parent.introduced = true;
      if (parent.description) {
        console.log('');
        console.log(indent(parent.depth), parent.description);
      }
    }
  }
};

let planned = 0;
let passed = 0;

export default factory({
  ready: false,
  planned (t, count) {
    planned += count;
  },
  passed (t, message) {
    passed++;
    introduceParents(t);
    console.log(indent(t.depth) + green(' ✔︎ ' + message));
  },
  failed (t, message) {
    console.log(t);
    console.error(indent(t.depth) + red('✗ ' + message));
    process.exit(1);
  },
  serve () {
    nextTick(() => {
      if (planned === passed) {
        if (this.ready) {
          return;
        }
        this.ready = true;
        console.log('');
        console.log(green('♥︎ All tests passed! ♥︎'));
      }
    });
  }
});
