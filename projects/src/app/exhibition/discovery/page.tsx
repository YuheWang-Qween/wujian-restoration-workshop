import type { Metadata } from 'next';
import { DISCOVERY, EXH_NAV } from '@/lib/workshop/exhibition';
import { EXHIBITION_IMAGES } from '@/lib/workshop/exhibition-images';
import { BoardHeader, ExhibitionShell } from '@/components/workshop/ExhibitionParts';
import { ExhibitionGallery } from '@/components/workshop/ExhibitionGallery';
import { ExhibitVisit } from '@/components/workshop/ExhibitVisit';
import styles from './Discovery.module.css';

export const metadata: Metadata = { title: '发现与归属 · 简牍鉴赏' };

const photoGroups = [
  {
    title: '出土现场',
    photos: [
      { label: '场地俯瞰', figure: EXHIBITION_IMAGES.site },
      { label: '井坑堆积', figure: EXHIBITION_IMAGES.excavation },
      { label: '坑内清理', figure: EXHIBITION_IMAGES.fieldwork },
      { label: '岸边清理', figure: EXHIBITION_IMAGES.recovery },
    ],
  },
  {
    title: '整理与收藏',
    photos: [
      { label: '分盆存放', figure: EXHIBITION_IMAGES.basins },
      { label: '整理记录', figure: EXHIBITION_IMAGES.recording },
      { label: '摄影记录', figure: EXHIBITION_IMAGES.photography },
      { label: '入藏保存', figure: EXHIBITION_IMAGES.storage },
    ],
  },
];

export default function DiscoveryPage() {
  const board = EXH_NAV[0];

  return (
    <ExhibitionShell crumb={board.label}>
      <ExhibitVisit id="discovery" />
      <BoardHeader order={board.order} title="发现与归属" desc={board.desc} />

      <section className={styles.intro} aria-label="出土影像与发现经过">
        <ExhibitionGallery groups={photoGroups} initialIndex={1} />
        <article className={styles.story}>
          <h2>一口古井里的简牍</h2>
          <p>{DISCOVERY.facts[0].text}</p>
          <dl className={styles.facts}>
            {DISCOVERY.facts.slice(1).map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.text}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <section className={styles.theories} aria-labelledby="archive-theories">
        <div className={styles['section-heading']}>
          <h2 id="archive-theories">这批档案属于谁？</h2>
          <p>{DISCOVERY.theoriesNote}</p>
        </div>
        <ol className={styles['theory-list']}>
          {DISCOVERY.theories.map((theory) => (
            <li key={theory.name}>
              <div>
                <h3>{theory.name}</h3>
                <p className={styles.holders}>{theory.holders}</p>
              </div>
              <p>{theory.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </ExhibitionShell>
  );
}
