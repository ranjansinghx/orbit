import Link from "next/link";
import OrbitMark from "@/components/OrbitMark";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <OrbitMark size={40} spin />
      <h1 className="font-display italic text-2xl mt-4">Lost orbit</h1>
      <p className="text-muted text-sm mt-2 mb-6">This page drifted out of range.</p>
      <Link href="/" className="bg-paper text-ink font-semibold rounded-full px-6 py-2.5">
        Back to Orbit
      </Link>
    </div>
  );
}
