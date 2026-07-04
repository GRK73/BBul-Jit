import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import streamers from '../streamers.json';
import StarBorder from './components/StarBorder';
import ElectricBorder from './components/ElectricBorder';
import { streamerConfig } from './streamerConfig';

const CATEGORY_OPTIONS = [
  { key: 'Plan-B', label: '플랜비' },
  { key: 'BIP', label: 'BIP' },
  { key: 'Generation 1', label: '1기' },
  { key: 'Generation 2', label: '2기' },
  { key: 'Generation 3', label: '3기' },
  { key: 'Others', label: '기타' }
];

const streamerCategoryById = Object.entries(streamers).reduce((acc, [category, ids]) => {
  ids.forEach(id => {
    acc[id] = category;
  });
  return acc;
}, {});

const DecoIcon = React.memo(() => (
  <svg width="40" height="24" viewBox="0 0 81 30" fill="none" className="opacity-80 md:w-[50px] md:h-[30px]">
    <path d="M0 16H63L68 5L73 25.5L79.5 16" stroke="white" strokeWidth="3"/>
  </svg>
));

const GlitteringLogo = React.memo(({ sizeClass = "text-[4rem] md:text-[10rem]" }) => (
  <div className="flex flex-col items-center justify-center font-planb">
    <h1 className={`stack select-none mb-0 ${sizeClass}`} style={{ "--stacks": 3 }}>
      <span style={{ "--index": 0 }}>PLAN.B</span>
      <span style={{ "--index": 1 }}>PLAN.B</span>
      <span style={{ "--index": 2 }}>PLAN.B</span>
    </h1>
    <div className="flex items-center w-full px-2 gap-3 md:gap-6 -mt-2 md:-mt-8">
      <DecoIcon />
      <span className="flex-1 text-center font-bold tracking-[0.5em] md:tracking-[0.8em] text-sm md:text-3xl translate-x-[0.2em] md:translate-x-[0.4em] text-white">
        MUSIC
      </span>
      <div className="scale-x-[-1]"><DecoIcon /></div>
    </div>
  </div>
));

const CategoryFilter = React.memo(({ isOpen, selectedCategories, onToggleMenu, onToggleCategory }) => (
  <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex flex-col items-start gap-3">
    <button
      type="button"
      onClick={onToggleMenu}
      aria-label="카테고리 메뉴"
      aria-expanded={isOpen}
      className="flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-2xl backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-black"
    >
      <span className="flex h-4 w-5 flex-col justify-between" aria-hidden="true">
        <span className="h-[2px] w-full rounded-full bg-current"></span>
        <span className="h-[2px] w-full rounded-full bg-current"></span>
        <span className="h-[2px] w-full rounded-full bg-current"></span>
      </span>
    </button>

    <div
      aria-hidden={!isOpen}
      className={`w-36 md:w-44 rounded-2xl border border-transparent bg-transparent p-2 shadow-none backdrop-blur-none transform-gpu transition-all duration-500 ease-out ${
        isOpen
          ? 'translate-x-0 opacity-100'
          : '-translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none'
      }`}
    >
      <div className="grid gap-1.5">
        {CATEGORY_OPTIONS.map(category => {
          const selected = selectedCategories.includes(category.key);
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => onToggleCategory(category.key)}
              aria-pressed={selected}
              tabIndex={isOpen ? 0 : -1}
              className={`flex h-9 items-center justify-between rounded-xl border px-3 text-xs md:text-sm font-black transition-all duration-300 ${
                selected
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 bg-white/5 text-white/55 hover:border-white/30 hover:text-white'
              }`}
            >
              <span>{category.label}</span>
              <span className={`h-2 w-2 rounded-full ${selected ? 'bg-black' : 'bg-white/25'}`}></span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
));

const normalizeImageUrl = (url) => {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
};

const StreamerCard = React.memo(({ streamer }) => {
  const isOvertime = streamer.isLive && streamer.duration >= 21600; // 6 hours
  const cardContent = (
    <div className="bg-[#030303]">
      <div className="aspect-video w-full bg-[#0a0a0a] overflow-hidden relative border-b border-white/5">
        {streamer.thumb ? (
          <img
            src={streamer.thumb}
            alt={streamer.isLive ? 'live' : 'offline'}
            className={`w-full h-full transition-all duration-1000 ease-out ${
              streamer.isLive
                ? 'object-cover grayscale group-hover:grayscale-0 group-hover:scale-110'
                : 'object-contain p-6 opacity-70 grayscale'
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/20 font-planb text-xl md:text-3xl">
            PLAN.B
          </div>
        )}
        {!streamer.isLive && (
          <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[9px] md:text-[10px] font-black tracking-[0.25em] text-white/50">
            OFFLINE
          </span>
        )}
      </div>
      <div className="p-4 md:p-10">
        <div className="mb-2 md:mb-6 flex min-w-0 items-baseline justify-between gap-2 overflow-hidden">
          <h3 className="min-w-0 flex-1 truncate text-lg md:text-4xl font-black tracking-tighter font-planb">{streamer.nick}</h3>
          <span className="text-[10px] md:text-sm text-white/40 font-bold whitespace-nowrap flex-shrink-0">{streamer.category}</span>
        </div>
        <div className={`h-[1px] w-8 md:w-12 mb-3 md:mb-8 transition-all duration-1000 ease-in-out ${
          streamer.isLive ? 'bg-white/30 group-hover:w-full' : 'bg-white/10'
        }`}></div>
        <div className="title-container mb-4 md:mb-12 h-5 md:h-8 flex items-center">
          <p className="title-text text-gray-400 text-[10px] md:text-sm font-medium italic opacity-80">
            "{streamer.isLive ? streamer.title : 'Offline'}"
          </p>
        </div>
        <a
          href={streamer.isLive ? `https://play.sooplive.co.kr/${streamer.id}` : `https://www.sooplive.co.kr/station/${streamer.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center w-full py-3 md:py-5 border border-white/10 bg-white/5 text-white/80 hover:bg-white hover:text-black font-black tracking-[0.1em] md:tracking-[0.2em] transition-all duration-500 rounded-lg md:rounded-2xl text-[8px] md:text-[10px] uppercase font-planb"
        >
          {streamer.isLive ? 'Connect' : 'Station'}
        </a>
      </div>
    </div>
  );

  if (!streamer.isLive) {
    return (
      <div className="group w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#030303] shadow-2xl">
        {cardContent}
      </div>
    );
  }

  if (isOvertime) {
    return (
      <div className="relative p-2">
        <ElectricBorder
          color="#7df9ff"
          speed={1}
          chaos={0.12}
          className="group w-full shadow-2xl"
          borderRadius={32}
        >
          <div className="h-full rounded-[inherit] overflow-hidden bg-[#030303]">
            {cardContent}
          </div>
        </ElectricBorder>
      </div>
    );
  }

  return (
    <StarBorder
      color="white"
      speed="10s"
      className="group w-full shadow-2xl"
    >
      {cardContent}
    </StarBorder>
  );
});

const App = () => {
  const [streamerStatuses, setStreamerStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllStreamers, setShowAllStreamers] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(() => CATEGORY_OPTIONS.map(category => category.key));

  const checkAllStatus = async () => {
    const allIds = Object.values(streamers).flat();
    const checkPromises = allIds.map(async (bjid) => {
      try {
        const res = await axios.post(`/api-soop/afreeca/player_live_api.php?bjid=${bjid}`, 
          new URLSearchParams({ bid: bjid, type: 'live', player_type: 'html5' }), 
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const info = streamerConfig[bjid] || {};
        if (res.data?.CHANNEL?.RESULT === 1) {
          const sRes = await axios.get(`/api-ch/api/${bjid}/station`);
          return {
            id: bjid,
            isLive: true,
            categoryKey: streamerCategoryById[bjid] || 'Others',
            nick: info.name || res.data.CHANNEL.BJNICK,
            category: info.category || "",
            title: res.data.CHANNEL.TITLE,
            viewer: sRes.data?.broad?.visitor_cnt || "LIVE",
            duration: res.data.CHANNEL.BTIME || 0,
            thumb: `https://liveimg.sooplive.co.kr/m/${res.data.CHANNEL.BNO}?v=${Date.now()}`
          };
        }
        const stationRes = await axios.get(`/api-ch/api/${bjid}/station`);
        return {
          id: bjid,
          isLive: false,
          categoryKey: streamerCategoryById[bjid] || 'Others',
          nick: info.name || stationRes.data?.station?.user_nick || bjid,
          category: info.category || "",
          title: "",
          viewer: "OFFLINE",
          duration: 0,
          thumb: normalizeImageUrl(stationRes.data?.profile_image)
        };
      } catch (e) { console.error(e); }
      const info = streamerConfig[bjid] || {};
      return {
        id: bjid,
        isLive: false,
        categoryKey: streamerCategoryById[bjid] || 'Others',
        nick: info.name || bjid,
        category: info.category || "",
        title: "",
        viewer: "OFFLINE",
        duration: 0,
        thumb: ""
      };
    });
    const results = await Promise.all(checkPromises);
    setStreamerStatuses(results.filter(r => r !== null));
    setLoading(false);
  };

  useEffect(() => {
    checkAllStatus();
    const timer = setInterval(checkAllStatus, 60000);
    return () => clearInterval(timer);
  }, []);

  const liveStreamers = useMemo(() => {
    return streamerStatuses.filter(streamer => streamer.isLive);
  }, [streamerStatuses]);

  const displayedStreamers = useMemo(() => {
    return streamerStatuses.filter(streamer => (
      selectedCategories.includes(streamer.categoryKey) &&
      (showAllStreamers || streamer.isLive)
    ));
  }, [streamerStatuses, selectedCategories, showAllStreamers]);

  const showAllFromOffline = useCallback(() => {
    setShowAllStreamers(true);
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setShowAllStreamers(showAll => !showAll);
  }, []);

  const toggleCategory = useCallback(categoryKey => {
    setSelectedCategories(current => (
      current.includes(categoryKey)
        ? current.filter(key => key !== categoryKey)
        : [...current, categoryKey]
    ));
  }, []);

  const toggleCategoryMenu = useCallback(() => {
    setCategoryMenuOpen(open => !open);
  }, []);

  const categoryFilter = (
    <CategoryFilter
      isOpen={categoryMenuOpen}
      selectedCategories={selectedCategories}
      onToggleMenu={toggleCategoryMenu}
      onToggleCategory={toggleCategory}
    />
  );

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white font-planb">
      {categoryFilter}
      <div className="text-2xl md:text-4xl animate-pulse tracking-widest text-white">PLAN.B</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-white selection:text-black">
      {categoryFilter}
      {liveStreamers.length === 0 && !showAllStreamers ? (
        // [OFFLINE MODE]
        <div className="h-screen flex flex-col items-center justify-center px-6">
          <div className="scale-90 md:scale-100">
            <GlitteringLogo />
          </div>
          <div className="mt-20 md:mt-32 flex flex-col items-center gap-6">
            <div className="h-[1px] w-16 md:w-24 bg-white/20"></div>
            <button
              type="button"
              onClick={showAllFromOffline}
              className="text-white tracking-[1em] md:tracking-[1.5em] text-lg md:text-2xl font-black animate-pulse uppercase text-center leading-relaxed transition-opacity hover:opacity-70"
            >
              Currently<br className="md:hidden" /> Offline
            </button>
            <div className="h-[1px] w-16 md:w-24 bg-white/20"></div>
          </div>
        </div>
      ) : (
        // [LIVE MODE]
        <div className="max-w-7xl mx-auto p-4 md:p-16">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 md:mb-24 gap-8 md:gap-12 pb-8 md:pb-16 border-b border-white/5 text-center md:text-left">
            <div className="scale-75 md:scale-75 origin-center md:origin-left">
              <GlitteringLogo sizeClass="text-[4rem] md:text-[6rem]" />
            </div>
            <button
              type="button"
              onClick={toggleDisplayMode}
              aria-pressed={showAllStreamers}
              className="flex items-center gap-4 md:gap-6 bg-white/5 border border-white/20 px-6 md:px-10 py-3 md:py-4 rounded-full backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-black"
            >
              {!showAllStreamers && (
                <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-red-600 rounded-full animate-ping"></span>
              )}
              <span className="text-xs md:text-sm font-black tracking-[0.4em] md:tracking-[0.6em] uppercase">
                {showAllStreamers ? 'All' : 'Live Now'}
              </span>
            </button>
          </div>
          
          {/* 모바일에서 grid-cols-2 적용 */}
          {displayedStreamers.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center">
              <div className="h-[1px] w-16 md:w-24 bg-white/20"></div>
              <p className="text-white/70 tracking-[0.4em] md:tracking-[0.8em] text-sm md:text-lg font-black uppercase leading-relaxed">
                {showAllStreamers ? 'No Selected Categories' : 'Selected'}<br className="md:hidden" /> {showAllStreamers ? 'Visible' : 'Categories Offline'}
              </p>
              <div className="h-[1px] w-16 md:w-24 bg-white/20"></div>
            </div>
          ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-14">
            {displayedStreamers.map(streamer => (
              <StreamerCard key={streamer.id} streamer={streamer} />
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
