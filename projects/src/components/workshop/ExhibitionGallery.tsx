'use client';

import { useState } from 'react';
import type { ExFigure } from '@/lib/workshop/exhibition';
import { ExhibitionImage } from './ExhibitionImage';
import styles from './ExhibitionGallery.module.css';

type PhotoGroup = {
  title: string;
  photos: { label: string; figure: ExFigure }[];
};

/** 按内容分组的现场画册；缩略目录与正在阅读的照片始终相邻。 */
export function ExhibitionGallery({ groups, initialIndex = 0 }: { groups: PhotoGroup[]; initialIndex?: number }) {
  const [selection, setSelection] = useState({ group: 0, photo: initialIndex });
  const group = groups[selection.group];
  const photo = group.photos[selection.photo];

  return (
    <div className={styles.gallery}>
      <nav className={styles.groups} aria-label="影像分组">
        {groups.map((item, index) => (
          <button
            type="button"
            key={item.title}
            aria-pressed={index === selection.group}
            onClick={() => setSelection({ group: index, photo: 0 })}
          >
            {item.title}<span>{item.photos.length}</span>
          </button>
        ))}
      </nav>

      <ExhibitionImage key={photo.figure.src} figure={photo.figure} layout="gallery" />

      <div className={styles.directory} aria-label={`${group.title}照片目录`}>
        {group.photos.map((item, index) => (
          <button
            type="button"
            key={item.figure.src}
            className={styles.thumbnail}
            aria-label={`查看${item.label}`}
            aria-pressed={index === selection.photo}
            onClick={() => setSelection({ ...selection, photo: index })}
          >
            <span className={styles.frame}>
              <img src={item.figure.src} alt="" loading="lazy" />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
