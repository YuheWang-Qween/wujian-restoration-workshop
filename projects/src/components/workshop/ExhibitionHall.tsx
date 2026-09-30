'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { COLOPHON, EXH_NAV } from '@/lib/workshop/exhibition';
import styles from './ExhibitionHall.module.css';

/**
 * 简牍鉴赏篇 · 展厅首页（大厅「简牍鉴赏」页签内）
 *
 * 只做索引：五个板块入口卡。板块内容各自独立成页
 * （/exhibition/discovery|forms|themes|cases|reference，案例精读 /exhibition/case/N），
 * 不把全部内容堆在一个页签里。
 * 展示篇是陈列阅读：没有顺序解锁、没有细问、没有答题框，小简也不出场。
 */
export function ExhibitionHall() {
  const [discovery, ...boards] = EXH_NAV;

  return (
    <div className={styles.hall}>
      <nav className={styles.directory} aria-label="简牍鉴赏板块">
        <Link href={discovery.href} className={styles.discovery}>
          <div className={styles.scene}>
            <img src={discovery.figure} alt="走马楼发掘现场" />
          </div>
          <div className={styles['discovery-text']}>
            <h3 className={styles['discovery-title']}>{discovery.label}</h3>
            <p className={styles.description}>{discovery.desc}</p>
            <div className={styles['entry-footer']}>
              <span className={styles.count}>{discovery.count}</span>
              <span className={styles.enter}>
                进入 <ArrowRight size={15} aria-hidden="true" />
              </span>
            </div>
          </div>
        </Link>

        <div className={styles.boards}>
          {boards.map((board) => (
            <Link key={board.id} href={board.href} className={styles.entry}>
              <div className={styles.specimen}>
                <img src={board.figure} alt="" loading="lazy" />
              </div>
              <div className={styles['entry-text']}>
                <h3 className={styles.title}>{board.label}</h3>
                <p className={styles.description}>{board.desc}</p>
                <p className={styles.count}>{board.count}</p>
              </div>
              <span className={`${styles.enter} ${styles['entry-action']}`}>
                <span>进入</span> <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </nav>

      <p className={styles.colophon}>{COLOPHON}</p>
    </div>
  );
}
