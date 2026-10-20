interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const tracker = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default 60,000ms = 1 min)
  maxRequests?: number; // Max allowed requests per window (default 10)
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { success: boolean; limit: number; remaining: number; reset: number } {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.maxRequests || 10;
  const now = Date.now();

  const record = tracker.get(identifier);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    tracker.set(identifier, newRecord);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: newRecord.resetTime,
    };
  }

  if (record.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  record.count += 1;
  tracker.set(identifier, record);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    reset: record.resetTime,
  };
}
