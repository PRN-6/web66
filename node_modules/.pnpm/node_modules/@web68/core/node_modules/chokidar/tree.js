import * as sp from 'node:path';
import { EVENTS, isSameOrInside, logicalPathKey, statIdentity, } from './runtime.js';
/**
 * Owns every asynchronous task and backend subscription created by one public
 * watcher. It deliberately knows nothing about paths, events, or backends.
 */
export class LifecycleScope {
    state = 'OPEN';
    generation = 0;
    abortController = new AbortController();
    tasks = new Set();
    closers = new Map();
    onTaskSettled;
    onTaskError;
    constructor(onTaskSettled, onTaskError) {
        this.onTaskSettled = onTaskSettled;
        this.onTaskError = onTaskError;
    }
    isActive(generation) {
        return this.state === 'OPEN' && this.generation === generation;
    }
    track(task) {
        const tracked = Promise.resolve(task).finally(() => {
            this.tasks.delete(tracked);
            this.onTaskSettled();
        });
        this.tasks.add(tracked);
        void tracked.catch(this.onTaskError);
        return tracked;
    }
    addCloser(key, closer) {
        const existing = this.closers.get(key);
        if (existing)
            existing.push(closer);
        else
            this.closers.set(key, [closer]);
    }
    takeClosers(key) {
        const closers = this.closers.get(key) ?? [];
        this.closers.delete(key);
        return closers;
    }
    beginClose() {
        if (this.state !== 'OPEN')
            return [];
        this.state = 'CLOSING';
        this.generation += 1;
        this.abortController.abort();
        const closing = [];
        this.closers.forEach((closers) => {
            closers.forEach((closer) => {
                try {
                    closing.push(Promise.resolve(closer()));
                }
                catch (error) {
                    closing.push(Promise.reject(error));
                }
            });
        });
        this.closers.clear();
        return closing;
    }
    async drain() {
        while (this.tasks.size > 0) {
            await Promise.allSettled([...this.tasks]);
        }
    }
    finishClose() {
        this.state = 'CLOSED';
    }
}
function IGNORE_RECONCILIATION_ERROR() { }
export function resolveRecursiveCandidate(root, relativePath) {
    if (sp.isAbsolute(relativePath))
        return;
    const absoluteRoot = sp.resolve(root);
    const absoluteCandidate = sp.resolve(absoluteRoot, relativePath);
    if (!isSameOrInside(absoluteRoot, absoluteCandidate))
        return;
    return sp.join(root, relativePath);
}
/** Serializes commits per root and coalesces redundant candidate invalidations. */
export class ReconciliationQueue {
    queues = new Map();
    pending = new Map();
    lifecycle;
    constructor(lifecycle) {
        this.lifecycle = lifecycle;
    }
    enqueue(scope, work, coalescePath = scope) {
        const key = logicalPathKey(scope);
        const pendingKey = coalescePath === false ? undefined : `${key}\0${logicalPathKey(coalescePath)}`;
        const existing = pendingKey ? this.pending.get(pendingKey) : undefined;
        if (existing) {
            existing.work = work;
            existing.replay = true;
            return existing.promise;
        }
        const generation = this.lifecycle.generation;
        const reconciliation = {
            promise: Promise.resolve(),
            work,
            replay: false,
        };
        const previous = this.queues.get(key) ?? Promise.resolve();
        const task = previous
            .catch(IGNORE_RECONCILIATION_ERROR)
            .then(async () => {
            do {
                const currentWork = reconciliation.work;
                reconciliation.replay = false;
                if (!this.lifecycle.isActive(generation))
                    return;
                await currentWork();
            } while (reconciliation.replay);
        })
            .finally(() => {
            if (this.queues.get(key) === task)
                this.queues.delete(key);
            if (pendingKey && this.pending.get(pendingKey) === reconciliation) {
                this.pending.delete(pendingKey);
            }
        });
        this.queues.set(key, task);
        const tracked = this.lifecycle.track(task);
        reconciliation.promise = tracked;
        if (pendingKey)
            this.pending.set(pendingKey, reconciliation);
        return tracked;
    }
    forgetPending(predicate) {
        for (const key of this.pending.keys()) {
            const [scope, candidate] = key.split('\0', 2);
            if (predicate(scope, candidate))
                this.pending.delete(key);
        }
    }
    clear() {
        this.queues.clear();
        this.pending.clear();
    }
}
const CURRENT = '.';
const PARENT = '..';
const RECURSIVE_CREATE_BURST_WINDOW = 25;
const RECURSIVE_WRITE_BURST_WINDOW = 10;
const INITIAL_OBSERVATION_FACT = Object.freeze({
    size: 0,
    mtimeMs: 0,
    ino: 0,
    kind: 'other',
    initialRecursive: true,
});
function statKind(stats) {
    return stats.isSymbolicLink()
        ? 'symlink'
        : stats.isDirectory()
            ? 'directory'
            : stats.isFile()
                ? 'file'
                : 'other';
}
function sameStatFact(fact, stats) {
    const current = statIdentity(stats);
    return (fact?.size === current.size &&
        fact.mtimeMs === current.mtimeMs &&
        fact.ino === current.ino &&
        fact.kind === statKind(stats));
}
function withinWindow(fact, trigger, window) {
    return (fact?.observedAt !== undefined &&
        trigger.observedAt >= fact.observedAt &&
        trigger.observedAt - fact.observedAt <= window);
}
/** A directory membership snapshot owned by one public watcher. */
export class DirEntry {
    path;
    items = new Set();
    constructor(dir) {
        this.path = dir;
    }
    add(item) {
        // A filesystem root's basename is '' and its dirname is itself; listing ''
        // would make the root its own child and unlink everything after a scan.
        if (item !== CURRENT && item !== PARENT && item !== '')
            this.items.add(item);
    }
    /** Returns true when removing `item` left the directory empty. */
    remove(item) {
        return this.items.delete(item) && this.items.size === 0;
    }
    has(item) {
        return this.items.has(item);
    }
    getChildren() {
        return [...this.items];
    }
    dispose() {
        this.items.clear();
        this.path = '';
    }
}
/**
 * Per-watcher filesystem truth. Backends never mutate this object directly;
 * scanner and reconciliation stages commit observations through it.
 */
export class TreeState {
    watched = new Map();
    observed = new Map();
    symlinkPaths = new Map();
    recursiveRoots = new Set();
    observesNative;
    constructor(observesNative) {
        this.observesNative = observesNative;
    }
    getDirectory(directory) {
        const dir = sp.resolve(directory);
        const key = logicalPathKey(dir);
        let entry = this.watched.get(key);
        if (!entry) {
            entry = new DirEntry(dir);
            this.watched.set(key, entry);
        }
        return entry;
    }
    /** Looks up a directory entry without creating one. */
    peekDirectory(directory) {
        return this.watched.get(logicalPathKey(sp.resolve(directory)));
    }
    recordObserved(path, stats, transition, trigger, initialRecursive = false, retainWithoutTrigger = false) {
        if (!this.observesNative())
            return;
        if (!trigger && !initialRecursive && !retainWithoutTrigger)
            return;
        const { size, mtimeMs, ino } = statIdentity(stats);
        this.observed.set(logicalPathKey(path), {
            size,
            mtimeMs,
            ino,
            kind: statKind(stats),
            transition,
            rawEvent: trigger?.rawEvent,
            relativePath: trigger?.relativePath,
            observedAt: trigger?.observedAt,
            initialRecursive,
        });
    }
    consumeInitialCreate(path, stats, trigger, ignoreInitial) {
        const previous = this.observed.get(logicalPathKey(path));
        if (!previous?.initialRecursive || trigger.rawEvent !== 'rename')
            return;
        this.recordObserved(path, stats, 'add', trigger);
        if (!ignoreInitial)
            return false;
        return stats.isDirectory() ? EVENTS.ADD_DIR : EVENTS.ADD;
    }
    markInitialCreate(path) {
        const key = logicalPathKey(path);
        const fact = this.observed.get(key);
        if (fact)
            fact.initialRecursive = true;
        else
            this.observed.set(key, { ...INITIAL_OBSERVATION_FACT });
    }
    clearInitialCreate(path) {
        const fact = this.observed.get(logicalPathKey(path));
        if (fact)
            fact.initialRecursive = false;
    }
    clearInitialCreates(root) {
        const rootKey = logicalPathKey(root);
        for (const [path, fact] of this.observed) {
            if (isSameOrInside(rootKey, path) && fact.initialRecursive)
                fact.initialRecursive = false;
        }
    }
    /** True when a tracked directory path now names a different directory inode. */
    replacedSinceObserved(path, stats) {
        const previous = this.observed.get(logicalPathKey(path));
        const { ino } = statIdentity(stats);
        return (previous?.kind === 'directory' &&
            stats.isDirectory() &&
            previous.ino !== 0 &&
            ino !== 0 &&
            previous.ino !== ino);
    }
    /** True when `stats` no longer matches a recorded fact of the same kind. */
    changedSinceObserved(path, stats) {
        const previous = this.observed.get(logicalPathKey(path));
        return (previous !== undefined && previous.kind === statKind(stats) && !sameStatFact(previous, stats));
    }
    isDuplicateObservation(path, stats, trigger) {
        const previous = this.observed.get(logicalPathKey(path));
        const sameFact = sameStatFact(previous, stats);
        // Burst windows only collapse callbacks that confirm the fact already
        // published. A different fact is a write that landed after that stat.
        const duplicateCreate = sameFact &&
            previous?.transition === 'add' &&
            previous?.relativePath === trigger.relativePath &&
            previous.rawEvent === 'rename' &&
            trigger.rawEvent === 'change' &&
            withinWindow(previous, trigger, RECURSIVE_CREATE_BURST_WINDOW);
        const duplicateUnchanged = sameFact &&
            stats.isFile() &&
            !previous?.initialRecursive &&
            (previous?.transition === 'add' || trigger.relativePath === null);
        const duplicateWrite = sameFact &&
            previous?.transition === 'change' &&
            previous.relativePath === trigger.relativePath &&
            withinWindow(previous, trigger, RECURSIVE_WRITE_BURST_WINDOW) &&
            previous.rawEvent === trigger.rawEvent;
        const duplicate = duplicateUnchanged || duplicateCreate || duplicateWrite;
        const transition = duplicateWrite
            ? undefined
            : duplicateUnchanged
                ? previous?.transition
                : 'change';
        this.recordObserved(path, stats, transition, trigger);
        return duplicate;
    }
    dispose() {
        this.watched.forEach((entry) => entry.dispose());
        this.watched.clear();
        this.observed.clear();
        this.symlinkPaths.clear();
        this.recursiveRoots.clear();
    }
}
