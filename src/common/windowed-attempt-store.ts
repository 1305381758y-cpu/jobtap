export class WindowedAttemptStore {
  private readonly attempts = new Map<string, number[]>();
  private lastSweepAt = 0;

  constructor(
    private readonly windowMs: number,
    private readonly sweepIntervalMs = 60_000,
  ) {}

  attempt(key: string, limit: number, now = Date.now()): boolean {
    const recent = this.recentAttempts(key, now);
    if (recent.length >= limit) {
      this.attempts.set(key, recent);
      this.sweep(now);
      return false;
    }

    recent.push(now);
    this.attempts.set(key, recent);
    this.sweep(now);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private recentAttempts(key: string, now: number): number[] {
    return (this.attempts.get(key) ?? []).filter((timestamp) => now - timestamp < this.windowMs);
  }

  private sweep(now: number): void {
    if (now - this.lastSweepAt < this.sweepIntervalMs) return;
    this.lastSweepAt = now;

    for (const [key, timestamps] of this.attempts.entries()) {
      const recent = timestamps.filter((timestamp) => now - timestamp < this.windowMs);
      if (recent.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, recent);
      }
    }
  }
}
