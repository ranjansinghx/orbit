"use client";

/** Base shimmer block — compose into layout-specific skeletons below. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface2 rounded-md ${className}`} />;
}

export function TextPostSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-4 border-b border-line">
      <SkeletonBlock className="w-[42px] h-[42px] rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2 pt-0.5">
        <SkeletonBlock className="h-3.5 w-40" />
        <SkeletonBlock className="h-3.5 w-full" />
        <SkeletonBlock className="h-3.5 w-2/3" />
        <div className="flex gap-6 mt-2">
          <SkeletonBlock className="h-3 w-10" />
          <SkeletonBlock className="h-3 w-10" />
          <SkeletonBlock className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

export function TextFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <TextPostSkeleton key={i} />
      ))}
    </div>
  );
}

export function ForYouSkeleton() {
  return (
    <div className="h-[100dvh] w-full bg-surface flex flex-col justify-end p-4 gap-3">
      <SkeletonBlock className="h-3.5 w-32" />
      <SkeletonBlock className="h-3.5 w-56" />
      <SkeletonBlock className="h-3.5 w-40" />
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="px-4 pt-5">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="w-20 h-20 rounded-full shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-full mt-4" />
      <SkeletonBlock className="h-3 w-2/3 mt-2" />
      <div className="flex gap-5 mt-4">
        <SkeletonBlock className="h-3 w-14" />
        <SkeletonBlock className="h-3 w-14" />
        <SkeletonBlock className="h-3 w-14" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className="aspect-square rounded-none" />
      ))}
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <SkeletonBlock className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2 pt-0.5">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-3 w-4/5" />
      </div>
    </div>
  );
}
