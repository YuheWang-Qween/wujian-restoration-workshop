'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, SkipForward, SkipBack, X, Volume2, Loader2 } from 'lucide-react';

type ActionType = 'scroll' | 'scrollTo' | 'click' | 'highlight';

interface DemoAction {
  delay: number;
  type: ActionType;
  selector?: string;
  amount?: number;
}

interface DemoScene {
  title: string;
  narration: string;
  path?: string;
  actions?: DemoAction[];
}

const SCENES: DemoScene[] = [
  {
    title: '开场',
    narration:
      '1996年10月，长沙走马楼街，一台施工机械挖开了一口古井。井里涌出的不是泥土，而是十余万枚竹木简牍。它们在地下沉睡了一千七百多年，记录着一个我们从未如此近距离观察过的王朝：三国孙吴。这批简牍的总量，超过此前全国历年出土简牍的总和。',
    path: '/',
    actions: [
      { delay: 3000, type: 'scroll', amount: 300 },
      { delay: 7000, type: 'scroll', amount: -300 },
    ],
  },
  {
    title: '两个世界',
    narration:
      '打开工坊，顶部并排两个页签：简牍发掘与简牍鉴赏。简牍鉴赏是展厅，像逛博物馆一样浏览发现经过、形制六类、主题八类，甚至逐句精读五枚代表简。简牍发掘是工坊，六道修复工序按真实顺序排列。你不是在看修复，你是在做修复。',
    path: '/',
    actions: [
      { delay: 2000, type: 'click', selector: '#tab-exhibition' },
      { delay: 4000, type: 'scroll', amount: 400 },
      { delay: 8000, type: 'scroll', amount: -400 },
      { delay: 11000, type: 'click', selector: '#tab-excavation' },
    ],
  },
  {
    title: '揭取 · 叠压排序',
    narration:
      '走进第一道工序——揭取。大木简总共2480枚，其中井内原位228枚带着层位与揭剥图，另外2000余枚从扰土里捡回，没有层位，只剩自身。工坊给你原始数据，I区五小坨的叠压记录，让你排列层序。合法排列不止一种，你还要指出哪些关系无法确定。这不是填空，这是考古现场的真实判断。',
    path: '/stage/1',
    actions: [
      { delay: 2500, type: 'scroll', amount: 350 },
      { delay: 6000, type: 'scroll', amount: 350 },
      { delay: 10000, type: 'scroll', amount: 300 },
    ],
  },
  {
    title: '清洗 · 工时反推',
    narration:
      '清洗环节。竹简73631枚，每枚清洗40到50分钟。工坊让你算：五年内完成需要多少工人？只有一半人手，工期拉长到多少年？',
    path: '/stage/2',
    actions: [
      { delay: 2000, type: 'scroll', amount: 400 },
      { delay: 6000, type: 'highlight', selector: 'main' },
    ],
  },
  {
    title: '饱水保存 · 药剂筛选',
    narration:
      '饱水保存环节。1999年暴发蚀斑病，四种候选药剂摆在面前，都是好保存剂。但表格里有一列叫"对人的影响"，这一列才是真正的筛选维度。',
    path: '/stage/4',
    actions: [
      { delay: 2000, type: 'scroll', amount: 400 },
      { delay: 6000, type: 'scroll', amount: 300 },
    ],
  },
  {
    title: '脱水 · 含水率与收缩',
    narration:
      '脱水环节。简牍含水率高达471%，撤水不填充，宽度平均要缩50.6%。脱水就是给简找一个替身，最终选中十六醇，赢在颜色、收缩率、化学稳定性。六道工序走下来，你经历的是真实工程中的约束、权衡、试错和决策。',
    path: '/stage/6',
    actions: [
      { delay: 2000, type: 'scroll', amount: 400 },
      { delay: 7000, type: 'scroll', amount: 300 },
    ],
  },
  {
    title: '小简 · 数字人助教',
    narration:
      '每个环节页面，数字人向导小简始终跟着你。它知道你在哪个环节、读到第几节、做完了哪些题，会根据你的位置切换台词。点开头像，对话框就地展开，你可以问任何问题，小简从知识库中检索回答。写完答案点"请小简评阅"，它会实时给出判定，告诉你哪里对了、哪里还有缺口，但不会端出完整标准答案。',
    path: '/stage/1',
    actions: [
      { delay: 2500, type: 'scroll', amount: -600 },
      { delay: 4000, type: 'click', selector: '.wj-guide-float' },
      { delay: 12000, type: 'click', selector: '.wj-guide-float' },
    ],
  },
  {
    title: '五种题型',
    narration:
      '这个工坊的题目不是千篇一律的问答。五种作答形式对应五种思维方式：排序题排出合法序列、选择题选完还要写理由、判断题逐条正误并补充说明、匹配题左右连线、画图题用画板画出示意图，小简甚至能看懂你画的图。',
    path: '/stage/2',
    actions: [
      { delay: 2000, type: 'scroll', amount: 300 },
      { delay: 5000, type: 'scroll', amount: 300 },
      { delay: 8000, type: 'scroll', amount: 300 },
    ],
  },
  {
    title: '进度可续',
    narration:
      '这个工坊尊重你的时间。作答记录自动保存，刷新重进不丢。每个环节首页显示进度，已提交多少题、已评阅多少题。想从头再来，一键重做。退出再登录，进度从云端同步回来。',
    path: '/',
    actions: [
      { delay: 2000, type: 'scroll', amount: 250 },
      { delay: 5000, type: 'highlight', selector: 'a[href="/stage/1"]' },
      { delay: 8000, type: 'scroll', amount: -250 },
    ],
  },
  {
    title: '成就卡',
    narration:
      '六道工序全部完成后，填写学号和姓名，解锁一张成就卡。视觉灵感来自简册编联，六枚竹简代表六道工序，卡上记录你的评阅统计。这张卡可以下载为图片保存，它不是一张参与奖，而是一份记录：你确实走过了这条从井底到书桌的路。',
    path: '/achievement',
    actions: [],
  },
  {
    title: '结尾',
    narration:
      '走马楼吴简修复工坊做的事情很简单：它把一份考古修复报告，变成了一段可以亲手走过的旅程。小简在你身边，随时回答你的问题，随时评阅你的答案。但它不会替你走完任何一步。因为这条路的价值，正在于每一步都是你自己走的。',
    path: '/',
    actions: [
      { delay: 3000, type: 'scroll', amount: 200 },
      { delay: 8000, type: 'scroll', amount: -200 },
    ],
  },
];

function executeAction(action: DemoAction) {
  if (action.type === 'scroll') {
    window.scrollBy({ top: action.amount ?? 300, behavior: 'smooth' });
  } else if (action.type === 'scrollTo' && action.selector) {
    const el = document.querySelector(action.selector);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (action.type === 'click' && action.selector) {
    const el = document.querySelector(action.selector) as HTMLElement;
    el?.click();
  } else if (action.type === 'highlight' && action.selector) {
    const el = document.querySelector(action.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.style.cssText = `position:fixed;left:${rect.left - 6}px;top:${rect.top - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px;border:2px solid #a02828;border-radius:8px;pointer-events:none;z-index:9997;transition:opacity 0.3s;box-shadow:0 0 16px rgba(160,40,40,0.3);`;
      document.body.appendChild(overlay);
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 400);
      }, 1500);
    }
  }
}

export function DemoMode() {
  const [active, setActive] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [narrationVisible, setNarrationVisible] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedPathRef = useRef<string>('');
  const audioCacheRef = useRef<Map<number, string>>(new Map());
  const currentAudioKeyRef = useRef<number>(-1);
  const actionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearActionTimers = useCallback(() => {
    actionTimersRef.current.forEach((t) => clearTimeout(t));
    actionTimersRef.current = [];
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const goNext = useCallback(() => {
    stopAudio();
    clearActionTimers();
    setNarrationVisible(false);
    setSceneIdx((prev) => {
      const next = prev + 1;
      if (next >= SCENES.length) {
        setTimeout(() => {
          setActive(false);
          if (savedPathRef.current) router.push(savedPathRef.current);
        }, 0);
        return prev;
      }
      return next;
    });
  }, [stopAudio, clearActionTimers, router]);

  const goPrev = useCallback(() => {
    stopAudio();
    clearActionTimers();
    setNarrationVisible(false);
    setSceneIdx((prev) => Math.max(0, prev - 1));
  }, [stopAudio, clearActionTimers]);

  const startDemo = useCallback(() => {
    savedPathRef.current = window.location.pathname + window.location.search;
    audioCacheRef.current.clear();
    setSceneIdx(0);
    setActive(true);
    setPlaying(true);
  }, []);

  const exitDemo = useCallback(() => {
    stopAudio();
    clearActionTimers();
    setActive(false);
    setPlaying(false);
    if (savedPathRef.current) router.push(savedPathRef.current);
  }, [router, stopAudio, clearActionTimers]);

  // Jump to a specific scene (sidebar nav)
  const jumpToScene = useCallback(
    (idx: number) => {
      stopAudio();
      clearActionTimers();
      setNarrationVisible(false);
      setSceneIdx(idx);
    },
    [stopAudio, clearActionTimers],
  );

  // Execute scene actions with timers
  useEffect(() => {
    if (!active) return;
    const scene = SCENES[sceneIdx];
    if (!scene.actions?.length) return;

    clearActionTimers();
    for (const action of scene.actions) {
      const timer = setTimeout(() => {
        executeAction(action);
      }, action.delay);
      actionTimersRef.current.push(timer);
    }

    return clearActionTimers;
  }, [active, sceneIdx, clearActionTimers]);

  // Navigate to the scene's path when sceneIdx changes
  useEffect(() => {
    if (!active) return;
    const scene = SCENES[sceneIdx];
    if (scene.path) {
      router.push(scene.path);
    }
  }, [active, sceneIdx, router]);

  // Fetch and play audio for current scene
  useEffect(() => {
    if (!active) return;
    const scene = SCENES[sceneIdx];
    currentAudioKeyRef.current = sceneIdx;

    setAudioError(false);
    setAudioLoading(true);

    const playAudio = async (uri: string, key: number) => {
      if (key !== currentAudioKeyRef.current) return;
      stopAudio();
      const audio = new Audio(uri);
      audioRef.current = audio;

      audio.onended = () => {
        if (key === currentAudioKeyRef.current) {
          goNext();
        }
      };
      audio.onerror = () => {
        if (key === currentAudioKeyRef.current) {
          setAudioError(true);
          setAudioLoading(false);
        }
      };
      audio.oncanplay = () => {
        if (key === currentAudioKeyRef.current) {
          setAudioLoading(false);
          if (playing) {
            audio.play().catch(() => {
              setAudioError(true);
              setAudioLoading(false);
            });
          }
        }
      };
    };

    const cached = audioCacheRef.current.get(sceneIdx);
    if (cached) {
      playAudio(cached, sceneIdx);
    } else {
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scene.narration }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('TTS failed');
          return res.json();
        })
        .then((data) => {
          audioCacheRef.current.set(sceneIdx, data.audioUri);
          playAudio(data.audioUri, sceneIdx);
        })
        .catch(() => {
          if (sceneIdx === currentAudioKeyRef.current) {
            setAudioError(true);
            setAudioLoading(false);
          }
        });
    }

    return () => {
      stopAudio();
    };
  }, [active, sceneIdx, playing, goNext, stopAudio]);

  // Show narration text after a short delay
  useEffect(() => {
    if (!active) return;
    setNarrationVisible(false);
    const showTimer = setTimeout(() => setNarrationVisible(true), 400);
    return () => clearTimeout(showTimer);
  }, [active, sceneIdx]);

  // Play/pause control
  useEffect(() => {
    if (!active) return;
    if (playing) {
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
    }
  }, [playing, active]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      clearActionTimers();
    };
  }, [stopAudio, clearActionTimers]);

  // Keyboard controls
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitDemo();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, exitDemo, goNext, goPrev]);

  // Expose to global for the homepage button
  useEffect(() => {
    window.__startDemo = startDemo;
    return () => {
      delete window.__startDemo;
    };
  }, [startDemo]);

  if (!active) return null;

  const scene = SCENES[sceneIdx];
  const progress = ((sceneIdx + 1) / SCENES.length) * 100;

  return (
    <>
      {/* Top control bar */}
      <div className="fixed top-0 left-0 right-0 z-[9998] border-b border-wj-cinnabar/20 bg-wj-bg/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-semibold text-wj-cinnabar">
              演示模式
            </span>
            {audioLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-wj-muted" />
            )}
            {audioError && (
              <span className="text-[10px] text-wj-ochre">语音加载失败，仅显示字幕</span>
            )}
            <span className="text-xs text-wj-muted">
              {sceneIdx + 1} / {SCENES.length} · {scene.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={sceneIdx === 0}
              className="rounded p-1.5 text-wj-muted transition-colors hover:bg-wj-surface hover:text-wj-ink disabled:opacity-30 disabled:hover:bg-transparent"
              title="上一幕"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded p-1.5 text-wj-ink transition-colors hover:bg-wj-surface"
              title={playing ? '暂停' : '播放'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded p-1.5 text-wj-muted transition-colors hover:bg-wj-surface hover:text-wj-ink"
              title="下一幕"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="mx-1 h-4 w-px bg-wj-line" />
            <button
              type="button"
              onClick={exitDemo}
              className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-wj-muted transition-colors hover:bg-wj-surface hover:text-wj-ochre"
              title="退出演示 (ESC)"
            >
              <X className="h-3.5 w-3.5" />
              退出
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-wj-line/30">
          <div
            className="h-full bg-wj-cinnabar transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom narration subtitle */}
      <div className="fixed bottom-0 left-0 right-0 z-[9998] pointer-events-none">
        <div
          className="mx-auto max-w-3xl px-6 pb-8 pt-4"
          style={{
            opacity: narrationVisible ? 1 : 0,
            transform: narrationVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <div className="rounded-lg border border-wj-border/60 bg-wj-bg/92 px-6 py-5 shadow-[0_-4px_24px_-8px_rgba(30,27,22,0.2)] backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2">
              <Volume2 className="h-3 w-3 text-wj-cinnabar/60" />
              <span className="font-serif text-xs font-semibold tracking-wide text-wj-cinnabar">
                {scene.title}
              </span>
            </div>
            <p className="text-[15px] leading-[1.8] text-wj-ink">
              {scene.narration}
            </p>
          </div>
        </div>
      </div>

      {/* Side scene navigation */}
      <div className="fixed right-4 top-1/2 z-[9998] hidden -translate-y-1/2 flex-col gap-1.5 lg:flex">
        {SCENES.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => jumpToScene(i)}
            className="group flex items-center gap-2"
            title={s.title}
          >
            <span
              className={`block h-2 rounded-full transition-all duration-300 ${
                i === sceneIdx
                  ? 'w-6 bg-wj-cinnabar'
                  : i < sceneIdx
                    ? 'w-2 bg-wj-cinnabar/40'
                    : 'w-2 bg-wj-line group-hover:bg-wj-muted'
              }`}
            />
          </button>
        ))}
      </div>
    </>
  );
}

declare global {
  interface Window {
    __startDemo?: () => void;
  }
}
