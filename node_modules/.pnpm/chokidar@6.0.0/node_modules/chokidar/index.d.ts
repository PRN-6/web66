/*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) */
import { EventEmitter } from 'node:events';
import { type Stats } from 'node:fs';
import { type ReaddirpOptions, ReaddirpStream } from 'readdirp';
import { EventPolicy } from './policy.js';
import { ObservationEngine } from './reconcile.js';
import { type ChokidarOptions, type EmitArgs, EVENTS as EV, type EventName, type FSWInstanceOptions, type Path, type Scheduler, type WatchHandlers, WatchHelper } from './runtime.js';
import { LifecycleScope, ReconciliationQueue, TreeState } from './tree.js';
export type { AWF, BackendStrategy, ChokidarOptions, EmitArgs, EmitArgsWithName, EmitErrorArgs, FSWInstanceOptions, Matcher, MatcherObject, MatchFunction, Scheduler, SchedulerTimer, Throttler, ThrottleType, WatchBackend, } from './runtime.js';
export interface FSWatcherEventMap {
    [EV.READY]: [];
    [EV.RAW]: Parameters<WatchHandlers['rawEmitter']>;
    [EV.ERROR]: Parameters<WatchHandlers['errHandler']>;
    [EV.ALL]: [event: EventName, ...EmitArgs];
    [EV.ADD]: EmitArgs;
    [EV.CHANGE]: EmitArgs;
    [EV.ADD_DIR]: EmitArgs;
    [EV.UNLINK]: EmitArgs;
    [EV.UNLINK_DIR]: EmitArgs;
}
/**
 * Watches files & directories for changes. Emitted events:
 * `add`, `addDir`, `change`, `unlink`, `unlinkDir`, `all`, `error`
 *
 *     new FSWatcher()
 *       .add(directories)
 *       .on('add', path => log('File', path, 'was added'))
 */
export declare class FSWatcher extends EventEmitter<FSWatcherEventMap> {
    #private;
    options: FSWInstanceOptions;
    /** @internal */
    readonly lifecycle: LifecycleScope;
    /** @internal */
    readonly tree: TreeState;
    /** @internal */
    readonly reconciliation: ReconciliationQueue;
    /** @internal */
    readonly events: EventPolicy;
    /** @internal */
    readonly scheduler: Scheduler;
    /** @internal */
    readonly handler: ObservationEngine;
    /** @internal */
    readyEmitted: boolean;
    /** @internal */
    readonly streams: Set<ReaddirpStream>;
    get closed(): boolean;
    constructor(_opts?: ChokidarOptions, scheduler?: Scheduler);
    private addIgnoredPath;
    private removeIgnoredPath;
    private ignoredMatcher;
    /** @internal */
    capturePathGeneration(): number;
    private invalidatePath;
    /** @internal */
    isPathGenerationActive(path: Path, generation: number): boolean;
    private queueReady;
    /**
     * Adds paths to be watched on an existing FSWatcher instance.
     * @param paths_ file or file list
     */
    add(paths_: Path | Path[]): FSWatcher;
    /**
     * Close watchers or start ignoring events from specified paths.
     */
    unwatch(paths_: Path | Path[]): FSWatcher;
    /**
     * Close watchers and remove all listeners from watched paths.
     */
    close(): Promise<void>;
    /**
     * Expose list of watched paths. The result has a null prototype, so a
     * directory named `__proto__` is an ordinary own key.
     */
    getWatched(): Record<string, string[]>;
    /** @internal */
    emitRaw(...args: Parameters<WatchHandlers['rawEmitter']>): void;
    private emitWithAll;
    /**
     * Normalize and emit events.
     * Calling emitEvent DOES NOT MEAN emit() would be called!
     * @param event Type of event
     * @param path File or directory path
     * @param stats arguments to be passed with event
     * @internal
     */
    emitEvent(event: EventName, path: Path, stats?: Stats): Promise<void>;
    /**
     * Common handler for backend and reconciliation failures.
     * @internal
     */
    handleError(error: unknown): void;
    /**
     * Determines whether user has asked to ignore this path.
     * @internal
     */
    isIgnored(path: Path, stats?: Stats): boolean;
    private isRootAncestor;
    /** Records every directory above a requested root; refcounted across roots. */
    private addRootAncestors;
    private removeRootAncestors;
    private realDirectory;
    /** @internal */
    isUnwatched(path: Path): boolean;
    /**
     * Provides a set of common helpers and properties relating to symlink handling.
     * @param path file or directory pattern being watched
     * @internal
     */
    createHelper(path: Path): WatchHelper;
    private removeTreeItem;
    /**
     * Handles emitting unlink events for
     * files and directories, and via recursion, for
     * files and directories within directories that are unlinked
     * @param directory within which the following item is located
     * @param item      base path of item/directory
     * @internal
     */
    removePath(directory: string, item: string, isDirectory?: boolean): void;
    /**
     * Replaces every watch keyed at `path` with a wait from its nearest existing
     * ancestor, so the path is reported again when it reappears.
     * @internal
     */
    rewatchMissingPath(path: Path): void;
    /**
     * Closes all watchers for a path
     * @internal
     */
    closePath(path: Path, recursive?: boolean): void;
    /**
     * Closes only file-specific watchers
     */
    private closeFile;
    /** @internal */
    addPathCloser(path: Path, closer: () => void | Promise<void>): void;
    /** @internal */
    createScanStream(root: Path, opts?: Partial<ReaddirpOptions>): ReaddirpStream | undefined;
}
/**
 * Instantiates watcher with paths to be tracked.
 * @param paths file / directory paths
 * @param options opts, such as `atomic`, `awaitWriteFinish`, `ignored`, and others
 * @returns an instance of FSWatcher for chaining.
 * @example
 * const watcher = watch('.').on('all', (event, path) => { console.log(event, path); });
 * watch('.', { atomic: true, awaitWriteFinish: true, ignored: (f, stats) => stats?.isFile() && !f.endsWith('.js') })
 */
export declare function watch(paths: string | string[], options?: ChokidarOptions): FSWatcher;
declare const _default: {
    watch: typeof watch;
    FSWatcher: typeof FSWatcher;
};
export default _default;
