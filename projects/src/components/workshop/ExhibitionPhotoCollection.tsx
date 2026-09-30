import type { ExFigure } from '@/lib/workshop/exhibition';
import type { CSSProperties } from 'react';
import { ExhibitionImage } from './ExhibitionImage';
import styles from './ExhibitionPhotoCollection.module.css';

export type ExhibitionPhotoGroup = {
  title: string;
  description?: string;
  photos: readonly { label: string; figure: ExFigure }[];
};

/** 各组影像直接陈列，点击任一缩略图即可在原位置打开原图。 */
export function ExhibitionPhotoCollection({ groups, title = '影像资料', description }: {
  groups: readonly ExhibitionPhotoGroup[];
  title?: string;
  description?: string;
}) {
  const visibleGroups = groups.filter((group) => group.photos.length > 0);
  const photoCount = visibleGroups.reduce((total, group) => total + group.photos.length, 0);
  const isComparison = visibleGroups.length > 1 && photoCount <= 6;

  if (!visibleGroups.length) return null;

  return (
    <section className={styles.collection} aria-label={title}>
      <header className={styles.heading}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>

      <div
        className={`${styles.groups} ${isComparison ? styles.comparison : ''}`}
        style={isComparison ? { '--photo-count': photoCount } as CSSProperties : undefined}
      >
        {visibleGroups.map((group) => (
          <section
            key={group.title}
            className={styles.group}
            aria-label={group.title}
            style={isComparison ? { '--group-count': group.photos.length } as CSSProperties : undefined}
          >
            <header className={styles['group-heading']}>
              <div className={styles['group-title']}>
                <h3>{group.title}</h3>
                <span>{group.photos.length} 张</span>
              </div>
              {group.description && <p>{group.description}</p>}
            </header>

            <div className={styles.photos}>
              {group.photos.map(({ label, figure }) => (
                <ExhibitionImage
                  key={figure.src}
                  figure={figure}
                  layout="collection"
                  previewLabel={label}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
