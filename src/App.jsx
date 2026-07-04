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

const ALL_STREAMER_IDS = Object.values(streamers).flat();
const streamerOrderById = ALL_STREAMER_IDS.reduce((acc, id, index) => {
  acc[id] = index;
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

const stripHtml = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ')
  .trim();

const summarizeText = (post) => {
  const content = post.content || {};
  return [
    content.textContent,
    content.summary,
    stripHtml(content.content || '')
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

const getPostUrl = (bjid, titleNo) => (
  titleNo
    ? `https://www.sooplive.co.kr/station/${bjid}/post/${titleNo}`
    : `https://www.sooplive.co.kr/station/${bjid}`
);

const formatPostPreview = (post, bjid) => ({
  id: post.titleNo,
  title: post.titleName || '제목 없음',
  content: summarizeText(post) || '내용 없음',
  url: getPostUrl(bjid, post.titleNo)
});

const fetchLatestVod = async (bjid) => {
  const vodRes = await axios.get(`/api-ch/api/${bjid}/vods?page=1`);
  const latestVod = vodRes.data?.data?.[0];
  if (!latestVod?.title_no) return null;

  return {
    titleNo: latestVod.title_no,
    title: latestVod.title_name || 'Recent VOD',
    thumb: normalizeImageUrl(latestVod.ucc?.thumb),
    url: `https://vod.sooplive.co.kr/player/${latestVod.title_no}`
  };
};

const OfflinePostOverlay = React.memo(({ postsState, isVisible }) => {
  const posts = postsState?.items || [];
  const failed = postsState?.status === 'error';
  const loading = !postsState || postsState.status === 'loading';

  return (
    <div className={`offline-post-overlay absolute inset-0 z-20 flex flex-col overflow-hidden bg-black px-3 py-4 transition-opacity duration-500 ease-out md:px-5 md:py-5 ${
      isVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
    }`}>
      <div className="text-center">
        <div className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/45">
          Recent Posts
        </div>
        {loading && (
          <p className="mt-3 text-[10px] md:text-xs font-bold text-white/70">게시글 불러오는중...</p>
        )}
        {failed && (
          <p className="mt-3 text-[10px] md:text-xs font-bold text-white/70">게시글 가져오기 실패</p>
        )}
        {!loading && !failed && posts.length === 0 && (
          <p className="mt-3 text-[10px] md:text-xs font-bold text-white/55">최근 게시글 없음</p>
        )}
      </div>
      {!loading && !failed && posts.length > 0 && (
        <div className="mt-3 grid min-h-0 gap-1.5 overflow-hidden md:mt-4">
          {posts.map((post, index) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="block min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-2 opacity-0 transition-colors duration-300 hover:border-white/40 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/60"
              style={{
                animation: 'postOverlayItem 520ms ease-out forwards',
                animationDelay: `${80 + index * 90}ms`
              }}
            >
              <p className="truncate text-[9px] md:text-[11px] font-black leading-tight text-white">{post.title}</p>
              <p
                className="mt-0.5 overflow-hidden text-[8px] md:text-[10px] leading-tight text-white/55"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {post.content}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
});

const StreamerCard = React.memo(({ streamer, postsState, onLoadPosts }) => {
  const [postsVisible, setPostsVisible] = useState(false);
  const isOvertime = streamer.isLive && streamer.duration >= 21600; // 6 hours
  const cardImage = streamer.isLive ? streamer.thumb : streamer.replay?.thumb || streamer.thumb;
  const cardTitle = streamer.isLive ? streamer.title : streamer.replay?.title || 'Recent replay unavailable';
  const cardHref = streamer.isLive
    ? `https://play.sooplive.co.kr/${streamer.id}`
    : streamer.replay?.url || `https://www.sooplive.co.kr/station/${streamer.id}`;
  const buttonLabel = 'Connect';
  const showPosts = () => {
    if (!streamer.isLive) {
      setPostsVisible(true);
      onLoadPosts(streamer);
    }
  };
  const hidePosts = () => {
    if (!streamer.isLive) setPostsVisible(false);
  };
  const blurPosts = event => {
    if (!event.currentTarget.contains(event.relatedTarget)) hidePosts();
  };

  const cardContent = (
    <div className="relative bg-[#030303]">
      <div
        className="relative focus:outline-none"
        tabIndex={!streamer.isLive ? 0 : undefined}
        onMouseEnter={showPosts}
        onMouseLeave={hidePosts}
        onPointerEnter={showPosts}
        onClick={showPosts}
        onFocusCapture={showPosts}
        onBlur={blurPosts}
      >
        <div className="aspect-video w-full bg-[#0a0a0a] overflow-hidden relative border-b border-white/5">
          {cardImage ? (
            <img
              src={cardImage}
              alt={streamer.isLive ? 'live' : 'offline'}
              className={`w-full h-full transition-all duration-1000 ease-out ${
                streamer.isLive
                  ? 'object-cover grayscale group-hover:grayscale-0 group-hover:scale-110'
                  : 'object-cover opacity-70 grayscale group-hover:scale-105'
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
        <div className="px-4 pb-3 pt-4 md:px-10 md:pb-6 md:pt-10">
          <div className="mb-2 md:mb-6 flex min-w-0 items-baseline justify-between gap-2 overflow-hidden">
            <h3 className="min-w-0 flex-1 truncate text-lg md:text-4xl font-black tracking-tighter font-planb">{streamer.nick}</h3>
            <span className="text-[10px] md:text-sm text-white/40 font-bold whitespace-nowrap flex-shrink-0">{streamer.category}</span>
          </div>
          <div className={`h-[1px] w-8 md:w-12 mb-3 md:mb-8 transition-all duration-1000 ease-in-out ${
            streamer.isLive ? 'bg-white/30 group-hover:w-full' : 'bg-white/10'
          }`}></div>
          <div className="title-container h-5 md:h-8 flex items-center">
            <p className="title-text text-gray-400 text-[10px] md:text-sm font-medium italic opacity-80">
              "{cardTitle}"
            </p>
          </div>
        </div>
        {!streamer.isLive && <OfflinePostOverlay postsState={postsState} isVisible={postsVisible} />}
      </div>
      <div className="relative z-30 px-4 pb-4 pt-1 md:px-10 md:pb-10 md:pt-4">
        <a
          href={cardHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center w-full py-3 md:py-5 border border-white/10 bg-white/5 text-white/80 hover:bg-white hover:text-black font-black tracking-[0.1em] md:tracking-[0.2em] transition-all duration-500 rounded-lg md:rounded-2xl text-[8px] md:text-[10px] uppercase font-planb"
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  );

  if (!streamer.isLive) {
    return (
      <div className="group w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#030303] shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1">
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
  const [offlinePostsById, setOfflinePostsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAllStreamers, setShowAllStreamers] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(() => CATEGORY_OPTIONS.map(category => category.key));

  const checkAllStatus = async () => {
    const checkPromises = ALL_STREAMER_IDS.map(async (bjid) => {
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
        let replay = null;
        try {
          replay = await fetchLatestVod(bjid);
        } catch (e) {
          console.error(e);
        }
        return {
          id: bjid,
          isLive: false,
          categoryKey: streamerCategoryById[bjid] || 'Others',
          nick: info.name || stationRes.data?.station?.user_nick || bjid,
          category: info.category || "",
          title: "",
          viewer: "OFFLINE",
          duration: 0,
          thumb: normalizeImageUrl(stationRes.data?.profile_image),
          replay,
          stationMenus: stationRes.data?.station?.menus || []
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
        thumb: "",
        replay: null,
        stationMenus: []
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
    return streamerStatuses
      .filter(streamer => (
        selectedCategories.includes(streamer.categoryKey) &&
        (showAllStreamers || streamer.isLive)
      ))
      .sort((a, b) => {
        if (showAllStreamers && a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return (streamerOrderById[a.id] ?? 0) - (streamerOrderById[b.id] ?? 0);
      });
  }, [streamerStatuses, selectedCategories, showAllStreamers]);

  const loadOfflinePosts = useCallback(async (streamer) => {
    if (!streamer || streamer.isLive) return;
    const currentState = offlinePostsById[streamer.id]?.status;
    if (currentState === 'loading' || currentState === 'loaded') return;

    setOfflinePostsById(current => ({
      ...current,
      [streamer.id]: { status: 'loading', items: [] }
    }));

    try {
      const menus = (streamer.stationMenus || [])
        .filter(menu => Number(menu.display_type) === 104 && menu.bbs_no);
      const collected = [];
      const seenPostIds = new Set();

      const boardResults = await Promise.all(menus.map(async menu => {
        try {
          const boardRes = await axios.get(`/api-channel/v1.1/channel/${streamer.id}/board`, {
            params: {
              bbsNo: menu.bbs_no,
              page: 1,
              perPage: 20
            },
            timeout: 6000
          });
          return { failed: false, posts: boardRes.data?.contents || boardRes.data?.data || [] };
        } catch (e) {
          console.error(e);
          return { failed: true, posts: [] };
        }
      }));

      boardResults.forEach(result => {
        result.posts.forEach(post => {
          if (post.userId !== streamer.id || seenPostIds.has(post.titleNo)) return;
          seenPostIds.add(post.titleNo);
          collected.push({
            ...formatPostPreview(post, streamer.id),
            regDate: post.regDate || ''
          });
        });
      });

      const requestCount = boardResults.length;
      const failureCount = boardResults.filter(result => result.failed).length;

      if (requestCount > 0 && failureCount === requestCount) {
        throw new Error('Failed to fetch posts');
      }

      setOfflinePostsById(current => ({
        ...current,
        [streamer.id]: {
          status: 'loaded',
          items: collected
            .sort((a, b) => new Date(b.regDate) - new Date(a.regDate))
            .slice(0, 5)
        }
      }));
    } catch (e) {
      console.error(e);
      setOfflinePostsById(current => ({
        ...current,
        [streamer.id]: { status: 'error', items: [] }
      }));
    }
  }, [offlinePostsById]);

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
              aria-label={showAllStreamers ? 'Show live streamers' : 'Show all streamers'}
              className="relative flex h-[52px] w-44 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5 px-6 backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-black md:h-[58px] md:w-60"
            >
              <span
                className={`absolute left-6 h-2 w-2 rounded-full bg-red-600 transition-opacity duration-500 md:left-8 md:h-2.5 md:w-2.5 ${
                  showAllStreamers ? 'opacity-0' : 'opacity-100 animate-ping'
                }`}
              ></span>
              <span className={`absolute text-xs md:text-sm font-black tracking-[0.4em] md:tracking-[0.6em] uppercase transition-all duration-500 ${
                showAllStreamers ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
              }`}>
                Live Now
              </span>
              <span className={`absolute text-xs md:text-sm font-black tracking-[0.6em] md:tracking-[0.8em] uppercase transition-all duration-500 ${
                showAllStreamers ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}>
                All
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
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-14 transition-all duration-500 ease-out">
            {displayedStreamers.map(streamer => (
              <StreamerCard
                key={streamer.id}
                streamer={streamer}
                postsState={offlinePostsById[streamer.id]}
                onLoadPosts={loadOfflinePosts}
              />
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
