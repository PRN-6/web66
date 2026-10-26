import { watch as fsWatch, realpathSync } from 'node:fs';
import { lstat, open, stat } from 'node:fs/promises';
import * as sp from 'node:path';
import { EVENTS, isLinux, isMacos, isMissingError, isRecursiveWatchUnsupported, isSameOrInside, isWindows, } from './runtime.js';
let nextGeneration = 0;
export function allocateSharedResourceGeneration() {
    return ++nextGeneration;
}
/** Common ownership state for process-global backend handles. */
export function createSharedResourceState(resource, subscribers = []) {
    return {
        resource,
        generation: allocateSharedResourceGeneration(),
        subscribers: new Set(subscribers),
        closed: false,
    };
}
export function attachSharedSubscriber(resource, subscriber) {
    if (resource.closed)
        return false;
    resource.subscribers.add(subscriber);
    return true;
}
export function detachSharedSubscriber(resource, subscriber) {
    if (resource.closed || !resource.subscribers.delete(subscriber))
        return;
    return resource.subscribers.size > 0 ? 'remaining' : 'last';
}
/** Invalidates exactly this resource generation and returns its subscribers. */
export function invalidateSharedResource(resource) {
    if (resource.closed)
        return;
    resource.closed = true;
    const subscribers = [...resource.subscribers];
    resource.subscribers.clear();
    return subscribers;
}
function reconfigureWatcherPersistence(resource) {
    const persistent = [...resource.subscribers].some((subscriber) => subscriber.persistent);
    if (persistent)
        resource.watcher.ref();
    else
        resource.watcher.unref();
}
function invalidateWatcherResource(resource, registry) {
    const subscribers = invalidateSharedResource(resource);
    if (!subscribers)
        return;
    if (registry.get(resource.resource) === resource)
        registry.delete(resource.resource);
    resource.watcher.close();
    return subscribers;
}
function attachWatcherSubscriber(resource, subscriber) {
    attachSharedSubscriber(resource, subscriber);
    reconfigureWatcherPersistence(resource);
}
function createWatcherSubscription(resource, subscriber, registry) {
    let closed = false;
    return {
        resource: resource.resource,
        close: () => {
            if (closed)
                return;
            closed = true;
            const remaining = detachSharedSubscriber(resource, subscriber);
            if (remaining === 'remaining')
                reconfigureWatcherPersistence(resource);
            else if (remaining === 'last' && registry.get(resource.resource) === resource) {
                invalidateWatcherResource(resource, registry);
            }
        },
    };
}
export function selectBackend(options) {
    const preferRecursive = options.backend === 'native-recursive' ||
        (options.backend === 'auto' && (isMacos || isWindows));
    const kind = options.backend === 'polling'
        ? 'polling'
        : preferRecursive && options.depth === undefined
            ? 'native-recursive-preferred'
            : 'native-per-directory';
    return Object.freeze({
        kind,
        polling: kind === 'polling',
        recursive: kind === 'native-recursive-preferred',
        perDirectory: kind === 'native-per-directory',
    });
}
const EV = EVENTS;
const POLL_DIRECTORY_RECHECK_DELAY = 1000;
/** Native resources use one process-global monotonic time domain. */
export function backendNow() {
    return performance.now();
}
function toNativeWatchPath(path) {
    const nativePath = sp.normalize(path);
    if (!isWindows)
        return nativePath;
    try {
        // Node 24's Windows fs-event implementation compares long callback paths
        // with the spelling passed here. Logical/resource keys remain lexical.
        return realpathSync.native(nativePath);
    }
    catch {
        return nativePath;
    }
}
function projectNativeRelativePath(nativeRoot, relativePath) {
    if (!isWindows || relativePath === null || !sp.isAbsolute(relativePath))
        return relativePath;
    const root = sp.normalize(sp.toNamespacedPath(nativeRoot));
    const candidate = sp.normalize(sp.toNamespacedPath(relativePath));
    const projected = sp.relative(root, candidate);
    if (!isSameOrInside(root, candidate))
        return relativePath;
    return projected || null;
}
const FsWatchInstances = new Map();
function systemNativeWatchFactory(path, options, listener) {
    return fsWatch(path, options, listener);
}
let nativeWatchFactory = systemNativeWatchFactory;
const RecursiveWatchInstances = new Map();
let recursiveWatchUnsupported = false;
function systemRecursiveWatchFactory(path, options, listener) {
    return fsWatch(path, options, listener);
}
let recursiveWatchFactory = systemRecursiveWatchFactory;
function failRecursiveResource(resource, error) {
    const subscribers = invalidateWatcherResource(resource, RecursiveWatchInstances);
    if (!subscribers)
        return;
    subscribers.forEach((subscriber) => subscriber.failure(error));
}
export function subscribeRecursiveNative(path, persistent, handlers, signal) {
    if (recursiveWatchUnsupported)
        return { kind: 'unsupported' };
    const resourceKey = sp.resolve(path);
    const subscriber = {
        ...handlers,
        watchedPath: path,
        persistent,
    };
    let resource = RecursiveWatchInstances.get(resourceKey);
    if (!resource) {
        let watcher;
        let created;
        const nativePath = toNativeWatchPath(path);
        try {
            watcher = recursiveWatchFactory(nativePath, { persistent, recursive: true }, (rawEvent, relativePath) => {
                const active = created;
                if (!active || active.closed)
                    return;
                // A late callback from a retired handle must not reach a replacement generation.
                if (RecursiveWatchInstances.get(resourceKey) !== active)
                    return;
                const trigger = {
                    kind: 'native',
                    resource: resourceKey,
                    rawEvent,
                    relativePath: projectNativeRelativePath(nativePath, relativePath),
                    sequence: ++active.sequence,
                    observedAt: backendNow(),
                };
                active.subscribers.forEach((current) => {
                    current.rawEmitter(rawEvent, relativePath, { watchedPath: current.watchedPath });
                    current.publish(trigger);
                });
            });
        }
        catch (error) {
            if (isRecursiveWatchUnsupported(error)) {
                recursiveWatchUnsupported = true;
                return { kind: 'unsupported' };
            }
            return { kind: 'failed', error };
        }
        created = resource = {
            resource: resourceKey,
            generation: allocateSharedResourceGeneration(),
            subscribers: new Set(),
            closed: false,
            watcher,
            sequence: 0,
        };
        RecursiveWatchInstances.set(resourceKey, resource);
        watcher.on(EV.ERROR, (error) => failRecursiveResource(resource, error));
    }
    attachWatcherSubscriber(resource, subscriber);
    const subscription = createWatcherSubscription(resource, subscriber, RecursiveWatchInstances);
    if (signal.aborted)
        void subscription.close();
    return { kind: 'subscribed', subscription };
}
/**
 * Instantiates the fs_watch interface
 * @param path to be watched
 * @param options to be passed to fs_watch
 * @param listener main event handler
 * @param errHandler emits info about errors
 * @param emitRaw emits raw event data
 * @returns {NativeFsWatcher}
 */
function createFsWatchInstance(path, options, listener, errHandler) {
    try {
        return nativeWatchFactory(path, {
            persistent: options.persistent,
        }, listener);
    }
    catch (error) {
        errHandler(error);
        return undefined;
    }
}
/**
 * Publish one invalidation to subscribers of an exact native resource.
 */
function publishNativeTrigger(cont, rawEvent, relativePath, emitRaw, rawRelativePath = relativePath) {
    if (cont.closed || FsWatchInstances.get(cont.resource) !== cont)
        return;
    const trigger = {
        kind: 'native',
        resource: cont.resource,
        rawEvent,
        relativePath,
        sequence: ++cont.sequence,
        observedAt: backendNow(),
    };
    cont.subscribers.forEach((subscriber) => {
        if (emitRaw) {
            subscriber.rawEmitter(rawEvent, rawRelativePath, { watchedPath: subscriber.watchedPath });
        }
        subscriber.publish(trigger);
    });
}
function broadcastNativeError(cont, error) {
    if (cont.closed || FsWatchInstances.get(cont.resource) !== cont)
        return;
    cont.subscribers.forEach((subscriber) => subscriber.errHandler(error));
}
function closeFailedNativeResource(cont, error) {
    // Subscribers that attached while the error was being classified are retired
    // too, so every one of them learns that its subscription is gone.
    const subscribers = invalidateWatcherResource(cont, FsWatchInstances);
    subscribers?.forEach((subscriber) => subscriber.failure?.(error));
}
async function handleNativeError(path, cont, error) {
    // Workaround for https://github.com/joyent/node/issues/4337
    if (isWindows && error.code === 'EPERM') {
        try {
            const fd = await open(path, 'r');
            await fd.close();
            broadcastNativeError(cont, error);
        }
        catch {
            // ReadDirectoryChangesW reports a deleted watched directory as EPERM.
            // Turn that terminal backend failure into one final invalidation so
            // each subscriber can reconcile the path before the unusable shared
            // handle is discarded. If the path still exists, reconciliation is a
            // harmless refresh and preserves the historical error suppression.
            publishNativeTrigger(cont, 'rename', null, false);
        }
    }
    else {
        broadcastNativeError(cont, error);
    }
    closeFailedNativeResource(cont, error);
}
/**
 * inotify reports a watched directory's own deletion (IN_DELETE_SELF, IN_IGNORED)
 * as `rename` of its basename, after which the handle is dead. When the directory
 * was recreated before this callback ran, nothing else reveals that: ext4 even
 * reuses the inode number. Retire the handle so subscribers re-subscribe the new
 * directory and reconcile it. A same-named child that still exists is no sign.
 */
async function retireIfSelfRemoved(cont, nativePath) {
    try {
        await lstat(sp.join(nativePath, sp.basename(nativePath)));
        return;
    }
    catch (error) {
        if (!isMissingError(error))
            return;
    }
    try {
        if (!(await stat(nativePath)).isDirectory())
            return;
    }
    catch {
        // Deleted and not recreated: subscribers reconcile the removal themselves.
        return;
    }
    if (cont.closed || FsWatchInstances.get(cont.resource) !== cont)
        return;
    closeFailedNativeResource(cont, new Error(`Watched directory was replaced: ${nativePath}`));
}
function createNativeContainer(path, nativePath, resourceKey, options, subscriber) {
    let cont;
    const watcher = createFsWatchInstance(nativePath, options, (rawEvent, relativePath) => {
        const projectedPath = projectNativeRelativePath(nativePath, relativePath);
        publishNativeTrigger(cont, rawEvent, projectedPath, true, relativePath);
        if (isLinux && rawEvent === 'rename' && relativePath === sp.basename(nativePath)) {
            void retireIfSelfRemoved(cont, nativePath);
        }
    }, subscriber.errHandler);
    if (!watcher)
        return;
    cont = {
        resource: resourceKey,
        generation: allocateSharedResourceGeneration(),
        subscribers: new Set([subscriber]),
        closed: false,
        watcher,
        sequence: 0,
    };
    FsWatchInstances.set(resourceKey, cont);
    watcher.on(EV.ERROR, (error) => {
        void handleNativeError(path, cont, error);
    });
    return cont;
}
/**
 * Instantiates the fs_watch interface or binds listeners
 * to an existing one covering the same file system entry
 * @param path
 * @param fullPath absolute path
 * @param options to be passed to fs_watch
 * @param handlers container for event listener functions
 */
export function setFsWatchListener(path, fullPath, options, handlers, signal) {
    const resourceKey = fullPath;
    const subscriber = {
        ...handlers,
        watchedPath: path,
        persistent: options.persistent ?? true,
    };
    let cont = FsWatchInstances.get(resourceKey);
    if (cont) {
        attachWatcherSubscriber(cont, subscriber);
    }
    else {
        cont = createNativeContainer(path, toNativeWatchPath(path), resourceKey, options, subscriber);
        if (!cont)
            return;
    }
    const subscription = createWatcherSubscription(cont, subscriber, FsWatchInstances);
    if (signal.aborted) {
        void subscription.close();
        return;
    }
    return subscription;
}
const MISSING_POLL_OBSERVATION = Object.freeze({ missing: true });
const PollingInstances = new Map();
export function isMissingObservation(observation) {
    return 'missing' in observation;
}
function observationsDiffer(previous, current) {
    const previousMissing = isMissingObservation(previous);
    const currentMissing = isMissingObservation(current);
    if (previousMissing || currentMissing)
        return previousMissing !== currentMissing;
    const reliableInodeChanged = !isWindows && previous.ino !== 0 && current.ino !== 0 && previous.ino !== current.ino;
    return (previous.size !== current.size || previous.mtimeMs !== current.mtimeMs || reliableInodeChanged);
}
function setTimerPersistence(resource) {
    if (!resource.timer)
        return;
    if (resource.persistent)
        resource.timer.ref();
    else
        resource.timer.unref();
}
function schedulePoll(resource, delay = resource.interval) {
    if (resource.closed || resource.subscribers.size === 0)
        return;
    resource.timer = resource.scheduler.setTimeout(() => {
        resource.timer = undefined;
        const currentPoll = pollResource(resource);
        resource.currentPoll = currentPoll;
        void currentPoll.then(() => {
            if (resource.currentPoll === currentPoll)
                resource.currentPoll = undefined;
        }, () => {
            if (resource.currentPoll === currentPoll)
                resource.currentPoll = undefined;
        });
    }, delay);
    setTimerPersistence(resource);
}
async function pollResource(resource) {
    if (resource.closed || resource.running || resource.subscribers.size === 0)
        return;
    resource.running = true;
    const startedAt = resource.scheduler.now();
    let current;
    try {
        current = await stat(resource.resource);
    }
    catch (error) {
        if (isMissingError(error)) {
            current = MISSING_POLL_OBSERVATION;
        }
        else {
            resource.subscribers.forEach((subscriber) => subscriber.errHandler(error));
        }
    }
    if (!resource.closed && current) {
        const previous = resource.previous;
        resource.previous = current;
        const now = resource.scheduler.now();
        const changed = previous && observationsDiffer(previous, current);
        const directoryReplayDue = resource.directoryReplayAt !== undefined && now >= resource.directoryReplayAt;
        if (!isMissingObservation(current) && current.isDirectory()) {
            if (changed)
                resource.directoryReplayAt = now + POLL_DIRECTORY_RECHECK_DELAY;
            else if (directoryReplayDue)
                resource.directoryReplayAt = undefined;
        }
        else {
            resource.directoryReplayAt = undefined;
        }
        if (previous && (changed || directoryReplayDue)) {
            const trigger = {
                kind: 'poll',
                resource: resource.resource,
                current,
                previous,
                sequence: ++resource.sequence,
                observedAt: resource.scheduler.now(),
            };
            resource.subscribers.forEach((subscriber) => {
                subscriber.rawEmitter(EV.CHANGE, resource.resource, { current, previous });
                subscriber.publish(trigger);
            });
        }
    }
    resource.running = false;
    if (!resource.closed && resource.subscribers.size > 0) {
        const elapsed = resource.scheduler.now() - startedAt;
        schedulePoll(resource, Math.max(0, resource.interval - elapsed));
    }
}
function reconfigurePollResource(resource) {
    if (resource.closed || resource.subscribers.size === 0)
        return;
    const interval = Math.min(...[...resource.subscribers].map((subscriber) => subscriber.interval));
    const persistent = [...resource.subscribers].some((subscriber) => subscriber.persistent);
    const intervalChanged = resource.interval !== interval;
    resource.interval = interval;
    resource.persistent = persistent;
    if (resource.timer && intervalChanged) {
        resource.scheduler.clearTimeout(resource.timer);
        resource.timer = undefined;
        schedulePoll(resource);
    }
    else if (resource.timer) {
        setTimerPersistence(resource);
    }
    else if (!resource.running) {
        schedulePoll(resource);
    }
}
/**
 * Adds a subscriber to a Chokidar-owned polling resource.
 */
export function setPollingListener(path, fullPath, options, scheduler, handlers, initialStats, signal) {
    const resourceKey = fullPath;
    const subscriber = { watchedPath: path, ...options, ...handlers };
    let resources = PollingInstances.get(resourceKey);
    if (!resources) {
        resources = new Map();
        PollingInstances.set(resourceKey, resources);
    }
    let resource = resources.get(scheduler);
    if (!resource) {
        resource = {
            resource: resourceKey,
            generation: allocateSharedResourceGeneration(),
            scheduler,
            subscribers: new Set(),
            interval: options.interval,
            persistent: options.persistent,
            previous: initialStats,
            running: false,
            closed: false,
            sequence: 0,
        };
        resources.set(scheduler, resource);
    }
    else if (!resource.previous && initialStats) {
        resource.previous = initialStats;
    }
    resource.subscribers.add(subscriber);
    reconfigurePollResource(resource);
    let closed = false;
    let closePromise;
    const subscription = {
        resource: resourceKey,
        close: () => {
            if (closePromise)
                return closePromise;
            closePromise = (async () => {
                if (closed)
                    return;
                closed = true;
                resource.subscribers.delete(subscriber);
                if (resource.subscribers.size > 0) {
                    reconfigurePollResource(resource);
                    return;
                }
                if (resource.closed)
                    return;
                resource.closed = true;
                if (resource.timer)
                    resource.scheduler.clearTimeout(resource.timer);
                resource.timer = undefined;
                const currentResources = PollingInstances.get(resourceKey);
                if (currentResources?.get(scheduler) === resource) {
                    currentResources.delete(scheduler);
                    if (currentResources.size === 0)
                        PollingInstances.delete(resourceKey);
                }
                if (resource.currentPoll) {
                    await Promise.allSettled([resource.currentPoll]);
                }
            })();
            return closePromise;
        },
    };
    if (signal.aborted) {
        void subscription.close();
        return;
    }
    return subscription;
}
/**
 * @mixin
 */
export function setRecursiveWatchFactoryForTests(factory) {
    if (RecursiveWatchInstances.size > 0) {
        throw new Error('Cannot replace the recursive watch factory while resources are active');
    }
    recursiveWatchFactory = factory ?? systemRecursiveWatchFactory;
    recursiveWatchUnsupported = false;
}
export function setNativeWatchFactoryForTests(factory) {
    if (FsWatchInstances.size > 0) {
        throw new Error('Cannot replace the native watch factory while resources are active');
    }
    nativeWatchFactory = factory ?? systemNativeWatchFactory;
}
export function failRecursiveWatch(path, error) {
    const resource = RecursiveWatchInstances.get(sp.resolve(path));
    if (!resource)
        return false;
    failRecursiveResource(resource, error);
    return true;
}
export async function failNativeWatch(path, error) {
    const resource = FsWatchInstances.get(sp.resolve(path));
    if (!resource)
        return false;
    await handleNativeError(path, resource, error);
    return true;
}
export function nativeResourceCountForTests() {
    return FsWatchInstances.size;
}
