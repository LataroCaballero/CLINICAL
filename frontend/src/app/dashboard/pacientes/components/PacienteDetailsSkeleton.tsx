export default function PacienteDetailsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-300" />
        <div className="space-y-2">
          <div className="w-40 h-4 bg-gray-300 rounded" />
          <div className="w-32 h-3 bg-gray-300 rounded" />
          <div className="w-28 h-3 bg-gray-300 rounded" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="w-32 h-4 bg-gray-300 rounded" />
            <div className="w-full h-3 bg-gray-200 rounded" />
            <div className="w-3/4 h-3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
