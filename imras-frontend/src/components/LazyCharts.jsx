import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const LazyCharts = ({ transferOrdersChart, poStatusChart, canSeePOs }) => {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Transfer Orders Chart */}
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
          <span className="mr-3">📊</span>
          Transfer Orders Overview
        </h3>
        <div className="h-64">
          <Doughnut 
            data={transferOrdersChart} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 20,
                    usePointStyle: true,
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Purchase Orders Chart (if applicable) */}
      {canSeePOs && poStatusChart && (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
            <span className="mr-3">📈</span>
            Purchase Orders Status
          </h3>
          <div className="h-64">
            <Doughnut 
              data={poStatusChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 20,
                      usePointStyle: true,
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyCharts;