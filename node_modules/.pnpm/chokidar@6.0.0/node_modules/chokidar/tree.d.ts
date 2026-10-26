import type { Stats } from 'node:fs';
import type { ReaddirpOptions, ReaddirpStream } from 'readdirp';
import type { EventPolicy } from './policy.js';
import type { Scheduler } from './runtime.js';
import { type EventName, type FSWInstanceOptions, type NativeTrigger, type Path, type WatchHandlers, type WatchHelper } from './runtime.js';
export type LifecycleState = 'OPEN' | 'CLOSING' | 'CLOSED';
export type Closer = () => void | Promise<void>;
/**
 * Owns every asynchronous task and backend subscription created by one public
 * watcher. It deliberately knows nothing about paths, events, or backends.
 */
export declare class LifecycleScope {
    state: LifecycleState;
    generation: number;
    readonly abortController: AbortController;
    readonly tasks: Set<Promise<unknown>>;
    readonly closers: Map<string, Closer[]>;
    private readonly onTaskSettled;
    private readonly onTaskError;
    constructor(onTaskSettled: () => void, onTaskError: (error: unknown) => void);
    isActive(generation: number): boolean;
    track<T>(task: Promise<T>): Promise<T>;
    addCloser(key: string, closer: Closer): void;
    takeClosers(key: string): Closer[];
    beginClose(): Promise<void>[];
    drain(): Promise<void>;
    finishClose(): void;
}
export declare function resolveRecursiveCandidate(root: string, relativePath: string): string | undefined;
export type PendingReconciliation = {
    promise: Promise<void>;
    work: () => Promise<void>;
    replay: boolean;
};
/** Serializes commits per root and coalesces redundant candidate invalidations. */
export declare class ReconciliationQueue {
    readonly queues: Map<string, Promise<void>>;
    readonly pending: Map<string, PendingReconciliation>;
    private readonly lifecycle;
    constructor(lifecycle: LifecycleScope);
    enqueue(scope: Path, work: () => Promise<void>, coalescePath?: Path | false): Promise<void>;
    forgetPending(predicate: (scope: string, candidate: string) => boolean): void;
    clear(): void;
}
export type ObservedPathFact = {
    size: number;
    mtimeMs: number;
    ino: number;
    kind: 'file' | 'directory' | 'symlink' | 'other';
    transition?: 'add' | 'change';
    rawEvent?: NativeTrigger['rawEvent'];
    relativePath?: string | null;
    observedAt?: number;
    initialRecursive?: boolean;
};
/** A directory membership snapshot owned by one public watcher. */
export declare class DirEntry {
    path: Path;
    private readonly items;
    constructor(dir: Path);
    add(item: string): void;
    /** Returns true when removing `item` left the directory empty. */
    remove(item: string): boolean;
    has(item: string): boolean;
    getChildren(): string[];
    dispose(): void;
}
/**
 * Per-watcher filesystem truth. Backends never mutate this object directly;
 * scanner and reconciliation stages commit observations through it.
 */
export declare class TreeState {
    readonly watched: Map<string, DirEntry>;
    readonly observed: Map<string, ObservedPathFact>;
    readonly symlinkPaths: Map<Path, string | boolean>;
    readonly recursiveRoots: Set<string>;
    private readonly observesNative;
    constructor(observesNative: () => boolean);
    getDirectory(directory: string): DirEntry;
    /** Looks up a directory entry without creating one. */
    peekDirectory(directory: string): DirEntry | undefined;
    recordObserved(path: Path, stats: Stats, transition?: ObservedPathFact['transition'], trigger?: NativeTrigger, initialRecursive?: boolean, retainWithoutTrigger?: boolean): void;
    consumeInitialCreate(path: Path, stats: Stats, trigger: NativeTrigger, ignoreInitial: boolean): EventName | false | undefined;
    markInitialCreate(path: Path): void;
    clearInitialCreate(path: Path): void;
    clearInitialCreates(root: Path): void;
    /** True when a tracked directory path now names a different directory inode. */
    replacedSinceObserved(path: Path, stats: Stats): boolean;
    /** True when `stats` no longer matches a recorded fact of the same kind. */
    changedSinceObserved(path: Path, stats: Stats): boolean;
    isDuplicateObservation(path: Path, stats: Stats, trigger: NativeTrigger): boolean;
    dispose(): void;
}
export type PathCloser = () => void | Promise<void>;
/**
 * The private port used by filesystem orchestration. It prevents a backend or
 * scanner from depending on EventEmitter or the public FSWatcher API.
 */
export interface WatcherContext {
    readonly closed: boolean;
    readonly options: FSWInstanceOptions;
    readonly lifecycle: LifecycleScope;
    readonly tree: TreeState;
    readonly reconciliation: ReconciliationQueue;
    readonly events: EventPolicy;
    readonly scheduler: Scheduler;
    readonly emitRaw: WatchHandlers['rawEmitter'];
    addPathCloser(path: Path, closer: PathCloser): void;
    capturePathGeneration(): number;
    closePath(path: Path, recursive?: boolean): void;
    emitEvent(event: EventName, path: Path, stats?: Stats): Promise<void>;
    createHelper(path: Path): WatchHelper;
    handleError(error: unknown): void;
    isIgnored(path: Path, stats?: Stats): boolean;
    isPathGenerationActive(path: Path, generation: number): boolean;
    isUnwatched(path: Path): boolean;
    createScanStream(root: Path, options?: Partial<ReaddirpOptions>): ReaddirpStream | undefined;
    removePath(directory: string, item: string, isDirectory?: boolean): void;
    rewatchMissingPath(path: Path): void;
}
