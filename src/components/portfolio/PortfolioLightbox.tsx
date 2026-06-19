import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface PortfolioItem {
  title: string;
  subtitle: string;
  gallery: string[];
}

interface Props {
  items: PortfolioItem[];
}

export function PortfolioLightbox({ items }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // Flatten all galleries into slides with responsive srcSet
  // Use 1200w for main lightbox view, provide srcSet for responsive
  const slides = items.flatMap((item) =>
    item.gallery.map((src) => {
      const basePath = src.replace(/\.(webp|jpg|jpeg|png|avif)$/, '');
      return {
        src: `${basePath}-1200w.webp`,
        alt: `${item.title} ${item.subtitle}`,
        srcSet: [
          { src: `${basePath}-480w.webp`, width: 480 },
          { src: `${basePath}-800w.webp`, width: 800 },
          { src: `${basePath}-1200w.webp`, width: 1200 },
        ],
        title: item.title,
        description: item.subtitle,
      };
    })
  );

  // Expose function to window for Astro to call
  if (typeof window !== 'undefined') {
    (window as any).openPortfolioLightbox = (itemIndex: number) => {
      // Calculate starting slide index based on item
      let slideIndex = 0;
      for (let i = 0; i < itemIndex; i++) {
        slideIndex += items[i].gallery.length;
      }
      setIndex(slideIndex);
      setOpen(true);
    };
  }

  return (
    <Lightbox
      open={open}
      close={() => setOpen(false)}
      index={index}
      slides={slides}
      plugins={[Captions, Thumbnails]}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
        thumbnailsContainer: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
      }}
      carousel={{
        finite: false,
      }}
      thumbnails={{
        position: 'bottom',
        width: 120,
        height: 80,
        border: 0,
        borderRadius: 0,
        padding: 0,
        gap: 8,
      }}
      captions={{
        showToggle: true,
        descriptionTextAlign: 'start',
      }}
    />
  );
}