// Reusable skeleton primitives for loading states.

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonCircle({ size = 32, className = '' }) {
  return <Skeleton className={`rounded-full flex-shrink-0 ${className}`} style={{ width: size, height: size }} />;
}

export function SkeletonText({ lines = 1, className = '', lastWidth = '60%' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 rounded"
          style={{ width: i === lines - 1 && lines > 1 ? lastWidth : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonButton({ className = '', width = 110 }) {
  return <Skeleton className={`h-9 rounded-md ${className}`} style={{ width }} />;
}

export function SkeletonCard({ className = '' }) {
  return <div className={`ws-card p-4 ${className}`}><Skeleton className="h-4 w-1/2 rounded" /></div>;
}
