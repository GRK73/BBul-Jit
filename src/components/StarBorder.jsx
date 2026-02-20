import React from "react";

const StarBorder = ({
  as: Component = "div",
  className = "",
  color = "white",
  speed = "6s",
  children,
  ...rest
}) => {
  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-[2rem] p-[1px] ${className}`}
      {...rest}
    >
      {/* 기본 회색 테두리 레이어 */}
      <div className="absolute inset-0 rounded-[2rem] border border-white/10 z-0"></div>
      
      {/* 회전하는 빛 레이어 */}
      <div
        className="absolute inset-[-1000%] animate-[spin_linear_infinite] z-10"
        style={{
          animationDuration: speed,
          background: `conic-gradient(from 0deg, transparent 0%, transparent 40%, ${color} 50%, transparent 60%, transparent 100%)`,
        }}
      />
      
      {/* 내부 콘텐츠 레이어 */}
      <div className="relative z-20 h-full w-full rounded-[1.95rem] bg-black text-white overflow-hidden">
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
