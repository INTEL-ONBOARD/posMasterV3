import React from 'react'
import { useState } from 'react'
import notificationsImg from '../../assets/notifications.png'
import notificationsSubmitImg from '../../assets/notifications_submitted.png'
import NotificationCard from '../../components/NotificationCard'

function Notification() {
  const [text, setText] = useState("");
  const [buttonActive, setButtonActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showTextarea, setShowTextarea] = useState(true);
  const [showButton, setShowButton] = useState(true);
  const [currentImg, setCurrentImg] = useState(notificationsImg);
  const [fade, setFade] = useState(true);

  const handleChange = (e) => {
    const msg = e.target.value;
    setText(msg);
    setButtonActive(msg.trim().length > 0);
  };

  const handleSubmit = () => {
    if (!buttonActive || submitting) return;

    setSubmitting(true);
    setFade(false);

    setTimeout(() => {
      setShowTextarea(false);
      setShowButton(false);
      setSubmitted(true);

      const randomSuccess = Math.random() < 0.5;
      setSuccess(randomSuccess);
      setCurrentImg(randomSuccess ? notificationsSubmitImg : notificationsImg);
      setFade(true);

      setTimeout(() => {
        setShowTextarea(true);
        setText("");
        setButtonActive(false);
        setSubmitted(false);
        setCurrentImg(notificationsImg);
        setSubmitting(false);
        setShowButton(true);
      }, 2000);
    }, 300);
  };

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
            <img src={currentImg} alt="Need help" className="w-24 h-24 mb-4 transition-all duration-500" />
            <h3 className={`text-lg font-bold text-black mb-2
              ${fade ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ease-in-out`}>
              {submitted ? success ? "Submitted!" : "Submission Failed..." : "Need a Help?"}
            </h3>
            <p className={`text-xs text-[#989898] text-center mb-4
              ${fade ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ease-in-out`}>
              {submitted ? success ? "Thank you." : "Please try again" : "Got stuck or need guidance? The Need a Help? section is your go-to support hub. Access quick tutorials, FAQs, troubleshooting tips, and direct contact with our support team"}
            </p>

            {showTextarea && (
              <textarea
                placeholder="Let us know what's your emergency....."
                rows={6}
                className={`w-full bg-[#EBEBEB] border border-gray-200 p-4 text-sm text-[#9E9E9E] resize-none shadow-sm
                  ${fade ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ease-in-out`}
                value={text}
                onChange={handleChange}
              />
            )}

            {showButton && (
              <button
                disabled={!buttonActive || submitting}
                onClick={handleSubmit}
                className={`mt-8 w-14 h-14 rounded-full flex items-center justify-center shadow
              ${buttonActive && !submitting ? "bg-[#17841E]" : "bg-[#C7C7C7]"} transition-colors duration-300 ease-in-out`}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 12l4 6 10-12" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

          </div>
        </aside>
      </div>
    </div>
  )
}


export default Notification