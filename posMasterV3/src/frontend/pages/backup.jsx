<div className="pt-32 pb-4">
      <div
        className={`bg-gray-100 rounded-xl max-w-6xl mx-auto py-3 px-6 shadow text-center ${
          hoveredCard
          ? "blur-sm transition-all duration-300"
          : "transition-all duration-300"
        }`}
        >
        <h1 className="text-2xl font-bold">
          <span className="text-blue-600">POS</span>
          <span className="text-gray-900"> MASTER</span>
          <span className="text-gray-700">.3</span>
        </h1>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 transition-all duration-300">
      {/* Top Row - Store Info and Right Side Cards */}
<div className="flex gap-6 mb-6">
  {/* 1. Morawakkorale Outlet Card (large) */}
  <div style={{ width: "600px", height: "200px" }}>
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 h-full flex items-center gap-6 w-full"
      onClick={() => handleComponentClick("store-info")}
      style={{ cursor: "pointer", height: "100%" }}
      >
      <img
        src={Dashboard_Morawakle}
        alt="Morawakkorale Outlet"
        className="w-20 h-25 bg-green-600 rounded-xl shadow-sm object-cover"
        />
      <div>
        <h3 className="text-3xl text-gray-900 mb-2">Morawakkorale Outlet</h3>
        <p className="text-gray-500 text-xl">2025 - 05 - 23</p>
      </div>
    </div>
  </div>

  {/* 2. Settings Card */}
  <div
    style={{ width: "250px", height: "215px" }}
    className={`flex flex-col justify-between ${getBlurClass("settings")}`}
    onMouseEnter={() => setHoveredCard("settings")}
    onMouseLeave={() => setHoveredCard(null)}
  >
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center px-6 mb-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200"
      style={{ height: "100%" }}
      onClick={() => handleComponentClick("settings")}
      >
      <img
        src={Dashboard_settings}
        alt="Settings"
        className="w-16 h-16 bg-gray-100 rounded-lg object-contain"
        />
      <span className="text-xl font-semibold text-gray-900 mt-2">Settings</span>
    </div>
  </div>

  {/* 3. Notifications & Logout stacked vertically */}
  <div style={{ width: "250px", height: "200px" }} className="flex flex-col gap-4">
    {/* Notifications */}
    <div
      className={getBlurClass("notifications")}
      onMouseEnter={() => setHoveredCard("notifications")}
      onMouseLeave={() => setHoveredCard(null)}
      style={{ height: "50%" }}
      >
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 px-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 h-full"
        onClick={() => handleComponentClick("notifications")}
        >
        <img
          src={Dashboard_notification}
          alt="Notifications"
          className="w-10 h-10 bg-orange-100 rounded-lg object-contain"
          />
        <span className="text-xl font-semibold text-gray-900">Notifications</span>
      </div>
    </div>
    {/* Logout */}
    <div
      className={getBlurClass("logout")}
      onMouseEnter={() => setHoveredCard("logout")}
      onMouseLeave={() => setHoveredCard(null)}
      style={{ height: "50%" }}
      >
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 px-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 h-full"
        onClick={() => handleComponentClick("logout")}
        >
        <img
          src={Dashboard_logout}
          alt="Log out"
          className="w-10 h-10 bg-blue-100 rounded-lg object-contain"
          />
        <span className="text-xl font-semibold text-gray-900">Log out</span>
      </div>
    </div>
  </div>
</div>
        {/* Bottom Row - Inventory and Other Cards */}
        <div className="grid grid-cols-5 gap-6">
          {/* Inventory Card */}
          <div
            className={getBlurClass("inventory")}
            onMouseEnter={() => setHoveredCard("inventory")}
            onMouseLeave={() => setHoveredCard(null)}
            >
            <DashboardCard
              onClick={() => handleComponentClick("inventory")}
              
              image={Dashboard_inventory}
              title="INVENTORY"
              subtitle="245 ITEMS"
              verticalLayout={true}
              />
          </div>
          {/* Manage Users */}
          <div
            className={getBlurClass("manage-users")}
            onMouseEnter={() => setHoveredCard("manage-users")}
            onMouseLeave={() => setHoveredCard(null)}
            >
            <DashboardCard
              onClick={() => handleComponentClick("manage-users")}
              
              image={Dashboard_manageUsers}
              title="MANAGE USERS"
              subtitle="View sales"
              verticalLayout={true}
              />
          </div>
          {/* Dashboard Card */}
          <div
            className={getBlurClass("dashboard")}
            onMouseEnter={() => setHoveredCard("dashboard")}
            onMouseLeave={() => setHoveredCard(null)}
            >
            <DashboardCard
              onClick={() => handleComponentClick("dashboard")}
              
              image={Dashboard_card}
              title="DASHBOARD"
              subtitle="Overview of sales"
              verticalLayout={true}
              />
          </div>
          {/* Customers Card */}
          <div
            className={getBlurClass("customers")}
            onMouseEnter={() => setHoveredCard("customers")}
            onMouseLeave={() => setHoveredCard(null)}
            >
            <DashboardCard
              onClick={() => handleComponentClick("customers")}
              
              image={Dashboard_manageUsers}
              title="CUSTOMERS"
              subtitle="Customer list"
              verticalLayout={true}
              />
          </div>

          {/* View More Card */}
          <div
            className={getBlurClass("view-more")}
            onMouseEnter={() => setHoveredCard("view-more")}
            onMouseLeave={() => setHoveredCard(null)}
            >
            <DashboardCard
              onClick={() => handleComponentClick("view-more")}
              
              image={Dashboard_viewmore}
              fullImage={true}
              title="View More"
              />
          </div>
        </div>
      </div>

      {/* Bottom Loading Bar */}
      <LoadingBar />
    </div>