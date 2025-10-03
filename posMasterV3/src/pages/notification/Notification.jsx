import React from 'react'
import notificationsImg from '../../assets/notifications.png'
import NotificationCard from '../../components/NotificationCard'

function Notification() {
  return (
    <div className="grid grid-rows-[auto_1fr] h-screen pl-16">
      {/* Header row full width */}
      <header className="p-8 pb-0">
        <h1 className="text-[36px] font-bold leading-[32px] text-[#A3A3A3] mb-2">Notifications</h1>
        <p className="text-[14px] text-[#525252] mt-4 max-w-3xl">
          Customize how the app works for you. Manage preferences such as notifications,
          themes, language, and other general behaviors to tailor the experience to your
          needs. Your settings are saved automatically and can be updated anytime.
        </p>
      </header>

      {/* Second row: notification list + divider + help panel */}
      <div className="grid grid-cols-[1fr_auto_480px] h-full">
        {/* Left: notification list */}
        <div className="p-8 pr-4 overflow-y-auto">
          <div className="space-y-2 notification-list">
            <NotificationCard title="System notification" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="Suppliers updated" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="local database got synced successfully" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="New updates available" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="User login success!" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
            <NotificationCard title="New version available" description="lorem ipsom lorem ipsom lorem ipsom lorem ipsom lorem ipsom" date="12.06 PM" onClose={() => { }} />
          </div>
        </div>

        {/* Divider (only spans this row, not header) */}
        <div className="w-px bg-gray-200" />

        {/* Right: help panel */}
        <aside className="flex items-center justify-center px-6">
          <div className="flex flex-col items-center justify-center w-full">
            <img src={notificationsImg} alt="Need help" className="w-24 h-24 mb-4" />
            <h3 className="text-lg font-bold text-black mb-2">NEED A HELP?</h3>
            <p className="text-xs text-[#989898] text-center mb-4">
              Got stuck or need guidance? The Need a Help? section is your go-to support hub.
              Access quick tutorials, FAQs, troubleshooting tips, and direct contact with our
              support team
            </p>

            <textarea
              placeholder="Let us know what's your emergency....."
              rows={6}
              className="w-full bg-[#EBEBEB] border border-gray-200 p-4 text-sm text-[#9E9E9E] resize-none shadow-sm"
            />

            <button className="mt-8 w-14 h-14 rounded-full bg-[#C7C7C7] flex items-center justify-center shadow">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <path d="M4 12l4 6 10-12" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}


export default Notification