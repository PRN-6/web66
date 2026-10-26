import type { Stats, WatchEventType } from 'node:fs';
import type { EntryInfo } from 'readdirp';
export declare const isWindows: boolean;
export declare const isMacos: boolean;
export declare const isLinux: boolean;
export declare const isFreeBSD: boolean;
export declare const isIBMi: boolean;
export type ErrorClass = 'missing' | 'permission' | 'recursive-unsupported' | 'other';
export declare function errorCode(error: unknown): string | undefined;
export declare function classifyError(error: unknown): ErrorClass;
export declare function isMissingError(error: unknown): boolean;
export declare function isPermissionError(error: unknown): boolean;
export declare function isRecursiveWatchUnsupported(error: unknown): boolean;
export interface SchedulerTimer {
    ref(): SchedulerTimer;
    unref(): SchedulerTimer;
}
export interface Scheduler {
    now(): number;
    setTimeout(callback: () => void, delay: number): SchedulerTimer;
    clearTimeout(timer: SchedulerTimer | undefined): void;
}
export declare const systemScheduler: Scheduler;
export type Path = string;
export type LogicalPathKey = string & {
    readonly __logicalPathKey: unique symbol;
};
export type BackendResourceKey = string & {
    readonly __backendResourceKey: unique symbol;
};
export declare const EVENTS: {
    readonly ALL: "all";
    readonly READY: "ready";
    readonly ADD: "add";
    readonly CHANGE: "change";
    readonly ADD_DIR: "addDir";
    readonly UNLINK: "unlink";
    readonly UNLINK_DIR: "unlinkDir";
    readonly RAW: "raw";
    readonly ERROR: "error";
};
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export type NativeTrigger = {
    kind: 'native';
    resource: BackendResourceKey;
    rawEvent: WatchEventType;
    relativePath: string | null;
    sequence: number;
    observedAt: number;
};
export type MissingPollObservation = {
    missing: true;
};
export type PollObservation = Stats | MissingPollObservation;
export type PollTrigger = {
    kind: 'poll';
    resource: BackendResourceKey;
    current: PollObservation;
    previous?: PollObservation;
    sequence: number;
    observedAt: number;
};
export type BackendTrigger = NativeTrigger | PollTrigger;
export interface BackendSubscription {
    readonly resource: BackendResourceKey;
    close(): void | Promise<void>;
}
export interface WatchHandlers {
    errHandler: (err: unknown) => void;
    rawEmitter: (ev: WatchEventType, path: string | null, opts: unknown) => void;
}
export type AWF = {
    stabilityThreshold: number;
    pollInterval: number;
};
export type WatchBackend = 'auto' | 'native' | 'native-recursive' | 'polling';
export type BackendStrategy = 'polling' | 'native-per-directory' | 'native-recursive-preferred';
export type MatcherObject = {
    path: string;
    recursive?: boolean;
};
export type MatchFunction = (val: string, stats?: Stats) => boolean;
export type Matcher = string | RegExp | MatchFunction | MatcherObject;
type BasicOptions = {
    persistent: boolean;
    ignoreInitial: boolean;
    followSymlinks: boolean;
    cwd?: string;
    backend: WatchBackend;
    /** @deprecated Use `backend: 'polling'` instead. */
    usePolling: boolean;
    pollingInterval: number;
    pollingBinaryInterval: number;
    /** @deprecated Use `pollingInterval` instead. */
    interval: number;
    /** @deprecated Use `pollingBinaryInterval` instead. */
    binaryInterval: number;
    alwaysStat?: boolean;
    depth?: number;
    ignorePermissionErrors: boolean;
    atomic: boolean | number;
};
export type ChokidarOptions = Partial<BasicOptions & {
    ignored: Matcher | Matcher[];
    awaitWriteFinish: boolean | Partial<AWF>;
}>;
export type FSWInstanceOptions = BasicOptions & {
    ignored: readonly Matcher[];
    awaitWriteFinish: false | AWF;
    backendStrategy: BackendStrategy;
    backendCapabilities: import('./backend.js').BackendCapabilities;
};
export type ThrottleType = 'readdir' | 'watch' | 'add' | 'remove' | 'change';
export type Throttler = {
    timeoutObject: SchedulerTimer;
    clear: (invokeRelease?: boolean) => number;
    count: number;
};
export type EmitArgs = [path: Path, stats?: Stats];
export type EmitErrorArgs = [error: Error, stats?: Stats];
export type EmitArgsWithName = [event: EventName, ...EmitArgs];
export declare function normalizePath(path: Path): Path;
export type StatIdentity = {
    size: number;
    mtimeMs: number;
    ino: number;
};
/**
 * Plain-number size, mtime, and inode. readdirp returns BigIntStats on Windows,
 * which never compare equal to the number Stats of `lstat`.
 */
export declare function statIdentity(stats: Stats): StatIdentity;
export declare function logicalPathKey(path: Path): LogicalPathKey;
export declare function isSameOrInside(root: Path, candidate: Path): boolean;
export declare function isStrictlyInside(root: Path, candidate: Path): boolean;
export declare function isMatcherObject(matcher: Matcher): matcher is MatcherObject;
export declare function cloneOwnedMatcher(matcher: Matcher): Matcher;
export declare function compileMatchers(matchers: readonly Matcher[]): MatchFunction;
export declare function normalizeMatcher(matcher: Matcher, cwd?: string): Matcher;
export type WatchHelperContext = {
    capturePathGeneration: () => number;
    isntIgnored: (path: Path, stats?: EntryInfo['stats']) => boolean;
};
/** Temporary traversal scope; replaced by the observation engine's root scope. */
export declare class WatchHelper {
    watchPath: string;
    followSymlinks: boolean;
    recursiveRoot?: string;
    recursiveDisabled?: boolean;
    observationTrigger?: NativeTrigger;
    realpathAncestry: Set<string>;
    pathGeneration: number;
    private readonly context;
    constructor(path: string, follow: boolean, context: WatchHelperContext);
    fork(path: string): WatchHelper;
    withObservation(trigger: NativeTrigger): WatchHelper;
    filterPath(entry: EntryInfo): boolean;
    filterDir(entry: EntryInfo): boolean;
}
export {};
