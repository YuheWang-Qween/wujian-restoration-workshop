'use client';

import { useState } from 'react';
import type { ExTheme } from '@/lib/workshop/exhibition';
import { FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';
import styles from '@/components/workshop/ExhibitionBrowse.module.css';

const THEME_LABELS: Record<string, string> = {
  'land-tax': '田租赋税',
  household: '户籍人口',
  'poll-tax': '赋税征收',
  granary: '仓库出入',
  judicial: '司法文书',
  officials: '官吏军政',
  letters: '名刺书信',
  identities: '特殊身份',
};

export function ThemesAccordion({ themes }: { themes: ExTheme[] }) {
  const [selectedId, setSelectedId] = useState(themes[0]?.id);
  const theme = themes.find((item) => item.id === selectedId) ?? themes[0];

  if (!theme) return null;

  return (
    <div className={styles.browser}>
      <div className={styles.categories} role="group" aria-label="按主题查看简牍">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            aria-pressed={item.id === theme.id}
            aria-controls="theme-detail"
            className={styles.category}
          >
            {THEME_LABELS[item.id] ?? item.name}
          </button>
        ))}
      </div>

      <article
        id="theme-detail"
        aria-labelledby="theme-title"
        className={`${styles.exhibit} ${theme.figure ? styles.illustrated : ''}`}
        key={theme.id}
      >
        {theme.figure && (
          <div className={styles.figures}>
            <FigureCard figure={theme.figure} tall />
          </div>
        )}
        <div className={styles.label}>
          <h2 id="theme-title" className={styles.title}>{theme.name}</h2>
          <div className={styles.prose}>
            <p>{theme.text}</p>
          </div>
          {theme.quote && (
            <div className={styles.quote}>
              {theme.figure && <p className={styles.note}>同类释文选例，与配图非逐字对应。</p>}
              <SlipText slip={theme.quote} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
