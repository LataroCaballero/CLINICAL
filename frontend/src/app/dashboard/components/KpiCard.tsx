interface KpiProps {
    title: string;
    value: string;
    change: string;
    subtitle: string;
  }
  
  export default function KpiCard({ title, value, change, subtitle }: KpiProps) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm text-gray-500">{title}</h3>
        <div className="flex items-end justify-between mt-2">
          <p className="text-2xl font-semibold">{value}</p>
          <span className="text-xs text-green-600 font-medium">{change}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    );
  }
  