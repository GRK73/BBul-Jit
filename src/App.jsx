import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import streamers from '../streamers.json';
import StarBorder from './components/StarBorder';
import ElectricBorder from './components/ElectricBorder';
import { streamerConfig } from './streamerConfig';
import { isChzzkId, liveUrl, channelUrl } from '../lib/platform';

const CATEGORY_OPTIONS = [
  { key: 'Plan-B', label: '플랜비' },
  { key: 'BIP', label: 'BIP' },
  { key: 'Generation 1', label: '1기' },
  { key: 'Generation 2', label: '2기' },
  { key: 'Generation 3', label: '3기' },
  { key: 'Generation 4', label: '4기' },
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

// 최애 고정은 보는 사람 브라우저에만 저장한다. 저장소가 막힌 환경(시크릿 모드 등)에서는 조용히 무시.
const PINNED_KEY = 'planb:pinned';

const readPinnedIds = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PINNED_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(id => id in streamerOrderById) : [];
  } catch {
    return [];
  }
};

const savePinnedIds = ids => {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
  } catch {
    /* 저장이 안 돼도 이번 방문 동안은 고정이 유지된다 */
  }
};

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
  // 메뉴를 닫아도 이 상자는 목록 크기만큼 남아 있으므로, 상자 자체는 클릭을 통과시키고
  // 버튼과 열린 목록만 클릭을 받는다. 안 그러면 아래 카드의 ☆·Connect가 안 눌린다.
  <div className="pointer-events-none fixed top-4 left-4 md:top-6 md:left-6 z-50 flex flex-col items-start gap-3">
    <button
      type="button"
      onClick={onToggleMenu}
      aria-label="카테고리 메뉴"
      aria-expanded={isOpen}
      className="pointer-events-auto flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-2xl backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-black"
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
          ? 'pointer-events-auto translate-x-0 opacity-100'
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

// ★/☆ 글자는 글꼴 기준선 때문에 원 안에서 아래로 처져 보여서 SVG로 그린다.
const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true">
    <path
      d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const ThumbChip = ({ className = '', children }) => (
  <span className={`absolute rounded-full border border-white/10 bg-black/70 px-2 py-0.5 md:px-2.5 md:py-1 text-[9px] md:text-[11px] font-black text-white/85 backdrop-blur-sm ${className}`}>
    {children}
  </span>
);

const StreamerCard = React.memo(({ streamer, postsState, onLoadPosts, isPinned, onTogglePin }) => {
  const [postsVisible, setPostsVisible] = useState(false);
  const isOvertime = streamer.isLive && streamer.duration >= 21600; // 6 hours
  const cardImage = streamer.isLive ? streamer.thumb : streamer.replay?.thumb || streamer.thumb;
  const cardTitle = streamer.isLive ? streamer.title : streamer.replay?.title || 'Recent replay unavailable';
  const cardHref = streamer.isLive
    ? liveUrl(streamer.id)
    : streamer.replay?.url || channelUrl(streamer.id);
  const buttonLabel = 'Connect';
  // 치지직은 게시글 목록 API를 아직 못 찾아서 오프라인 게시글 미리보기를 숲만 지원한다.
  const hasPosts = !isChzzkId(streamer.id);
  const showPosts = () => {
    if (!streamer.isLive && hasPosts) {
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
          {/* 왼쪽 위는 상태(시청자 수 / OFFLINE), 오른쪽 위는 고정 버튼 */}
          {!streamer.isLive && (
            <span className="absolute left-2 top-2 md:left-3 md:top-3 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[9px] md:text-[10px] font-black tracking-[0.25em] text-white/50">
              OFFLINE
            </span>
          )}
          {streamer.isLive && typeof streamer.viewer === 'number' && (
            <ThumbChip className="left-2 top-2 md:left-3 md:top-3">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-600 align-middle" aria-hidden="true"></span>
              {streamer.viewer.toLocaleString()}명
            </ThumbChip>
          )}
        </div>
        {/* 오프라인 게시글 오버레이(z-20) 위에 떠야 호버 중에도 누를 수 있다 */}
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onTogglePin(streamer.id);
          }}
          aria-pressed={isPinned}
          aria-label={isPinned ? `${streamer.nick} 고정 해제` : `${streamer.nick} 맨 앞에 고정`}
          title={isPinned ? '고정 해제' : '맨 앞에 고정'}
          className={`absolute right-2 top-2 md:right-3 md:top-3 z-30 flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-300 ${
            isPinned
              ? 'border-white bg-white text-black'
              : 'border-white/15 bg-black/60 text-white/60 hover:border-white/50 hover:text-white'
          }`}
        >
          <StarIcon filled={isPinned} />
        </button>
        <div className="px-4 pb-3 pt-4 md:px-10 md:pb-6 md:pt-10">
          <div className="mb-2 md:mb-6 flex min-w-0 items-baseline justify-between gap-2 overflow-hidden">
            <h3 className="min-w-0 flex-1 truncate text-lg md:text-4xl font-black tracking-tighter font-planb">{streamer.nick}</h3>
            <span className="text-[10px] md:text-sm text-white/40 font-bold whitespace-nowrap flex-shrink-0">
              {streamer.category}{isChzzkId(streamer.id) && ' · CHZZK'}
            </span>
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
        {!streamer.isLive && hasPosts && <OfflinePostOverlay postsState={postsState} isVisible={postsVisible} />}
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
  const [pinnedIds, setPinnedIds] = useState(readPinnedIds);

  const togglePin = useCallback(id => {
    setPinnedIds(current => {
      const next = current.includes(id) ? current.filter(pinned => pinned !== id) : [...current, id];
      savePinnedIds(next);
      return next;
    });
  }, []);

  // 자주 바뀌는 값(/api/status)과 잘 안 바뀌는 값(/api/profiles)을 분리해서 받는다.
  // status는 1분, profiles는 10분 주기. 둘 다 요청 1회씩이라 스트리머가 늘어도 부담이 없다.
  const profilesRef = React.useRef({});

  const merge = useCallback((list, profiles) => {
    const cacheBust = Date.now();
    return list.map(s => {
      const info = streamerConfig[s.id] || {};
      const prof = profiles[s.id] || {};
      return {
        ...s,
        nick: info.name || s.nick || prof.nick || s.id,
        category: info.category || "",
        replay: prof.replay || null,
        // 라이브 썸네일만 매번 새로 받는다(응답 캐시는 살려야 하므로 여기서 붙인다).
        thumb: s.isLive && s.thumb ? `${s.thumb}?v=${cacheBust}` : prof.thumb || ''
      };
    });
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await axios.get('/api/profiles', { timeout: 20000 });
      profilesRef.current = res.data?.profiles || {};
      setStreamerStatuses(current =>
        current.length ? merge(current, profilesRef.current) : current
      );
    } catch (e) {
      console.error(e);
    }
  }, [merge]);

  const checkAllStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/status', { timeout: 15000 });
      const list = res.data?.streamers || [];
      if (list.length) setStreamerStatuses(merge(list, profilesRef.current));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [merge]);

  useEffect(() => {
    loadProfiles();
    checkAllStatus();

    // 백그라운드 탭에서는 폴링하지 않는다. 열어두고 잊은 탭이 요청을 계속 쓰는 걸 막는다.
    const statusTimer = setInterval(() => {
      if (!document.hidden) checkAllStatus();
    }, 60000);
    const profileTimer = setInterval(() => {
      if (!document.hidden) loadProfiles();
    }, 600000);

    // 탭으로 돌아오면 즉시 갱신해서 오래된 화면을 보여주지 않는다.
    const onVisibility = () => {
      if (!document.hidden) checkAllStatus();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(statusTimer);
      clearInterval(profileTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkAllStatus, loadProfiles]);

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
        // 고정한 멤버가 항상 맨 앞, 그다음 라이브 우선(All 모드), 그다음 명단 순서
        const aPinned = pinnedIds.includes(a.id);
        if (aPinned !== pinnedIds.includes(b.id)) return aPinned ? -1 : 1;
        if (showAllStreamers && a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return (streamerOrderById[a.id] ?? 0) - (streamerOrderById[b.id] ?? 0);
      });
  }, [streamerStatuses, selectedCategories, showAllStreamers, pinnedIds]);

  // 게시판 조회도 서버로 옮긴다. 메뉴 수만큼 나가던 요청이 1회가 되고,
  // 응답은 엣지에서 5분간 캐시되므로 같은 스트리머를 여러 명이 열어도 원본은 한 번만 간다.
  const loadOfflinePosts = useCallback(async (streamer) => {
    if (!streamer || streamer.isLive) return;

    let alreadyHandled = false;
    setOfflinePostsById(current => {
      const status = current[streamer.id]?.status;
      if (status === 'loading' || status === 'loaded') {
        alreadyHandled = true;
        return current;
      }
      return { ...current, [streamer.id]: { status: 'loading', items: [] } };
    });
    if (alreadyHandled) return;

    try {
      const res = await axios.get('/api/posts', {
        params: { id: streamer.id },
        timeout: 10000
      });

      if (res.data?.failed) throw new Error('Failed to fetch posts');

      setOfflinePostsById(current => ({
        ...current,
        [streamer.id]: {
          status: 'loaded',
          items: (res.data?.posts || []).slice(0, 5).map(post => ({
            id: post.titleNo,
            title: post.title,
            content: post.title,
            url: post.url,
            regDate: post.regDate
          }))
        }
      }));
    } catch (e) {
      console.error(e);
      setOfflinePostsById(current => ({
        ...current,
        [streamer.id]: { status: 'error', items: [] }
      }));
    }
  }, []);

  const showAllFromOffline = useCallback(() => {
    setShowAllStreamers(true);
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setShowAllStreamers(showAll => !showAll);
  }, []);

  // 로고를 누르면 지금 방송 중인 멤버 중 한 명을 골라 새 탭으로 연다 (카테고리 필터와 무관).
  const openRandomLive = useCallback(() => {
    if (liveStreamers.length === 0) return;
    const pick = liveStreamers[Math.floor(Math.random() * liveStreamers.length)];
    window.open(liveUrl(pick.id), '_blank', 'noopener,noreferrer');
  }, [liveStreamers]);

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
            <button
              type="button"
              onClick={openRandomLive}
              disabled={liveStreamers.length === 0}
              aria-label="방송 중인 멤버 중 랜덤으로 보기"
              title="랜덤 라이브 보기"
              className="scale-75 md:scale-75 origin-center md:origin-left text-white transition-opacity duration-300 hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
            >
              <GlitteringLogo sizeClass="text-[4rem] md:text-[6rem]" />
            </button>
            <button
              type="button"
              onClick={toggleDisplayMode}
              aria-pressed={showAllStreamers}
              aria-label={showAllStreamers ? 'Show live streamers' : 'Show all streamers'}
              className="relative flex h-[52px] w-44 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5 px-6 backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-black md:h-[58px] md:w-60"
            >
              <span className={`absolute inline-flex items-center justify-center gap-3 text-xs md:text-sm font-black tracking-[0.4em] md:tracking-[0.6em] uppercase transition-all duration-500 ${
                showAllStreamers ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
              }`}>
                <span className="h-2 w-2 rounded-full bg-red-600 animate-ping md:h-2.5 md:w-2.5" aria-hidden="true"></span>
                <span>Live Now</span>
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
                isPinned={pinnedIds.includes(streamer.id)}
                onTogglePin={togglePin}
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
