'use client'

/**
 * Skeleton loading component for expense cards
 * Used while expenses are loading to improve perceived performance
 */

export function SkeletonExpenseCard() {
  return (
    <div
      className="glass-card animate-pulse"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
        padding: '1.5rem',
      }}
    >
      {/* Month Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
            }}
          />
          <div>
            <div
              style={{
                width: '120px',
                height: '18px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                marginBottom: '0.5rem',
              }}
            />
            <div
              style={{
                width: '80px',
                height: '14px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: '100px',
            height: '24px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      </div>

      {/* Category Breakdown Skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center gap-0.5rem">
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: '60%',
                    height: '12px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    marginBottom: '0.25rem',
                  }}
                />
                <div
                  style={{
                    width: '40%',
                    height: '14px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonExpenseList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonExpenseCard key={i} />
      ))}
    </div>
  )
}
