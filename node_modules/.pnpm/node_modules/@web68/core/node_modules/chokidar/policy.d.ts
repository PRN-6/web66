import type { Stats } from 'node:fs';
import { type EmitArgs, type EmitArgsWithName, type EmitErrorArgs, type EventName, type FSWInstanceOptions, type LogicalPathKey, type Path, type Scheduler, type SchedulerTimer, type Throttler, type ThrottleType } from './runtime.js';
import { LifecycleScope } from './tree.js';
export type PendingWrite = {
    lastChange: number;
    cancelWait: () => EventName;
};
export type PendingChangeEmission = {
    path: Path;
    stats?: Stats;
    replay: boolean;
    /** A held leading change that reported an empty file; `release` publishes it. */
    held?: {
        timer: SchedulerTimer;
        release: () => void;
    };
};
/** A file `add` held while its stats showed an empty file. */
type HeldAdd = {
    path: Path;
    stats?: Stats;
    timer?: SchedulerTimer;
    release: () => void;
};
type EventPolicyContext = {
    options: FSWInstanceOptions;
    scheduler: Scheduler;
    lifecycle: LifecycleScope;
    isClosed: () => boolean;
    capturePathGeneration: () => number;
    isPathGenerationActive: (path: Path, generation: number) => boolean;
    isReady: () => boolean;
    remove: (directory: string, item: string) => void;
    handleError: (error: unknown) => void;
    publish: (event: EventName, args: EmitArgs | EmitErrorArgs) => void;
};
/** Converts truthful tree transitions into the public, timing-aware event API. */
export declare class EventPolicy {
    readonly pendingWrites: Map<string, PendingWrite>;
    readonly pendingUnlinks: Map<string, {
        event: EmitArgsWithName;
        timer: SchedulerTimer;
    }>;
    readonly pendingChanges: Map<string, PendingChangeEmission>;
    readonly heldAdds: Map<string, HeldAdd>;
    readonly throttled: Map<ThrottleType, Map<string, Throttler>>;
    private readonly context;
    constructor(context: EventPolicyContext);
    private presentPath;
    private dropHeldAdd;
    private dropPendingChange;
    private setTimeout;
    emit(event: EventName, path: Path, stats?: Stats): Promise<void>;
    throttle(actionType: ThrottleType, path: Path, timeout: number, onRelease?: (suppressedCount: number) => void): Throttler | false;
    awaitWriteFinish(path: Path, threshold: number, event: EventName, awfEmit: (error?: Error, stats?: Stats) => void, logicalKey?: LogicalPathKey): void;
    cancelPath(path: Path): void;
    cancelWhere(contains: (path: string) => boolean): void;
    close(): void;
}
export {};
