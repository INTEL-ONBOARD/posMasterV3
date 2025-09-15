import React from 'react'
import notificationsImg from '../../assets/notifications.png'
import NotificationCard from '../../components/NotificationCard'

function Notification() {
  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-700">Notifications</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl">Customize how the app works for you. Manage preferences such as notifications, themes, language, and other general behaviors to tailor the experience to your needs. Your settings are saved automatically and can be updated anytime.</p>
      </header>

      <div className="flex gap-8">
        {/* Left: notification list */}
        <div className="flex-1 pr-4">
          <div className="space-y-4 notification-list">
            <NotificationCard title="System notification" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="Suppliers updated" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="local database got synced successfully" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="New updates available" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="User login success!" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="New version available" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-200" />

        {/* Right: help panel */}
        <aside className="w-[360px] flex flex-col items-center px-6">
          <img src={notificationsImg} alt="Need help" className="w-24 h-24 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">NEED A HELP?</h3>
          <p className="text-sm text-gray-500 text-center mb-4">Got stuck or need guidance? The Need a Help? section is your go-to support hub. Access quick tutorials, FAQs, troubleshooting tips, and direct contact with our support team</p>

          <textarea
            placeholder="Let us know what's your emergency....."
            rows={6}
            className="w-full bg-white border border-gray-200 p-4 text-sm text-gray-700 resize-none shadow-sm"
          />

          <button className="mt-8 w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center shadow">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </aside>
      </div>
    </div>
  )
}

export default Notification