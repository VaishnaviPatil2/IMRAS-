import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const StatCard = ({ 
  title, 
  value, 
  color = "blue", 
  icon, 
  chartData, 
  chartType = "doughnut",
  showChart = false 
}) => {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  };

  // Chart options for mini charts
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        bodyFont: {
          size: 10
        }
      }
    },
    scales: chartType === 'bar' ? {
      x: {
        display: false
      },
      y: {
        display: false,
        beginAtZero: true
      }
    } : undefined
  };

  return (
    <div
      className={`rounded-xl border shadow-sm p-6 transition hover:shadow-md ${colorMap[color]} relative overflow-hidden`}
    >
      {/* Background pattern for visual appeal */}
      {icon && (
        <div className="absolute top-0 right-0 opacity-10">
          <div className="text-6xl">{icon}</div>
        </div>
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {value}
            </p>
          </div>
          
          {/* Mini Chart */}
          {showChart && chartData && (
            <div className="w-16 h-16 ml-4">
              {chartType === 'doughnut' ? (
                <Doughnut data={chartData} options={chartOptions} />
              ) : (
                <Bar data={chartData} options={chartOptions} />
              )}
            </div>
          )}
        </div>
        
        {/* Status breakdown text */}
        {chartData && chartData.statusText && (
          <div className="mt-3 text-xs opacity-70">
            {chartData.statusText}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
