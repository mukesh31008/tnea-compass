import { Skeleton } from "@/components/ui/skeleton";

export default function CollegesLoading() {
  return (
    <div className="container-page py-10">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-10 w-96 max-w-full" />
      <Skeleton className="mt-3 h-4 w-[32rem] max-w-full" />
      <Skeleton className="mt-8 h-36 w-full rounded-xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
