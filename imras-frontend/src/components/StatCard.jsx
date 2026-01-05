const StatCard = ({ title, value, color = "blue" }) => {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <div
      className={`rounded-xl border shadow-sm p-6 transition hover:shadow-md ${colorMap[color]}`}
    >
      <p className="text-sm font-medium opacity-80">{title}</p>

      <p className="mt-2 text-3xl font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
};

export default StatCard;
