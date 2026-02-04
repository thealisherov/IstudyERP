import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { reportsApi } from '../api/reports.api';
import { FiUsers, FiUserCheck, FiCreditCard, FiTrendingUp, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 daqiqa cache
  });

  // Fetch current month's financial summary for profit
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: financialData, isLoading: loadingFinancial } = useQuery({
    queryKey: ['currentMonthFinancial', currentYear, currentMonth],
    queryFn: async () => {
      const response = await reportsApi.getFinancialSummary({
        year: currentYear,
        month: currentMonth,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = [
    {
      title: 'Jami O\'quvchilar',
      value: stats?.totalStudents || '0',
      icon: FiUsers,
      bgColor: 'from-blue-500 to-blue-600',
    },
    {
      title: 'O\'qituvchilar',
      value: stats?.totalTeachers || '0',
      icon: FiUserCheck,
      bgColor: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Oylik To\'lovlar',
      value: `${stats?.monthlyRevenue?.toLocaleString() || '0'} UZS`,
      icon: FiCreditCard,
      bgColor: 'from-green-500 to-green-600',
    },
    {
      title: 'Oylik Foyda',
      value: `${(financialData?.netProfit || 0)?.toLocaleString()} UZS`,
      icon: FiTrendingUp,
      bgColor: 'from-orange-500 to-orange-600',
    },
  ];

  const quickActions = [
    { label: 'Yangi O\'quvchi', path: '/students', icon: FiPlus },
    { label: 'Yangi Guruh', path: '/groups', icon: FiPlus },
    { label: 'To\'lov Qabul Qilish', path: '/payments', icon: FiCreditCard },
    { label: 'Hisobot Ko\'rish', path: '/reports', icon: FiTrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Tizim ko'rsatkichlari</p>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {loading || loadingFinancial ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 animate-pulse"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="h-3 sm:h-4 bg-gray-200 rounded w-20 mb-2 sm:mb-3"></div>
                      <div className="h-6 sm:h-8 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-lg sm:rounded-xl flex-shrink-0"></div>
                  </div>
                </div>
              ))
            ) : (
              statCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all p-4 sm:p-6 group cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">{card.title}</p>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 break-words">
                          {card.value}
                        </h3>
                      </div>
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${card.bgColor} rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              Tez Harakatlar
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="cursor-pointer p-3 sm:p-4 lg:p-6 border-2 border-gray-200 rounded-lg sm:rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-center group active:scale-95"
                >
                  <action.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-blue-600 group-hover:scale-110 transition-transform" />
                  <p className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2">{action.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
