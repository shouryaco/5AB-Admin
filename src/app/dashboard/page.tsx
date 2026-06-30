export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Operations Dashboard</h1>

        <p className="text-gray-500 mt-2">Live fleet operations overview</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-gray-500">Active Trips</h2>

          <p className="text-4xl font-bold mt-3">12</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-gray-500">Available Drivers</h2>

          <p className="text-4xl font-bold mt-3">18</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-gray-500">Upcoming Bookings</h2>

          <p className="text-4xl font-bold mt-3">34</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-gray-500">Revenue Today</h2>

          <p className="text-4xl font-bold mt-3">£2,840</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm h-[500px]">
        <h2 className="text-2xl font-bold mb-4">Dispatch Activity</h2>

        <div className="h-full border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400">
          Live dispatch board coming next
        </div>
      </div>
    </div>
  );
}
