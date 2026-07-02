export interface HashScanResult {
  result: "clear" | "flagged";
}

export interface HashScanner {
  scan(buffer: Buffer): Promise<HashScanResult>;
}

/**
 * Phase 0 stub — always clears. The upload pipeline calls this on every
 * media upload so that Phase 1 is a matter of swapping this implementation
 * for a real CSAM hash-match vendor, not restructuring the pipeline.
 * See PRD §12 step 3 / §7.5.
 */
export class NoOpHashScanner implements HashScanner {
  async scan(_buffer: Buffer): Promise<HashScanResult> {
    return { result: "clear" };
  }
}
