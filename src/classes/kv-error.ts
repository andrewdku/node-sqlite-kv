/**
 * Class representing a KVError
 */
export class KVError extends Error {
    public static override name: string = "KVError";
    public readonly scope: string;
    public constructor(scope: string, ...args: unknown[]) {
        super(args.join(" "));
        this.scope = scope;
        Error.captureStackTrace?.(this, this.constructor);
    }

    public override get name(): string {
        return `${this.constructor.name} (${this.scope})`;
    }
}
