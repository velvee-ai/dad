package batch

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"
)

// Item represents a single item in a batch
type Item struct {
	ID   string
	Data interface{}
}

// Result represents the result of processing a batch item
type Result struct {
	ID       string
	Data     interface{}
	Output   interface{}
	Error    error
	Attempts int
	Status   string // "success", "failed", "pending"
}

// Options configures batch processing behavior
type Options struct {
	MaxConcurrent         int
	RetryAttempts         int
	RetryDelayMs          int
	RetryBackoffMultiplier float64
	OnProgress            func(completed, total int)
	OnItemComplete        func(result *Result)
}

// DefaultOptions returns default batch processing options
func DefaultOptions() *Options {
	return &Options{
		MaxConcurrent:         5,
		RetryAttempts:         3,
		RetryDelayMs:          1000,
		RetryBackoffMultiplier: 2.0,
	}
}

// Processor is a function that processes a single item
type Processor func(ctx context.Context, item *Item) (interface{}, error)

// ProcessBatch processes items in parallel with concurrency control
func ProcessBatch(ctx context.Context, items []*Item, processor Processor, opts *Options) ([]*Result, error) {
	if opts == nil {
		opts = DefaultOptions()
	}

	results := make([]*Result, len(items))
	for i, item := range items {
		results[i] = &Result{
			ID:     item.ID,
			Data:   item.Data,
			Status: "pending",
		}
	}

	sem := make(chan struct{}, opts.MaxConcurrent)
	var wg sync.WaitGroup
	var mu sync.Mutex
	completedCount := 0

	for i, item := range items {
		wg.Add(1)
		go func(index int, itm *Item) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			result := results[index]
			output, err := withRetry(ctx, func() (interface{}, error) {
				return processor(ctx, itm)
			}, opts)

			mu.Lock()
			if err != nil {
				result.Error = err
				result.Status = "failed"
				result.Attempts = opts.RetryAttempts
			} else {
				result.Output = output
				result.Status = "success"
				result.Attempts = 1
			}

			completedCount++
			if opts.OnItemComplete != nil {
				opts.OnItemComplete(result)
			}
			if opts.OnProgress != nil {
				opts.OnProgress(completedCount, len(items))
			}
			mu.Unlock()
		}(i, item)
	}

	wg.Wait()
	return results, nil
}

// withRetry retries a function with exponential backoff
func withRetry(ctx context.Context, fn func() (interface{}, error), opts *Options) (interface{}, error) {
	var lastErr error

	for attempt := 1; attempt <= opts.RetryAttempts; attempt++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		output, err := fn()
		if err == nil {
			return output, nil
		}

		lastErr = err

		if attempt < opts.RetryAttempts {
			delay := time.Duration(opts.RetryDelayMs) * time.Millisecond
			backoff := time.Duration(float64(delay) * math.Pow(opts.RetryBackoffMultiplier, float64(attempt-1)))
			time.Sleep(backoff)
		}
	}

	return nil, lastErr
}

// ProgressTracker tracks progress of batch operations
type ProgressTracker struct {
	completed int
	total     int
	startTime time.Time
	mu        sync.RWMutex
	callbacks []func(update *ProgressUpdate)
}

// ProgressUpdate contains progress information
type ProgressUpdate struct {
	Completed              int
	Total                  int
	Percentage             float64
	Elapsed                time.Duration
	EstimatedTimeRemaining *time.Duration
}

// NewProgressTracker creates a new progress tracker
func NewProgressTracker(total int) *ProgressTracker {
	return &ProgressTracker{
		total:     total,
		startTime: time.Now(),
		callbacks: make([]func(*ProgressUpdate), 0),
	}
}

// Increment increments the completed count
func (pt *ProgressTracker) Increment() {
	pt.mu.Lock()
	pt.completed++
	pt.mu.Unlock()
	pt.notify()
}

// SetCompleted sets the completed count
func (pt *ProgressTracker) SetCompleted(completed int) {
	pt.mu.Lock()
	pt.completed = completed
	pt.mu.Unlock()
	pt.notify()
}

// OnChange registers a callback for progress updates
func (pt *ProgressTracker) OnChange(callback func(*ProgressUpdate)) {
	pt.mu.Lock()
	defer pt.mu.Unlock()
	pt.callbacks = append(pt.callbacks, callback)
}

func (pt *ProgressTracker) notify() {
	update := pt.GetProgress()
	pt.mu.RLock()
	callbacks := pt.callbacks
	pt.mu.RUnlock()

	for _, cb := range callbacks {
		cb(update)
	}
}

// GetProgress returns the current progress
func (pt *ProgressTracker) GetProgress() *ProgressUpdate {
	pt.mu.RLock()
	defer pt.mu.RUnlock()

	elapsed := time.Since(pt.startTime)
	percentage := float64(pt.completed) / float64(pt.total) * 100

	var estimatedTimeRemaining *time.Duration
	if pt.completed > 0 {
		rate := float64(pt.completed) / elapsed.Seconds()
		remaining := pt.total - pt.completed
		etr := time.Duration(float64(remaining)/rate) * time.Second
		estimatedTimeRemaining = &etr
	}

	return &ProgressUpdate{
		Completed:              pt.completed,
		Total:                  pt.total,
		Percentage:             percentage,
		Elapsed:                elapsed,
		EstimatedTimeRemaining: estimatedTimeRemaining,
	}
}

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	tokens         float64
	maxTokens      float64
	refillRate     float64
	refillInterval time.Duration
	lastRefill     time.Time
	mu             sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxTokens, refillRate int, refillInterval time.Duration) *RateLimiter {
	return &RateLimiter{
		tokens:         float64(maxTokens),
		maxTokens:      float64(maxTokens),
		refillRate:     float64(refillRate),
		refillInterval: refillInterval,
		lastRefill:     time.Now(),
	}
}

// Acquire waits to acquire the specified number of tokens
func (rl *RateLimiter) Acquire(ctx context.Context, tokens int) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		rl.mu.Lock()
		rl.refill()

		if rl.tokens >= float64(tokens) {
			rl.tokens -= float64(tokens)
			rl.mu.Unlock()
			return nil
		}
		rl.mu.Unlock()

		time.Sleep(rl.refillInterval)
	}
}

// TryAcquire attempts to acquire tokens without blocking
func (rl *RateLimiter) TryAcquire(tokens int) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	rl.refill()

	if rl.tokens >= float64(tokens) {
		rl.tokens -= float64(tokens)
		return true
	}

	return false
}

func (rl *RateLimiter) refill() {
	now := time.Now()
	timePassed := now.Sub(rl.lastRefill)
	intervalsElapsed := int(timePassed / rl.refillInterval)

	if intervalsElapsed > 0 {
		tokensToAdd := float64(intervalsElapsed) * rl.refillRate
		rl.tokens = math.Min(rl.maxTokens, rl.tokens+tokensToAdd)
		rl.lastRefill = now
	}
}

// GetAvailableTokens returns the current number of available tokens
func (rl *RateLimiter) GetAvailableTokens() int {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	rl.refill()
	return int(rl.tokens)
}
