
import React from 'react';
import { useAutoPalStore } from '../shared/store.ts';

const AdminPanel: React.FC = () => {
  const { user } = useAutoPalStore();

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-500">You do not have administrative privileges.</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: '1,240', trend: '+12%', color: 'blue' },
    { label: 'Premium Subs', value: '312', trend: '+5%', color: 'green' },
    { label: 'AI API Cost', value: '$12.40', trend: 'Budget: $70', color: 'orange' },
    { label: 'Active Alerts', value: '42', trend: 'Critical: 3', color: 'red' },
  ];

  return (
    <div className="animate-slide-in">
      <header className="mb-8">
        <h2 className="text-2xl font-bold">System Command Center</h2>
        <p className="text-gray-500">Operational oversight and user analytics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-100">
            <div className="text-sm font-medium text-gray-500 mb-1">{stat.label}</div>
            <div className="text-3xl font-bold mb-2">{stat.value}</div>
            <div className={`text-xs font-bold text-${stat.color}-600 uppercase`}>{stat.trend}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold">Recent User Activity</h3>
          <button className="text-sm text-blue-600 font-bold">View All</button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Tier</th>
              <th className="px-6 py-3">Last AI Query</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="hover:bg-gray-50 transition cursor-pointer">
                <td className="px-6 py-4 font-medium">user_00{i}@example.ng</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${i % 2 === 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {i % 2 === 0 ? 'PREMIUM' : 'FREE'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">"Squeaky brakes..." (2 mins ago)</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span>Active</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
