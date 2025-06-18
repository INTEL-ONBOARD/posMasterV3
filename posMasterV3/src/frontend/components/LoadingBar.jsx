import React from "react";
import SpinnerDot from "./SpinnerDot";

function LoadingBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-1">
      <div className="flex items-center gap-1 pl-24">
        <SpinnerDot />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}

export default LoadingBar;