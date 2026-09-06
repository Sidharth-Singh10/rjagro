import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full text-center">
        <p className="text-sm font-medium text-green-600">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Page not found</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 active:scale-[0.98]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
