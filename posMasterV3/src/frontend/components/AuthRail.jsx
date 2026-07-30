import { motion as Motion } from "framer-motion";

/**
 * Editorial rail shared by the splash (Intro) and login screens. Purely
 * presentational — carries no auth/session logic — so both screens stay
 * visually consistent without duplicating this markup.
 */
export default function AuthRail() {
  return (
    <div
      className="relative hidden lg:flex flex-col justify-between overflow-hidden px-12 py-14 xl:px-16"
      style={{
        background: "linear-gradient(165deg, #1A318C 0%, #0f1c5c 100%)",
        flex: "0 0 42%",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 12% 100%, rgba(123,155,224,0.28), transparent 70%)",
        }}
      />

      <Motion.div
        className="relative flex items-center gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "rgba(255,255,255,0.14)" }}
        >
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-[14.5px] font-semibold tracking-tight text-white">POS Master</span>
      </Motion.div>

      <Motion.div
        className="relative max-w-[30ch]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <p
          className="mb-4 font-medium text-white"
          style={{
            fontFamily: 'Charter, "Iowan Old Style", Georgia, serif',
            fontSize: "clamp(24px, 2.2vw, 32px)",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          Every leaf weighed, every sale accounted for.
        </p>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.62)" }}>
          Sri Lanka Tea Cooperative
        </p>
      </Motion.div>

      <Motion.p
        className="relative text-[11.5px] tracking-wide"
        style={{ color: "rgba(255,255,255,0.45)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        © 2025 SLTC ® · v{import.meta.env.VITE_VERSION_NUMBER}
      </Motion.p>
    </div>
  );
}
