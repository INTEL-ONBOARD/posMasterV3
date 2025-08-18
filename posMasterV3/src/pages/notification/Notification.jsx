import React from 'react'
import notificationsImg from '../../assets/notifications.png'
import NotificationCard from '../../components/NotificationCard'

function Notification() {
  return (
    //  items-center justify-center
    <div className="flex flex-col h-screen p-12">
      {/* header section */}
      <h2>Notifications</h2>
      <p>Customize how the app works for you. Manage preferences such as notifications, themes, language, and other general behaviors to tailor the experience to your needs. Your settings are saved automatically and can be updated anytime.</p>
      {/* notifications section */}
      <div className='flex flex-row h-[calc(100vw-60rem)] bg-black'>
        {/* scrollable notifications list section(left) */}
        <div className="lg:w-2/3 mb-4 h-[calc(100vw-60rem)] overflow-scroll">
          {/* notifications card */}
          <NotificationCard
            title="New message"
            description="You have a new message from Alice."
            date="Aug 12, 2025"
            onClose={() => console.log('close clicked')}
          />
                    <NotificationCard
            title="New message"
            description="You have a new message from Alice."
            date="Aug 12, 2025"
            onClose={() => console.log('close clicked')}
          />
                    <NotificationCard
            title="New message"
            description="You have a new message from Alice."
            date="Aug 12, 2025"
            onClose={() => console.log('close clicked')}
          />
                    <NotificationCard
            title="New message"
            description="You have a new message from Alice."
            date="Aug 12, 2025"
            onClose={() => console.log('close clicked')}
          />
        </div>
        {/* notifications form section (right) */}
        <div className="lg:w-1/3 px-16 text-lg items-center bg-red-300 flex flex-col justify-center">
          <img
            src={notificationsImg}
            alt="Notifications"
            className="max-w-36 h-36"
          />
          <p>Got stuck or need guidance? The Need a Help? section is your go-to support hub. Access quick tutorials, FAQs, troubleshooting tips, and direct contact with our support team</p>
          <textarea
          value=""
          //onChange=
          placeholder="Enter you message here..."
          rows={3}
          className="px-3 py-2 w-full bg-white border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <button>
          <svg width={60} height={60} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* green circle */}
            <circle cx="12" cy="12" r="10" fill="#22C55E" />
            {/* white check */}
            <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Notification