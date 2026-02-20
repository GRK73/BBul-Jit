import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const BounceCards = ({
  className = "",
  images = [],
  containerWidth = 500,
  containerHeight = 250,
  animationDelay = 1,
  animationStagger = 0.08,
  easeType = "elastic.out(1, 0.5)",
  transformStyles = [],
  enableHover = false
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const cards = containerRef.current.querySelectorAll('.bounce-card');
    
    gsap.fromTo(cards, 
      { scale: 0, opacity: 0 },
      { 
        scale: 1, 
        opacity: 1, 
        duration: 1.2, 
        delay: animationDelay, 
        stagger: animationStagger,
        ease: easeType 
      }
    );
  }, [animationDelay, animationStagger, easeType, images]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
    >
      {images.map((img, idx) => (
        <div 
          key={idx}
          className="bounce-card absolute w-32 h-32 rounded-lg border-2 border-white/20 overflow-hidden shadow-2xl transition-all duration-300"
          style={{ 
            transform: transformStyles[idx] || "none",
            zIndex: idx,
            backgroundColor: '#111'
          }}
        >
          <img src={img} alt={`card-${idx}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
        </div>
      ))}
    </div>
  );
};

export default BounceCards;
