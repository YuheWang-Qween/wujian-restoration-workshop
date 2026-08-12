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
  rect?: { x: string; y: string; w: string; h: string };
}

interface DemoScene {
  title: string;
  narration: string;
  path?: string;
  image?: string;
  actions?: DemoAction[];
}

const SCENES: DemoScene[] = [
  {
    title: '登录',
    narration:
      '欢迎来到走马楼三国吴简修复工坊。1996年，长沙走马楼古井出土十余万枚简牍。先登录你的账号，开始修复之旅。',
    image: '/demo-login.png',
    actions: [],
  },
  {
    title: '简牍发掘',
    narration:
      '登录后进入工坊大厅。发掘页签里，六道工序按真实顺序排列，你来做修复。',
    path: '/',
    actions: [
      { delay: 500, type: 'highlight', selector: 'data:tab-excavation' },
      { delay: 2500, type: 'scroll', amount: 300 },
    ],
  },
  {
    title: '揭取 · 叠压排序',
    narration:
      '第一道工序，揭取。给你原始叠压数据，排出层序。合法答案不止一种。',
    path: '/stage/1',
    actions: [],
  },
  {
    title: '清洗 · 工时反推',
    narration:
      '清洗环节。七万枚竹简，每枚四十到五十分钟。你来算需要多少工人、工期多长。',
    path: '/stage/2',
    actions: [],
  },
  {
    title: '绑夹与核对 · 身份不能掉线',
    narration:
      '简牍在工序之间搬运，编号一旦错乱，信息就断了。绑夹与核对，就是给每枚简一个不脱落的身份。',
    path: '/stage/3',
    actions: [],
  },
  {
    title: '饱水保存 · 药剂筛选',
    narration:
      '四种药剂都能保存，但有一列叫"对人的影响"——这一列才是真正的筛选维度。',
    path: '/stage/4',
    actions: [],
  },
  {
    title: '脱色 · 让墨迹重新可辨',
    narration:
      '简牍出水后几分钟就会变黑。脱色不是为好看，是让文字重新能读。连二亚硫酸钠法胜出。',
    path: '/stage/5',
    actions: [],
  },
  {
    title: '脱水 · 含水率',
    narration:
      '简牍含水率高达471%，脱水就是给简找一个替身。最终选中十六醇，赢在颜色、收缩率和化学稳定性。',
    path: '/stage/6',
    actions: [],
  },
  {
    title: '简牍鉴赏',
    narration:
      '修复之外，鉴赏页签里展出简牍的形制、主题与关键术语。',
    path: '/',
    actions: [
      { delay: 0, type: 'click', selector: 'data:tab-exhibition' },
      { delay: 2000, type: 'scroll', amount: 400 },
      { delay: 5000, type: 'scroll', amount: -400 },
    ],
  },
  {
    title: '小简 · 数字人助教',
    narration:
      '数字人小简全程陪伴。它知道你在哪一环节，能从知识库检索回答你的问题，还能实时评阅你的答案。',
    path: '/stage/1',
    actions: [
      { delay: 1000, type: 'click', selector: '.wj-guide-float' },
      { delay: 5000, type: 'click', selector: '.wj-guide-float' },
    ],
  },
  {
    title: '排序题',
    narration: '排序题。给你一组考古记录，排出正确的叠压层序。',
    path: '/stage/1',
    actions: [
      { delay: 800, type: 'click', selector: 'data:q-1' },
      { delay: 1500, type: 'scroll', amount: 200 },
    ],
  },
  {
    title: '判断题',
    narration: '判断题。逐条判断正误，错了要写出正确表述。',
    path: '/stage/1',
    actions: [
      { delay: 800, type: 'click', selector: 'data:q-2' },
      { delay: 1500, type: 'scroll', amount: 200 },
    ],
  },
  {
    title: '多选题',
    narration: '多选题。选出所有可行项，还要说明理由。',
    path: '/stage/3',
    actions: [
      { delay: 800, type: 'click', selector: 'data:q-2' },
      { delay: 1500, type: 'scroll', amount: 400 },
    ],
  },
  {
    title: '匹配题',
    narration: '匹配题。把药剂和它作用的变色路径连起来。',
    path: '/stage/5',
    actions: [
      { delay: 800, type: 'click', selector: 'data:q-3' },
      { delay: 1500, type: 'scroll', amount: 200 },
    ],
  },
  {
    title: '画图题',
    narration: '画图题。画出简册卷起的横断面示意图。小简能看懂你画的图。',
    path: '/stage/1',
    actions: [
      { delay: 800, type: 'click', selector: 'data:q-3' },
      { delay: 1500, type: 'scroll', amount: 200 },
    ],
  },
  {
    title: '进度可续',
    narration:
      '作答自动保存，进度云端同步。每张卡片显示完成情况，一键重做。',
    path: '/',
    actions: [
      { delay: 500, type: 'highlight', selector: 'data:stage-1' },
      { delay: 2000, type: 'scroll', amount: 200 },
      { delay: 4000, type: 'scroll', amount: -200 },
    ],
  },
  {
    title: '成就卡',
    narration:
      '全部完成后，解锁成就卡。六枚竹简代表六道工序，可下载保存。',
    path: '/achievement',
    actions: [],
  },
  {
    title: '结尾',
    narration:
      '它把一份考古报告变成了一段旅程。每一步，都是你自己走的。',
    path: '/',
    actions: [
      { delay: 0, type: 'scroll', amount: 150 },
      { delay: 3000, type: 'scroll', amount: -150 },
    ],
  },
];

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
    (window as any).__DEMO_MODE__ = true;
    setSceneIdx(0);
    setActive(true);
    setPlaying(true);
  }, []);

  const exitDemo = useCallback(() => {
    stopAudio();
    clearActionTimers();
    (window as any).__DEMO_MODE__ = false;
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

  // Navigate to the scene's path when sceneIdx changes
  useEffect(() => {
    if (!active) return;
    // Clean up any highlight overlays from previous scene
    document.querySelectorAll('.wj-demo-highlight').forEach((el) => el.remove());
    const scene = SCENES[sceneIdx];
    if (scene.path) {
      window.scrollTo(0, 0);
      router.push(scene.path);
    }
  }, [active, sceneIdx, router]);

  // Wait for an element to appear in the DOM (after page navigation)
  const waitForElement = useCallback(
    (selector: string, timeout = 8000): Promise<HTMLElement | null> => {
      return new Promise((resolve) => {
        const find = () => {
          if (selector.startsWith('data:')) {
            return document.querySelector(`[data-demo="${selector.slice(5)}"]`) as HTMLElement | null;
          }
          return document.querySelector(selector) as HTMLElement | null;
        };
        const el = find();
        if (el) return resolve(el);
        const start = Date.now();
        const interval = setInterval(() => {
          const el = find();
          if (el) {
            clearInterval(interval);
            resolve(el);
          } else if (Date.now() - start > timeout) {
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
      });
    },
    [],
  );

  // Execute scene actions — triggered AFTER audio starts playing
  const startSceneActions = useCallback(
    (scene: DemoScene) => {
      clearActionTimers();
      // Remove any previous highlight overlay
      document.querySelectorAll('.wj-demo-highlight').forEach((el) => el.remove());

      for (const action of scene.actions ?? []) {
        const timer = setTimeout(async () => {
          if (action.type === 'click' && action.selector) {
            const el = await waitForElement(action.selector);
            el?.click();
          } else if (action.type === 'highlight' && action.rect) {
            document.querySelectorAll('.wj-demo-highlight').forEach((o) => o.remove());
            const overlay = document.createElement('div');
            overlay.className = 'wj-demo-highlight';
            overlay.style.cssText = `position:fixed;left:${action.rect.x};top:${action.rect.y};width:${action.rect.w};height:${action.rect.h};border:2px solid #a02828;border-radius:8px;pointer-events:none;z-index:9999;transition:opacity 0.3s;box-shadow:0 0 20px rgba(160,40,40,0.4);background:rgba(160,40,40,0.05);`;
            document.body.appendChild(overlay);
            setTimeout(() => {
              if (overlay.parentNode) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 400);
              }
            }, 4000);
          } else if (action.type === 'highlight' && action.selector) {
            const el = await waitForElement(action.selector);
            if (el) {
              // Remove previous highlight, add new one
              document.querySelectorAll('.wj-demo-highlight').forEach((o) => o.remove());
              const rect = el.getBoundingClientRect();
              const overlay = document.createElement('div');
              overlay.className = 'wj-demo-highlight';
              overlay.style.cssText = `position:fixed;left:${rect.left - 6}px;top:${rect.top - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px;border:2px solid #a02828;border-radius:8px;pointer-events:none;z-index:9997;transition:opacity 0.3s;box-shadow:0 0 20px rgba(160,40,40,0.4);background:rgba(160,40,40,0.05);`;
              document.body.appendChild(overlay);
              // Auto-remove after 4s or when next highlight appears
              setTimeout(() => {
                if (overlay.parentNode) {
                  overlay.style.opacity = '0';
                  setTimeout(() => overlay.remove(), 400);
                }
              }, 4000);
            }
          } else if (action.type === 'scrollTo' && action.selector) {
            const el = await waitForElement(action.selector);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (action.type === 'scroll') {
            window.scrollBy({ top: action.amount ?? 300, behavior: 'smooth' });
          }
        }, action.delay);
        actionTimersRef.current.push(timer);
      }
    },
    [clearActionTimers, waitForElement],
  );

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
      clearActionTimers();
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
        if (key !== currentAudioKeyRef.current) return;
        setAudioLoading(false);
        if (playing) {
          audio.play().catch(() => {
            setAudioError(true);
          });
          startSceneActions(scene);
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
            // Fallback: start actions without audio after 1s
            setTimeout(() => startSceneActions(scene), 1000);
            // Auto-advance after estimated narration time
            const estimatedMs = Math.max(3000, scene.narration.length * 200);
            const fallbackTimer = setTimeout(() => {
              if (sceneIdx === currentAudioKeyRef.current) goNext();
            }, estimatedMs);
            actionTimersRef.current.push(fallbackTimer);
          }
        });
    }

    return () => {
      stopAudio();
    };
  }, [active, sceneIdx, playing, goNext, stopAudio, clearActionTimers, startSceneActions]);

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
      setAudioLoading(false);
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

  // Add bottom padding to body when demo is active
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '320px';
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [active]);

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
      {/* Image overlay for scenes using static screenshots */}
      {scene.image && (
        <div className="fixed inset-0 z-[9997] overflow-hidden">
          <img
            src={scene.image}
            alt={scene.title}
            className="h-full w-full object-contain bg-wj-bg"
          />
        </div>
      )}

      {/* Bottom bar: controls + narration */}
      <div className="fixed bottom-0 left-0 right-0 z-[9998]">
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-wj-line/30">
          <div
            className="h-full bg-wj-cinnabar transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="border-t border-wj-cinnabar/20 bg-wj-bg/95 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-6 pt-3 pb-2">
            {/* Narration */}
            <div
              style={{
                opacity: narrationVisible ? 1 : 0,
                transform: narrationVisible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <Volume2 className="h-3 w-3 text-wj-cinnabar/60" />
                <span className="font-serif text-xs font-semibold tracking-wide text-wj-cinnabar">
                  {scene.title}
                </span>
                {audioLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-wj-muted" />
                )}
                {audioError && (
                  <span className="text-[10px] text-wj-ochre">语音加载失败</span>
                )}
              </div>
              <p className="text-[14px] leading-[1.6] text-wj-ink">
                {scene.narration}
              </p>
            </div>
            {/* Controls */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-wj-muted">
                演示模式 · {sceneIdx + 1} / {SCENES.length}
              </span>
              <div className="flex items-center gap-1">
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
