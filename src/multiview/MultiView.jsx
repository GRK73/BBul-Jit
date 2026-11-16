import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MEMBERS } from '../../lib/roster';
import { isChzzkId, liveUrl } from '../../lib/platform';
import { createExtensionBridge, loginStateFromReport } from './extension';

const MAX_SLOTS = 4;
const AREAS = ['a', 'b', 'c', 'd'];
const SOOP_ID = /^[a-z0-9_]{3,20}$/i;
const PREF_KEY = 'planb:multiview';
// 숲 플레이어가 PC의 SOOP Streamer(고화질 스트리머)에 붙을 수 있게 로컬 네트워크 권한을 넘긴다.
const IFRAME_ALLOW = 'autoplay; fullscreen; encrypted-media; picture-in-picture; loopback-network; local-network';

const LAYOUTS = [
  { key: 'grid', label: '분할' },
  { key: 'focus', label: '큰 화면 + 아래' },
  { key: 'side', label: '큰 화면 + 옆' },
  { key: 'row', label: '가로 한 줄' }
];

const CHAT_MODES = [
  { key: 'single', label: '오른쪽 하나' },
  { key: 'each', label: '영상마다' },
  { key: 'off', label: '끄기' }
];

const playerUrl = id => `https://play.sooplive.com/${encodeURIComponent(id)}/embed`;
const pageUrl = id => `https://play.sooplive.com/${encodeURIComponent(id)}`;
// 채팅 대상 쪽 방송 페이지는 영상이 한 번 더 재생되므로, 자동재생 권한을 주지 않아 소리가 겹치지 않게 한다.
const IFRAME_ALLOW_NO_AUTOPLAY = 'encrypted-media; loopback-network; local-network';

// 숲 채팅 전용 주소(?vtype=chat)는 플레이어 창이 띄운 팝업에서만 메시지를 받는다(window.opener.liveView를 읽는다).
// 그래서 iframe으로는 비어 있다. 대신 방송 페이지를 데스크톱 크기로 띄우고 필요한 부분만 잘라서 보여 준다.
// 아래 좌표는 1920×1080에서 잰 값이다(크롬 157, 2026-11-16). 숲 화면 배치가 바뀌면 다시 재야 한다.
const SOOP_PAGE = { width: 1920, height: 1080 };
const CROP = {
  playerAndChat: { x: 16, y: 66, w: 1882, h: 830 }, // 플레이어 + 오른쪽 채팅
  chat: { x: 1494, y: 66, w: 402, h: 830 } // 채팅 칸만
};
const nameOf = (id, stream) => MEMBERS[id]?.name || stream?.nick || id;
const canEmbed = id => SOOP_ID.test(id) && !isChzzkId(id);

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  } catch {
    return {};
  }
}

function readInitialState() {
  const params = new URLSearchParams(location.search);
  const prefs = readPrefs();
  const ids = [...new Set((params.get('ids') || '').split(',').map(s => s.trim()).filter(canEmbed))].slice(0, MAX_SLOTS);
  const layout = [params.get('layout'), prefs.layout].find(v => LAYOUTS.some(l => l.key === v)) || 'grid';
  const chat = [params.get('chat'), prefs.chat].find(v => CHAT_MODES.some(c => c.key === v)) || 'single';
  return { ids, layout, chat, chatId: params.get('chatId') || '' };
}

// 지금 방송 상태. 메인 페이지와 같은 /api/status를 1분마다(탭이 보일 때만) 받는다.
function useLiveStreams() {
  const [state, setState] = useState({ streams: [], loaded: false, updatedAt: 0 });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (alive) setState({ streams: data.streamers || [], loaded: true, updatedAt: data.updatedAt || Date.now() });
      } catch (error) {
        console.error(error);
        if (alive) setState(current => ({ ...current, loaded: true }));
      }
    };
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 60000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return state;
}

// 고화질 스트리머(로컬 네트워크) 권한. 'local-network-access'로 조회하면 옛 크롬이 죽을 수 있어 새 이름만 쓴다.
function useLoopbackPermission() {
  const [state, setState] = useState('unknown');
  useEffect(() => {
    let status;
    const onChange = () => setState(status.state);
    (async () => {
      try {
        status = await navigator.permissions.query({ name: 'loopback-network' });
        setState(status.state);
        status.addEventListener('change', onChange);
      } catch {
        setState('unknown');
      }
    })();
    return () => status?.removeEventListener('change', onChange);
  }, []);
  return state;
}

const LayoutIcon = ({ kind }) => {
  const box = (x, y, w, h, key) => <rect key={key} x={x} y={y} width={w} height={h} rx="1" fill="currentColor" />;
  const shapes = {
    grid: [box(1, 1, 8, 5, 1), box(11, 1, 8, 5, 2), box(1, 8, 8, 5, 3), box(11, 8, 8, 5, 4)],
    focus: [box(1, 1, 18, 8, 1), box(1, 10.5, 5.3, 2.5, 2), box(7.35, 10.5, 5.3, 2.5, 3), box(13.7, 10.5, 5.3, 2.5, 4)],
    side: [box(1, 1, 13, 12, 1), box(15, 1, 4, 3.6, 2), box(15, 5.2, 4, 3.6, 3), box(15, 9.4, 4, 3.6, 4)],
    row: [box(1, 4, 3.8, 6, 1), box(5.7, 4, 3.8, 6, 2), box(10.4, 4, 3.8, 6, 3), box(15.1, 4, 3.8, 6, 4)]
  };
  return (
    <svg viewBox="0 0 20 14" className="h-3.5 w-5" aria-hidden="true">
      {shapes[kind]}
    </svg>
  );
};

function Segmented({ label, options, value, onChange, withIcons = false }) {
  return (
    <div role="group" aria-label={label} className="flex items-center overflow-hidden rounded-lg border border-white/15">
      {options.map(option => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          title={option.label}
          onClick={() => onChange(option.key)}
          className={`flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-bold transition-colors ${
            value === option.key ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          {withIcons && <LayoutIcon kind={option.key} />}
          <span className={withIcons ? 'hidden xl:inline' : ''}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function LoginChip({ state, onRetry }) {
  const chip = (cls, text, title) => (
    <span title={title} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${cls}`}>
      {text}
    </span>
  );
  if (state === 'checking') return chip('bg-white/10 text-white/60', '로그인 확인 중…');
  if (state === 'ready') return chip('bg-emerald-900/70 text-emerald-300', '숲 로그인 연결됨', '멀티뷰 안의 숲 플레이어가 내 계정으로 로그인돼 있어요.');
  if (state === 'none')
    return chip('bg-white/10 text-white/60', '비로그인 시청', '멀티뷰 로그인 도우미 확장을 설치하면 로그인 상태로 볼 수 있어요.');
  return (
    <span className="flex items-center gap-1.5">
      {state === 'loggedOut'
        ? chip('bg-amber-900/70 text-amber-200', '숲 로그인 필요', '숲(sooplive.com)에 로그인한 뒤 다시 연결을 눌러 주세요.')
        : chip('bg-red-900/70 text-red-200', '로그인 연결 오류')}
      {state === 'loggedOut' && (
        <a
          href="https://www.sooplive.com/"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-bold text-white/70 underline underline-offset-2 hover:text-white"
        >
          숲 열기
        </a>
      )}
      <button type="button" onClick={onRetry} className="text-[11px] font-bold text-white/70 underline underline-offset-2 hover:text-white">
        다시 연결
      </button>
    </span>
  );
}

// 방송 페이지를 1920×1080으로 띄운 뒤 region 부분만 칸 크기에 맞춰 보여 준다(비율 유지, 남는 곳은 검게).
function SoopPageCrop({ id, region, title, allow }) {
  const boxRef = useRef(null);
  const [fit, setFit] = useState(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = box;
      if (!w || !h) return;
      const scale = Math.min(w / region.w, h / region.h);
      setFit({
        scale,
        // 잘라 낼 창(region 크기)을 칸 가운데에 두고, 그 바깥은 감춘다
        frameLeft: (w - region.w * scale) / 2,
        frameTop: (h - region.h * scale) / 2,
        frameWidth: region.w * scale,
        frameHeight: region.h * scale
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [region]);

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden bg-black">
      {fit && (
        <div
          className="absolute overflow-hidden"
          style={{ left: fit.frameLeft, top: fit.frameTop, width: fit.frameWidth, height: fit.frameHeight }}
        >
          <iframe
            title={title}
            src={pageUrl(id)}
            allow={allow}
            className="absolute border-0"
            style={{
              width: SOOP_PAGE.width,
              height: SOOP_PAGE.height,
              left: -region.x * fit.scale,
              top: -region.y * fit.scale,
              transformOrigin: '0 0',
              scale: String(fit.scale)
            }}
          />
        </div>
      )}
    </div>
  );
}

const IconButton = ({ label, onClick, children, disabled = false, pressed }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={pressed}
    disabled={disabled}
    onClick={onClick}
    className={`flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-[11px] font-bold transition-colors disabled:opacity-25 ${
      pressed ? 'bg-white text-black' : 'text-white/70 hover:bg-white/15 hover:text-white'
    }`}
  >
    {children}
  </button>
);

function Tile({ id, index, count, stream, layout, chatMode, isChatTarget, reloadToken, actions }) {
  const name = nameOf(id, stream);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[10px] border border-white/10 bg-[#050505]">
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-white/10 bg-black px-1.5 text-[12px]">
        <span
          draggable
          onDragStart={event => actions.dragStart(event, { kind: 'tile', id })}
          onDragEnd={actions.dragEnd}
          title="끌어서 다른 칸과 자리 바꾸기"
          className="cursor-grab select-none rounded px-1 text-white/50 hover:bg-white/10 hover:text-white active:cursor-grabbing"
          aria-hidden="true"
        >
          ⠿
        </span>
        <span className="font-black text-white/40">{index + 1}</span>
        <span className="truncate font-bold">{name}</span>
        {stream && !stream.isLive && <span className="text-[10px] font-black tracking-widest text-white/40">OFFLINE</span>}
        {typeof stream?.viewer === 'number' && (
          <span className="shrink-0 text-[11px] text-white/45">{stream.viewer.toLocaleString()}명</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <IconButton label={`${name} 앞 칸으로`} disabled={index === 0} onClick={() => actions.move(id, -1)}>
            ←
          </IconButton>
          <IconButton label={`${name} 뒤 칸으로`} disabled={index === count - 1} onClick={() => actions.move(id, 1)}>
            →
          </IconButton>
          {layout !== 'grid' && layout !== 'row' && index > 0 && (
            <IconButton label={`${name} 큰 화면으로`} onClick={() => actions.makeMain(id)}>
              크게
            </IconButton>
          )}
          {chatMode === 'single' && (
            <IconButton label={`${name} 채팅 보기`} pressed={isChatTarget} onClick={() => actions.showChat(id)}>
              채팅
            </IconButton>
          )}
          <IconButton label={`${name} 닫기`} onClick={() => actions.remove(id)}>
            ✕
          </IconButton>
        </span>
      </div>
      <div className="relative min-h-0 flex-1 bg-black">
        {chatMode === 'each' ? (
          // 영상마다 채팅: 숲 방송 페이지에서 플레이어 + 채팅 부분을 잘라 보여 준다(채팅 입력도 된다)
          <SoopPageCrop key={`page-${reloadToken}`} id={id} region={CROP.playerAndChat} title={`${name} 방송과 채팅`} allow={IFRAME_ALLOW} />
        ) : (
          <iframe
            key={`player-${reloadToken}`}
            title={`${name} 방송`}
            src={playerUrl(id)}
            allow={IFRAME_ALLOW}
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
}

function LiveList({ streams, loaded, updatedAt, slots, onAdd, onRemove, dragStart, dragEnd }) {
  const live = streams
    .filter(s => s.isLive && MEMBERS[s.id])
    .sort((a, b) => MEMBERS[a.id].order - MEMBERS[b.id].order);
  const full = slots.length >= MAX_SLOTS;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-3 pb-2 pt-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">Live Now</h2>
        <span className="text-[11px] text-white/40">{live.length}명</span>
      </div>
      <p className="px-3 pb-2 text-[11px] leading-snug text-white/40">가운데로 끌어다 놓거나 + 를 눌러 추가 (최대 {MAX_SLOTS}개)</p>
      {!loaded && <p className="px-3 text-[12px] text-white/50">불러오는 중…</p>}
      {loaded && live.length === 0 && <p className="px-3 text-[12px] text-white/50">지금 방송 중인 멤버가 없어요.</p>}
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 pb-3">
        {live.map(stream => {
          const member = MEMBERS[stream.id];
          const embeddable = canEmbed(stream.id);
          const inView = slots.includes(stream.id);
          return (
            <li key={stream.id} className="flex items-stretch gap-1">
              <div
                draggable={embeddable}
                onDragStart={event => dragStart(event, { kind: 'list', id: stream.id })}
                onDragEnd={dragEnd}
                className={`flex min-w-0 flex-1 gap-2 rounded-lg border p-1.5 transition-colors ${
                  inView ? 'border-white/50 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/30'
                } ${embeddable ? 'cursor-grab active:cursor-grabbing' : 'opacity-60'}`}
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-white/5">
                  {stream.thumb && (
                    <img
                      src={`${stream.thumb}?t=${updatedAt}`}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {typeof stream.viewer === 'number' && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/75 px-1 text-[10px] font-bold">
                      <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-red-600 align-middle" aria-hidden="true"></span>
                      {stream.viewer.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-[13px] font-black">
                    <span className="truncate">{member.name}</span>
                    {inView && <span className="shrink-0 rounded bg-white px-1 text-[9px] font-black text-black">보는 중</span>}
                  </p>
                  <p className="line-clamp-2 text-[11px] leading-snug text-white/50">{stream.title}</p>
                  {!embeddable && <p className="text-[10px] text-white/40">치지직은 멀티뷰에 넣을 수 없어요</p>}
                </div>
              </div>
              {embeddable ? (
                <button
                  type="button"
                  onClick={() => (inView ? onRemove(stream.id) : onAdd(stream.id))}
                  disabled={!inView && full}
                  aria-label={inView ? `${member.name} 멀티뷰에서 빼기` : `${member.name} 멀티뷰에 추가`}
                  title={inView ? '빼기' : full ? `최대 ${MAX_SLOTS}개까지` : '추가'}
                  className="w-7 shrink-0 rounded-lg border border-white/10 text-[14px] font-black text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-white/70"
                >
                  {inView ? '−' : '+'}
                </button>
              ) : (
                <a
                  href={liveUrl(stream.id)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${member.name} 새 탭으로 보기`}
                  title="새 탭으로 보기"
                  className="flex w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[12px] text-white/70 hover:bg-white hover:text-black"
                >
                  ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MultiView() {
  const initial = useMemo(readInitialState, []);
  const [slots, setSlots] = useState(initial.ids);
  const [layout, setLayout] = useState(initial.layout);
  const [chatMode, setChatMode] = useState(initial.chat);
  const [chatId, setChatId] = useState(initial.chatId);
  const [listOpen, setListOpen] = useState(() => window.innerWidth >= 1024);
  const [drag, setDrag] = useState(null); // { kind: 'list' | 'tile', id }
  const [overCell, setOverCell] = useState(null);
  const [login, setLogin] = useState('checking');
  const [connected, setConnected] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const { streams, loaded, updatedAt } = useLiveStreams();
  const loopback = useLoopbackPermission();

  const streamsById = useMemo(() => Object.fromEntries(streams.map(s => [s.id, s])), [streams]);
  const activeChat = slots.includes(chatId) ? chatId : slots[0];

  // 채팅 대상은 한 번 정해지면 자리를 바꿔도 그 방송에 그대로 붙어 있게 한다(닫힌 경우에만 첫 칸으로 넘어간다).
  useEffect(() => {
    if (activeChat && activeChat !== chatId) setChatId(activeChat);
  }, [activeChat, chatId]);

  // ---- 로그인 도우미 확장 연결: 쿠키 사본을 만든 뒤에 플레이어를 띄워야 로그인 상태로 열린다 ----
  const bridgeRef = useRef(null);
  if (!bridgeRef.current) bridgeRef.current = createExtensionBridge();

  const connect = useCallback(async () => {
    setLogin('checking');
    const bridge = bridgeRef.current;
    const detected = await bridge.detect();
    const report = detected ? await bridge.sync() : null;
    setLogin(loginStateFromReport(detected, report));
    setConnected(true);
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  const reconnect = useCallback(async () => {
    await connect();
    setReloadToken(token => token + 1); // 플레이어·채팅을 새로 열어 새 로그인 상태를 반영
  }, [connect]);

  // ---- 주소와 설정 기억 ----
  useEffect(() => {
    const url = new URL(location.href);
    if (slots.length) url.searchParams.set('ids', slots.join(','));
    else url.searchParams.delete('ids');
    url.searchParams.set('layout', layout);
    url.searchParams.set('chat', chatMode);
    if (chatMode === 'single' && activeChat) url.searchParams.set('chatId', activeChat);
    else url.searchParams.delete('chatId');
    history.replaceState(null, '', url);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ layout, chat: chatMode }));
    } catch {
      /* 저장이 막혀도 이번 방문 동안은 그대로 쓴다 */
    }
  }, [slots, layout, chatMode, activeChat]);

  // ---- 칸 조작 ----
  const say = text => setAnnouncement(text);

  const addStream = useCallback((id, replaceIndex) => {
    if (!canEmbed(id)) return;
    setSlots(current => {
      if (current.includes(id)) return current;
      if (replaceIndex != null && current[replaceIndex]) {
        const next = [...current];
        next[replaceIndex] = id;
        return next;
      }
      return current.length >= MAX_SLOTS ? current : [...current, id];
    });
    say(`${nameOf(id)} 방송을 멀티뷰에 넣었어요.`);
  }, []);

  const removeStream = useCallback(id => {
    setSlots(current => current.filter(s => s !== id));
    say(`${nameOf(id)} 방송을 닫았어요.`);
  }, []);

  const moveStream = useCallback((id, delta) => {
    setSlots(current => {
      const from = current.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, []);

  const swapStreams = useCallback((a, b) => {
    setSlots(current => {
      const i = current.indexOf(a);
      const j = current.indexOf(b);
      if (i < 0 || j < 0 || i === j) return current;
      const next = [...current];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const makeMain = useCallback(id => {
    setSlots(current => [id, ...current.filter(s => s !== id)]);
  }, []);

  // ---- 끌어다 놓기 ----
  // dragstart 도중 화면을 바꾸면 크롬이 끌기를 취소할 수 있어, 덮개는 다음 틱에 띄운다.
  const dragStart = useCallback((event, info) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', info.id);
    setTimeout(() => setDrag(info), 0);
  }, []);

  const dragEnd = useCallback(() => {
    setDrag(null);
    setOverCell(null);
  }, []);

  const dropOn = useCallback(
    (event, cellIndex) => {
      event.preventDefault();
      if (!drag) return;
      if (drag.kind === 'list') {
        addStream(drag.id, cellIndex);
      } else if (cellIndex != null && slots[cellIndex] && slots[cellIndex] !== drag.id) {
        swapStreams(drag.id, slots[cellIndex]);
        say('두 방송의 자리를 바꿨어요.');
      }
      setDrag(null);
      setOverCell(null);
    },
    [drag, slots, addStream, swapStreams]
  );

  const allowDrop = event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // ---- 타일: React 밖에서 만든 칸 요소에 포털로 그린다 ----
  // 위치를 바꿀 때 칸 요소를 moveBefore로 옮겨서 iframe이 새로고침되지 않게 한다(방송·광고가 처음부터 다시 나오는 것 방지).
  const tilesRef = useRef(null);
  const tileElsRef = useRef(new Map());
  const getTileEl = id => {
    let el = tileElsRef.current.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'mv-tile';
      tileElsRef.current.set(id, el);
    }
    return el;
  };

  // 포털은 처음 넣은 순서대로 고정해 둔다(React가 포털 순서를 바꿔도 화면 위치에는 영향이 없다).
  const stableOrderRef = useRef([]);
  const stableOrder = useMemo(() => {
    const next = stableOrderRef.current.filter(id => slots.includes(id));
    slots.forEach(id => {
      if (!next.includes(id)) next.push(id);
    });
    stableOrderRef.current = next;
    return next;
  }, [slots]);

  useLayoutEffect(() => {
    const container = tilesRef.current;
    const els = tileElsRef.current;
    for (const [id, el] of els) {
      if (!slots.includes(id)) {
        el.remove();
        els.delete(id);
      }
    }
    if (!container) return;
    const canMove = 'moveBefore' in Element.prototype;
    slots.forEach((id, index) => {
      const el = els.get(id);
      if (!el) return;
      const reference = container.children[index] || null;
      if (el.parentNode !== container) {
        container.insertBefore(el, reference);
      } else if (reference !== el) {
        if (canMove) container.moveBefore(el, reference);
        else container.insertBefore(el, reference); // moveBefore가 없는 브라우저는 옮길 때 다시 불러온다
      }
    });
  }, [slots, connected]);

  const tileActions = useMemo(
    () => ({ move: moveStream, makeMain, remove: removeStream, showChat: setChatId, dragStart, dragEnd }),
    [moveStream, makeMain, removeStream, dragStart, dragEnd]
  );

  const count = slots.length;

  // 끌기 덮개에 보일 칸: 목록에서 끌어올 때 자리가 남으면 화면 전체가 "추가", 아니면 칸마다 "교체/자리 바꾸기"
  const dropCells = (() => {
    if (!drag) return [];
    if (drag.kind === 'list' && slots.includes(drag.id)) return [{ key: 'dup', area: '1 / 1 / -1 / -1', text: '이미 보고 있는 방송이에요' }];
    if (drag.kind === 'list' && count < MAX_SLOTS) {
      return [{ key: 'add', area: '1 / 1 / -1 / -1', text: `여기에 놓으면 추가 (${count + 1}/${MAX_SLOTS})` }];
    }
    return slots.map((id, index) => ({
      key: id,
      index,
      area: AREAS[index],
      text: drag.kind === 'list' ? `놓으면 ${nameOf(id, streamsById[id])} 자리에 교체` : id === drag.id ? '제자리' : '놓으면 자리 바꾸기'
    }));
  })();

  return (
    <div className="flex h-screen flex-col bg-black text-white selection:bg-white selection:text-black">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 px-3 py-2">
        <a href="./" className="text-[12px] font-bold text-white/60 hover:text-white" aria-label="메인 페이지로">
          ← BIP
        </a>
        <button
          type="button"
          onClick={() => setListOpen(open => !open)}
          aria-pressed={listOpen}
          className="rounded-lg border border-white/15 px-2.5 py-1 text-[12px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
        >
          라이브 목록
        </button>
        <h1 className="font-planb text-lg tracking-[0.25em]">MULTI VIEW</h1>
        <span className="text-[12px] font-bold text-white/40">
          {count}/{MAX_SLOTS}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-white/40">화면</span>
          <Segmented label="화면 배치" options={LAYOUTS} value={layout} onChange={setLayout} withIcons />
          <span className="text-[11px] font-bold text-white/40">채팅</span>
          <Segmented label="채팅 위치" options={CHAT_MODES} value={chatMode} onChange={setChatMode} />
          {loopback === 'denied' && (
            <span
              title="사이트 설정에서 '루프백 네트워크'를 허용하면 고화질 스트리머로 볼 수 있어요."
              className="rounded-full bg-amber-900/70 px-2.5 py-1 text-[11px] font-black text-amber-200"
            >
              고화질 권한 차단됨
            </span>
          )}
          <LoginChip state={login} onRetry={reconnect} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {listOpen && (
          <aside className="w-[280px] shrink-0 border-r border-white/10" aria-label="지금 방송 중인 멤버">
            <LiveList
              streams={streams}
              loaded={loaded}
              updatedAt={updatedAt}
              slots={slots}
              onAdd={addStream}
              onRemove={removeStream}
              dragStart={dragStart}
              dragEnd={dragEnd}
            />
          </aside>
        )}

        <main className="relative min-w-0 flex-1 p-1.5">
          <div className="relative h-full w-full">
            {!connected ? (
              <div className="flex h-full items-center justify-center text-[13px] font-bold text-white/50">로그인 연결 확인 중…</div>
            ) : count === 0 ? (
              <div
                onDragOver={allowDrop}
                onDragEnter={() => setOverCell('empty')}
                onDragLeave={() => setOverCell(null)}
                onDrop={event => dropOn(event, null)}
                data-over={overCell === 'empty'}
                className="mv-drop-cell absolute inset-0 flex-col gap-3 text-center"
              >
                <span className="font-planb text-3xl tracking-[0.3em] text-white/80">MULTI VIEW</span>
                <span className="text-[13px] font-bold tracking-normal text-white/60">
                  왼쪽 라이브 목록에서 방송을 끌어다 놓으세요. 최대 {MAX_SLOTS}개까지 볼 수 있어요.
                </span>
              </div>
            ) : null}

            {/* 영상 타일 층(칸 요소는 위 useLayoutEffect가 순서를 맞춘다) */}
            <div ref={tilesRef} className="mv-stage-grid mv-tiles" data-layout={layout} data-count={count} />

            {/* 끌기 덮개 층: 끄는 동안만 iframe 위를 덮어 놓을 자리를 받는다 */}
            {drag && count > 0 && (
              <div className="mv-stage-grid z-10" data-layout={layout} data-count={count}>
                {dropCells.map(cell => (
                  <div
                    key={cell.key}
                    style={{ gridArea: cell.area }}
                    data-over={overCell === cell.key}
                    onDragOver={allowDrop}
                    onDragEnter={() => setOverCell(cell.key)}
                    onDragLeave={() => setOverCell(current => (current === cell.key ? null : current))}
                    onDrop={event => dropOn(event, cell.index ?? null)}
                    className="mv-drop-cell"
                  >
                    {cell.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {connected &&
            stableOrder.map(id => {
              const index = slots.indexOf(id);
              return createPortal(
                <Tile
                  id={id}
                  index={index}
                  count={count}
                  stream={streamsById[id]}
                  layout={layout}
                  chatMode={chatMode}
                  isChatTarget={activeChat === id}
                  reloadToken={reloadToken}
                  actions={tileActions}
                />,
                getTileEl(id),
                id
              );
            })}
        </main>

        {chatMode === 'single' && count > 0 && (
          <aside className="flex w-[400px] shrink-0 flex-col border-l border-white/10" aria-label="채팅">
            <div role="group" aria-label="채팅 볼 방송" className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-1.5">
              {slots.map(id => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activeChat === id}
                  onClick={() => setChatId(id)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] font-bold transition-colors ${
                    activeChat === id ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {nameOf(id, streamsById[id])}
                </button>
              ))}
            </div>
            <div className="relative min-h-0 flex-1 bg-[#0b0b0b]">
              {/* 고른 방송의 숲 방송 페이지에서 채팅 칸만 잘라 보여 준다.
                  그 페이지도 영상을 재생하므로 하나만 띄우고, 자동재생 권한을 빼서 소리가 겹치지 않게 한다. */}
              {activeChat && (
                <SoopPageCrop
                  key={`${activeChat}-${reloadToken}`}
                  id={activeChat}
                  region={CROP.chat}
                  title={`${nameOf(activeChat, streamsById[activeChat])} 채팅`}
                  allow={IFRAME_ALLOW_NO_AUTOPLAY}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      <p role="status" className="mv-visually-hidden">
        {announcement}
      </p>
    </div>
  );
}
