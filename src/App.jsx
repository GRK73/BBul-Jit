import React, { useState, useEffect } from 'react';
import axios from 'axios';
import streamers from '../streamers.json';
import StarBorder from './components/StarBorder';

const DecoIcon = () => (
  <svg width="50" height="30" viewBox="0 0 81 30" fill="none" className="opacity-80">
    <path d="M0 16H63L68 5L73 25.5L79.5 16" stroke="white" strokeWidth="3"/>
  </svg>
);

const GlitteringLogo = ({ sizeClass = "text-[6rem] md:text-[10rem]" }) => (
  <div className="flex flex-col items-center justify-center font-planb">
    <h1 className={`stack select-none mb-0 ${sizeClass}`} style={{ "--stacks": 3 }}>
      <span style={{ "--index": 0 }}>PLAN.B</span>
      <span style={{ "--index": 1 }}>PLAN.B</span>
      <span style={{ "--index": 2 }}>PLAN.B</span>
    </h1>
    <div className="flex items-center w-full px-2 gap-6 -mt-4 md:-mt-8">
      <DecoIcon />
      <span className="flex-1 text-center font-bold tracking-[0.8em] text-xl md:text-3xl translate-x-[0.4em] text-white">
        MUSIC
      </span>
      <div className="scale-x-[-1]"><DecoIcon /></div>
    </div>
  </div>
);

const App = () => {
  const [liveStreamers, setLiveStreamers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const fetchWithSmartProxy = async (bjid) => {
    if (isLocal) {
      // 로컬: Vite Proxy + POST (가장 확실함)
      try {
        const liveRes = await axios.post(`/api-soop/afreeca/player_live_api.php?bjid=${bjid}`, 
          new URLSearchParams({ bid: bjid, type: 'live', player_type: 'html5' }), 
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        if (liveRes.data?.CHANNEL?.RESULT === 1) {
          const stationRes = await axios.get(`/api-ch/api/${bjid}/station`);
          return {
            id: bjid,
            nick: liveRes.data.CHANNEL.BJNICK,
            title: liveRes.data.CHANNEL.TITLE,
            viewer: stationRes.data?.broad?.visitor_cnt || "LIVE",
            thumb: `https://liveimg.sooplive.co.kr/m/${liveRes.data.CHANNEL.BNO}?v=${Date.now()}`
          };
        }
      } catch (e) { console.error(`Local error for ${bjid}:`, e); }
      return null;
    }

    // [배포] 다중 프록시 전략
    const liveUrl = `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${bjid}&bid=${bjid}&type=live&player_type=html5`;
    const proxies = [
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
    ];

    for (const getProxyUrl of proxies) {
      try {
        const res = await fetch(getProxyUrl(liveUrl));
        if (!res.ok) continue;
        const liveData = await res.json();
        
        if (liveData?.CHANNEL?.RESULT === 1) {
          const stationUrl = `https://chapi.sooplive.co.kr/api/${bjid}/station`;
          const sRes = await fetch(getProxyUrl(stationUrl));
          const sData = sRes.ok ? await sRes.json() : null;

          return {
            id: bjid,
            nick: liveData.CHANNEL.BJNICK,
            title: liveData.CHANNEL.TITLE,
            viewer: sData?.broad?.visitor_cnt || "LIVE",
            thumb: `https://liveimg.sooplive.co.kr/m/${liveData.CHANNEL.BNO}?v=${Date.now()}`
          };
        }
        break; // 결과가 1이 아니면 방송 안 켜진 것으로 판단
      } catch (e) { continue; }
    }
    return null;
  };

  const checkAllStatus = async () => {
    const allIds = Object.values(streamers).flat();
    const results = [];
    
    // 로컬은 병렬, 배포는 순차 청크
    if (isLocal) {
      const promises = allIds.map(id => fetchWithSmartProxy(id));
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter(r => r !== null));
    } else {
      const chunkSize = 3;
      for (let i = 0; i < allIds.length; i += chunkSize) {
        const chunk = allIds.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(id => fetchWithSmartProxy(id));
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.filter(r => r !== null));
        if (i + chunkSize < allIds.length) await new Promise(r => setTimeout(r, 300));
      }
    }

    setLiveStreamers(results);
    setLoading(false);
  };

  useEffect(() => {
    checkAllStatus();
    const interval = isLocal ? 30000 : 120000;
    const timer = setInterval(checkAllStatus, interval);
    return () => clearInterval(timer);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white font-planb">
      <div className="text-center">
        <div className="text-4xl animate-pulse mb-4 tracking-widest">PLAN.B</div>
        <div className="text-[10px] font-sans opacity-40 tracking-[0.5em] uppercase">Synchronizing...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-white selection:text-black">
      {liveStreamers.length === 0 ? (
        <div className="h-screen flex flex-col items-center justify-center scale-75 md:scale-100">
          <GlitteringLogo />
          <div className="mt-32 flex flex-col items-center gap-6">
            <div className="h-[1px] w-24 bg-white/20"></div>
            <p className="text-white tracking-[1.5em] text-xl md:text-2xl font-black animate-pulse uppercase translate-x-[0.7em]">
              Currently Offline
            </p>
            <div className="h-[1px] w-24 bg-white/20"></div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-8 md:p-16">
          <div className="flex flex-col md:flex-row justify-between items-center mb-24 gap-12 pb-16 border-b border-white/5">
            <div className="scale-50 md:scale-75 -ml-10">
              <GlitteringLogo sizeClass="text-[4rem] md:text-[6rem]" />
            </div>
            <div className="flex items-center gap-6 bg-white/5 border border-white/20 px-10 py-4 rounded-full backdrop-blur-md">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
              <span className="text-sm font-black tracking-[0.6em] text-white uppercase">Live Now</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
            {liveStreamers.map(streamer => (
              <StarBorder key={streamer.id} color="white" speed="10s" className="group w-full shadow-[0_20px_60px_rgba(0,0,0,1)]">
                <div className="bg-[#030303]">
                  <div className="aspect-video w-full bg-[#0a0a0a] overflow-hidden relative border-b border-white/5">
                    <img src={streamer.thumb} alt="live" className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000 ease-out" />
                  </div>
                  <div className="p-10">
                    <div className="flex justify-between items-end mb-6">
                      <h3 className="text-4xl font-black tracking-tighter font-planb">{streamer.nick}</h3>
                    </div>
                    <div className="h-[1px] w-12 bg-white/30 mb-8 group-hover:w-full transition-all duration-1000 ease-in-out"></div>
                    <div className="title-container mb-12 h-8 flex items-center">
                      <p className="title-text text-gray-400 text-sm font-medium italic opacity-80">"{streamer.title}"</p>
                    </div>
                    <a href={`https://play.sooplive.co.kr/${streamer.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full py-5 border border-white/10 bg-white/5 text-white/80 hover:bg-white hover:text-black font-black tracking-[0.2em] transition-all duration-500 rounded-2xl text-[10px] uppercase font-planb">
                      Connect Stream
                    </a>
                  </div>
                </div>
              </StarBorder>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
