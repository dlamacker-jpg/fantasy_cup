export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-mk-blue/20 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-mk-blue rounded-full animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🏎️</span>
      </div>
      <p className="text-gray-400 font-body text-sm animate-pulse">{message}</p>
    </div>
  );
}
