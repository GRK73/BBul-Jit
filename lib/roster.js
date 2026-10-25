// 멤버 명단. 멤버·그룹을 추가하거나 바꿀 때는 이 파일만 고치면 된다.
// 서버(/api)와 화면(src)이 모두 여기서 읽는다.
//
// - 그룹 순서 = 카테고리 메뉴 순서 = 카드가 놓이는 순서
// - key   : 필터에 쓰는 내부 이름 (바꿔도 되지만 겹치면 안 된다)
// - label : 카테고리 메뉴에 보이는 이름
// - tag   : 카드에 작게 붙는 분류. 멤버에 tag를 적으면 그 멤버만 따로 바뀐다
// - 멤버 id는 숲 아이디나 치지직 채널 ID(32자리 16진수)를 그대로 적는다

export const GROUPS = [
  {
    key: 'Plan-B',
    label: '플랜비',
    tag: '플랜비',
    members: [
      { id: 'bver99', name: '빕어', tag: '사장' },
      { id: 'rose0957', name: '한세긴' },
      { id: 'navixx', name: '나비' },
      { id: 's07o24', name: '송밤' },
      { id: '9wang2', name: '크앙희' }
    ]
  },
  {
    key: 'BIP',
    label: 'BIP',
    tag: 'BIP',
    members: [
      { id: 'daniyan1030', name: '다니얀' },
      { id: 'ch1ch1r0', name: '찌로' },
      { id: 'hobal115end', name: '호발' },
      { id: '9dc2f676ede9b24914a67f8cd51cd23b', name: '한세현' } // 치지직
    ]
  },
  {
    key: 'Others',
    label: '기타',
    tag: '대표',
    members: [{ id: 'vmsystem', name: '서스스_공식' }]
  },
  {
    key: 'Generation 1',
    label: '1기',
    tag: '연습생 1기',
    members: [
      { id: 'bambe53', name: '밤베' },
      { id: 'yumroro', name: '윰로로' }
    ]
  },
  {
    key: 'Generation 2',
    label: '2기',
    tag: '연습생 2기',
    members: [{ id: 'swcmnb67', name: '공도리' }]
  },
  {
    key: 'Generation 3',
    label: '3기',
    tag: '연습생 3기',
    members: [
      { id: 'runna11', name: '룬나' },
      { id: 'reaper7862', name: '리퍼석' },
      { id: 'marihema', name: '마리히' },
      { id: 'gome02', name: '밤문' },
      { id: 'yonakayo05', name: '요나카' },
      { id: 'bluejin0129', name: '지오' },
      { id: 'zzeogoo', name: '햄쩌구' },
      { id: 'whtndus0830', name: '쪼아나' }
    ]
  },
  {
    key: 'Generation 4',
    label: '4기',
    tag: '연습생 4기',
    members: [
      { id: 'dokg531', name: '독쥐' },
      { id: 'pyo32o', name: '표표표3' },
      { id: 'xxxsihyeon', name: '텐타시현' },
      { id: 'mika35', name: '미카는미카' },
      { id: 'dbzlll', name: '유이' },
      { id: 'kkyren', name: '키렌' },
      { id: 'xnalcm004', name: '투미츠' },
      { id: 'taeyu8731', name: '태유' }
    ]
  }
];

// ---- 아래는 위 명단에서 자동으로 만들어진다. 손댈 필요 없음 ----

// id → { id, name, tag, groupKey, order }
export const MEMBERS = {};
GROUPS.forEach(group => {
  group.members.forEach(member => {
    MEMBERS[member.id] = {
      id: member.id,
      name: member.name,
      tag: member.tag || group.tag,
      groupKey: group.key,
      order: Object.keys(MEMBERS).length
    };
  });
});

export const ALL_STREAMER_IDS = Object.keys(MEMBERS);
