import type { FSWatcher as NativeFsWatcher, Stats, WatchListener } from 'node:fs';
import { type BackendResourceKey, type BackendStrategy, type BackendSubscription, type BackendTrigger, type ChokidarOptions, type FSWInstanceOptions, type MissingPollObservation, type NativeTrigger, type Path, type PollObservation, type Scheduler, type WatchHandlers } from './runtime.js';
export type SharedResourceState<Subscriber> = {
    readonly resource: BackendResourceKey;
    readonly generation: number;
    readonly subscribers: Set<Subscriber>;
    closed: boolean;
};
export declare function allocateSharedResourceGeneration(): number;
/** Common ownership state for process-global backend handles. */
export declare function createSharedResourceState<Subscriber>(resource: BackendResourceKey, subscribers?: Iterable<Subscriber>): SharedResourceState<Subscriber>;
export declare function attachSharedSubscriber<Subscriber>(resource: SharedResourceState<Subscriber>, subscriber: Subscriber): boolean;
export declare function detachSharedSubscriber<Subscriber>(resource: SharedResourceState<Subscriber>, subscriber: Subscriber): 'remaining' | 'last' | undefined;
/** Invalidates exactly this resource generation and returns its subscribers. */
export declare function invalidateSharedResource<Subscriber>(resource: SharedResourceState<Subscriber>): readonly Subscriber[] | undefined;
export type BackendCapabilities = Readonly<{
    kind: BackendStrategy;
    polling: boolean;
    recursive: boolean;
    perDirectory: boolean;
}>;
export declare function selectBackend(options: Pick<ChokidarOptions, 'backend' | 'depth'>): BackendCapabilities;
type BackendHandlers = {
    publish: (trigger: BackendTrigger) => void;
    errHandler: WatchHandlers['errHandler'];
    rawEmitter: WatchHandlers['rawEmitter'];
    /** Native only: the shared handle was retired after a runtime error. */
    failure?: (error: unknown) => void;
};
/** Native resources use one process-global monotonic time domain. */
export declare function backendNow(): number;
type NativeSubscriber = BackendHandlers & {
    watchedPath: string;
    persistent: boolean;
};
export type FsWatchContainer = SharedResourceState<NativeSubscriber> & {
    watcher: NativeFsWatcher;
    sequence: number;
};
export type NativeWatchFactory = (path: string, options: {
    persistent: boolean | undefined;
}, listener: WatchListener<string>) => NativeFsWatcher;
type RecursiveNativeSubscriber = {
    watchedPath: string;
    persistent: boolean;
    publish: (trigger: NativeTrigger) => void;
    failure: (error: unknown) => void;
    rawEmitter: WatchHandlers['rawEmitter'];
};
export type RecursiveSubscriptionResult = {
    kind: 'subscribed';
    subscription: BackendSubscription;
} | {
    kind: 'unsupported';
} | {
    kind: 'failed';
    error: unknown;
};
export type RecursiveWatchFactory = (path: string, options: {
    persistent: boolean;
    recursive: true;
}, listener: WatchListener<string>) => NativeFsWatcher;
export declare function subscribeRecursiveNative(path: string, persistent: boolean, handlers: Omit<RecursiveNativeSubscriber, 'watchedPath' | 'persistent'>, signal: AbortSignal): RecursiveSubscriptionResult;
/**
 * Instantiates the fs_watch interface or binds listeners
 * to an existing one covering the same file system entry
 * @param path
 * @param fullPath absolute path
 * @param options to be passed to fs_watch
 * @param handlers container for event listener functions
 */
export declare function setFsWatchListener(path: string, fullPath: string, options: Partial<FSWInstanceOptions>, handlers: BackendHandlers, signal: AbortSignal): BackendSubscription | undefined;
type PollSubscriber = {
    watchedPath: Path;
    interval: number;
    persistent: boolean;
    publish: BackendHandlers['publish'];
    errHandler: WatchHandlers['errHandler'];
    rawEmitter: WatchHandlers['rawEmitter'];
};
type PollingSubscriptionOptions = Pick<PollSubscriber, 'interval' | 'persistent'>;
export declare function isMissingObservation(observation: PollObservation): observation is MissingPollObservation;
/**
 * Adds a subscriber to a Chokidar-owned polling resource.
 */
export declare function setPollingListener(path: Path, fullPath: Path, options: PollingSubscriptionOptions, scheduler: Scheduler, handlers: BackendHandlers, initialStats: Stats | undefined, signal: AbortSignal): BackendSubscription | undefined;
/**
 * @mixin
 */
export declare function setRecursiveWatchFactoryForTests(factory?: RecursiveWatchFactory): void;
export declare function setNativeWatchFactoryForTests(factory?: NativeWatchFactory): void;
export declare function failRecursiveWatch(path: string, error: unknown): boolean;
export declare function failNativeWatch(path: string, error: Error & {
    code: string;
}): Promise<boolean>;
export declare function nativeResourceCountForTests(): number;
export {};
