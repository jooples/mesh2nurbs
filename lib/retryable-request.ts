/** Keep an uncertain request's key until its payload changes or it succeeds. */
export class RetryableRequest {
  private attempt: { payload: string; key: string } | null = null;

  keyFor(payload: unknown): string {
    const serialized = JSON.stringify(payload);
    if (!this.attempt || this.attempt.payload !== serialized) {
      this.attempt = { payload: serialized, key: crypto.randomUUID() };
    }
    return this.attempt.key;
  }

  complete() {
    this.attempt = null;
  }
}
