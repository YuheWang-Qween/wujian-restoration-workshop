'use client';

import { useState } from 'react';
import type { ExForm } from '@/lib/workshop/exhibition';
import { FigureCard, SlipText } from '@/components/workshop/ExhibitionParts';
import styles from '@/components/workshop/ExhibitionBrowse.module.css';

const FORM_LABELS: Record<string, string> = {
  'tianjia-bie': '大木简',
  bamboo: '竹简',
  'wooden-tablets': '木牍',
  'tags-seals': '签牌与封检',
  'calling-cards': '名刺',
  others: '其他',
};

export default function FormsAccordion({ forms }: { forms: ExForm[] }) {
  const [selectedId, setSelectedId] = useState(forms[0]?.id);
  const form = forms.find((item) => item.id === selectedId) ?? forms[0];

  if (!form) return null;

  const hasFigures = Boolean(form.figures?.length);

  return (
    <div className={`${styles.browser} ${styles.forms}`}>
      <div className={styles.categories} role="group" aria-label="按形制查看简牍">
        {forms.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            aria-pressed={item.id === form.id}
            aria-controls="form-detail"
            className={styles.category}
          >
            {FORM_LABELS[item.id] ?? item.name}
          </button>
        ))}
      </div>

      <article
        id="form-detail"
        aria-labelledby="form-title"
        className={`${styles.exhibit} ${hasFigures ? styles.illustrated : ''}`}
        key={form.id}
      >
        {hasFigures && (
          <div className={styles.figures}>
            {form.figures?.map((figure) => (
              <FigureCard key={figure.src} figure={figure} tall />
            ))}
          </div>
        )}
        <div className={styles.label}>
          <h2 id="form-title" className={styles.title}>{form.name}</h2>
          <ul className={styles.spec} aria-label="形制信息">
            {form.spec.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className={styles.tagline}>{form.tagline}</p>
          <div className={styles.prose}>
            {form.detail.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          {form.quote && (
            <div className={styles.quote}>
              {hasFigures && <p className={styles.note}>同类释文选例，与配图非逐字对应。</p>}
              <SlipText slip={form.quote} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
