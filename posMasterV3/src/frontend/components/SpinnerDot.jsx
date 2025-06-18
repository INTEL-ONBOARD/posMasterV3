import React from "react";

function SpinnerDot({ className = "" }) {
  return (
    <span
      className={`inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin ${className}`}
      style={{ verticalAlign: "middle" }}
    ></span>
  );
}

export default SpinnerDot;