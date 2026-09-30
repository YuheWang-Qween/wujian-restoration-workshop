import type { Metadata } from 'next';
import { DISCOVERY, EXH_NAV } from '@/lib/workshop/exhibition';
import { EXHIBITION_IMAGES } from '@/lib/workshop/exhibition-images';
import { DISCOVERY_PHOTO_GROUPS } from '@/lib/workshop/exhibition-photo-archive';
import { BoardHeader, ExhibitionShell } from '@/components/workshop/ExhibitionParts';
import { ExhibitionGallery } from '@/components/workshop/ExhibitionGallery';
import { ExhibitionPhotoCollection } from '@/components/workshop/ExhibitionPhotoCollection';
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
];

export default function DiscoveryPage() {
  const board = EXH_NAV[0];

  return (
    <ExhibitionShell crumb={board.label}>
      <ExhibitVisit id="discovery" />
      <BoardHeader order={board.order} title="发现与归属" desc={board.desc} />
      <a href="#discovery-photos" className={styles['photo-link']}>浏览更多现场与整理影像</a>

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

      <div id="discovery-photos" className={styles['photo-archive']}>
        <ExhibitionPhotoCollection
          groups={DISCOVERY_PHOTO_GROUPS}
          title="现场与整理影像"
          description="从场地、清理到分装与收藏，按画面内容分组查看。点击图片可放大观察。"
        />
      </div>
    </ExhibitionShell>
  );
}
