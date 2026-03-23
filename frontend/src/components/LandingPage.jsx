import React from 'react';
import brandLogo from '../assets/logo/logo1.jpeg';

/**
 * Landing page shown before login.
 * Animation spec:
 * - Primary logo starts centered
 * - Slowly zooms out + fades away
 * - Reveals the "CogniCampus" brand underneath (lighten up)
 */
const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="lc-landing min-h-screen flex items-center justify-center bg-[#0a0a0c] overflow-hidden font-sans px-4">
      <div className="w-full max-w-5xl flex flex-col items-center justify-center text-center">
        <div className="lc-logoStack relative w-[360px] h-[360px] md:w-[420px] md:h-[420px]">
          <img
            src={brandLogo}
            alt="CogniCampus primary logo"
            className="lc-primaryLogo opacity-100"
          />

          <div className="lc-brandLogo" aria-hidden="true">
            <img src={brandLogo} alt="CogniCampus icon" className="lc-brandIcon" />
            <div className="lc-brandText">CogniCampus</div>
          </div>
        </div>

        <div className="lc-landingContent mt-10 max-w-2xl">
          <h1 className="lc-title">Attendance planning that actually keeps up.</h1>
          <p className="lc-subtitle">
            CogniCampus helps you track classes, account for holidays/exams, and visualize your progress—so you always know
            what’s coming next.
          </p>

          <button
            type="button"
            onClick={() => onGetStarted?.()}
            className="lc-cta"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;