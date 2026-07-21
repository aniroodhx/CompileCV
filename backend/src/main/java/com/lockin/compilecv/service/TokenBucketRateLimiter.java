package com.lockin.compilecv.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * In-memory token bucket rate limiter, keyed per client IP.
 *
 * Chosen over the sliding-window log it replaces because a token bucket
 * naturally supports bursts: a client that's been idle can spend a few
 * requests in quick succession (useful for retries after a transient error)
 * without being penalized as if they'd truly been hammering the endpoint,
 * while still capping sustained throughput to the configured refill rate.
 * A sliding-window log has to store every request timestamp to do the same
 * job; a token bucket needs only two numbers (tokens, lastRefillTime) per
 * client, which is a real memory/complexity win at scale.
 *
 * This stays in-memory rather than Redis-backed by design: the service
 * runs as a single instance, so an in-memory bucket is already correct —
 * adding Redis here would be infra for infra's sake, not a fix for a real
 * multi-instance correctness gap (see WebhookRelay's rate limiter for the
 * contrasting case where Redis actually is warranted, because that service
 * is designed to run behind a load balancer).
 */
@Component
public class TokenBucketRateLimiter {

    private static final int CAPACITY = 5;          // max burst size
    private static final double REFILL_PER_SECOND = 5.0 / 60.0; // 5 tokens per 60s

    private static class Bucket {
        double tokens = CAPACITY;
        long lastRefillMillis = System.currentTimeMillis();
        final ReentrantLock lock = new ReentrantLock();
    }

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /** Returns true if the request is allowed (a token was available and consumed). */
    public boolean tryConsume(String clientKey) {
        Bucket bucket = buckets.computeIfAbsent(clientKey, k -> new Bucket());
        bucket.lock.lock();
        try {
            refill(bucket);
            if (bucket.tokens >= 1.0) {
                bucket.tokens -= 1.0;
                return true;
            }
            return false;
        } finally {
            bucket.lock.unlock();
        }
    }

    private void refill(Bucket bucket) {
        long now = System.currentTimeMillis();
        double elapsedSeconds = (now - bucket.lastRefillMillis) / 1000.0;
        double newTokens = elapsedSeconds * REFILL_PER_SECOND;
        if (newTokens > 0) {
            bucket.tokens = Math.min(CAPACITY, bucket.tokens + newTokens);
            bucket.lastRefillMillis = now;
        }
    }
}
