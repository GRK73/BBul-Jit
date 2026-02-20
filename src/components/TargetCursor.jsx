import React, { useEffect, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

const TargetCursor = ({ 
  spinDuration = 2, 
  hideDefaultCursor = true,
  parallaxOn = true,
  hoverDuration = 0.2
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 200 };
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);

  useEffect(() => {
    if (hideDefaultCursor) {
      document.body.style.cursor = "none";
      // 모든 버튼과 링크에도 커서 숨김 적용
      const style = document.createElement("style");
      style.innerHTML = `* { cursor: none !important; }`;
      document.head.appendChild(style);
    }

    const moveCursor = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleOver = (e) => {
      if (e.target.closest("a, button, .cursor-target")) setIsHovered(true);
    };
    const handleOut = () => setIsHovered(false);

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleOver);
    window.addEventListener("mouseout", handleOut);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mouseout", handleOut);
      document.body.style.cursor = "default";
    };
  }, [hideDefaultCursor]);

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center"
      style={{ x, y, translateX: "-50%", translateY: "-50%" }}
    >
      {/* 바깥쪽 회전 원 (타겟 조준선) */}
      <motion.div
        className="absolute border-2 border-white/30 rounded-full"
        animate={{ 
          rotate: 360,
          scale: isHovered ? 1.5 : 1,
          width: isHovered ? 60 : 40,
          height: isHovered ? 60 : 40,
          borderColor: isHovered ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"
        }}
        transition={{ 
          rotate: { duration: spinDuration, repeat: Infinity, ease: "linear" },
          scale: { duration: hoverDuration }
        }}
      >
        {/* 십자선 포인트 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-2 bg-white/50"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-2 bg-white/50"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-2 bg-white/50"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[2px] w-2 bg-white/50"></div>
      </motion.div>

      {/* 중앙 점 */}
      <motion.div 
        className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"
        animate={{ scale: isHovered ? 0.5 : 1 }}
      />
    </motion.div>
  );
};

export default TargetCursor;
