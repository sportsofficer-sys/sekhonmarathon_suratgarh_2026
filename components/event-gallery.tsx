'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const archiveBase = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/archive-2025`;
const photos = [
  {
    file: '04_runners_at_start_line',
    caption: 'Together at the start',
    alt: 'Runners gather beneath the blue start arch at the 2025 Suratgarh marathon.',
  },
  {
    file: '06_pre_race_warmup',
    caption: 'Warming up together',
    alt: 'Participants stretch with their arms overhead near the finish arch in 2025.',
  },
  {
    file: '07_finish_area_group_photo',
    caption: 'At the finish area',
    alt: 'A group poses beneath the finish arch beside Desert Braves displays in 2025.',
  },
  {
    file: '01_registration_and_tshirt_distribution',
    caption: 'T-shirt distribution',
    alt: 'Event T-shirts stacked on tables beside the Suratgarh marathon sign in 2025.',
  },
  {
    file: '02_runner_kit_distribution',
    caption: 'Collecting the runner kit',
    alt: 'Participants gather around a T-shirt collection table beneath trees in 2025.',
  },
  {
    file: '03_start_finish_event_setup',
    caption: 'Preparing the start area',
    alt: 'Blue start arch beside the stage and Desert Braves event displays in 2025.',
  },
];

export function EventGallery({ onChooseRace }: { onChooseRace: () => void }) {
  const [selected, setSelected] = useState(0);
  const photo = photos[selected];

  function movePhoto(direction: number) {
    setSelected(
      (current) => (current + direction + photos.length) % photos.length,
    );
  }

  return (
    <main id="main" className="app-view event-gallery" tabIndex={-1}>
      <header className="gallery-header">
        <h1 tabIndex={-1}>2025 memories</h1>
        <p>Last year’s event at Air Force Station Suratgarh.</p>
      </header>
      <p className="gallery-archive-note">
        2025 archive · Dates and notices shown belong to last year.
      </p>

      <section
        className="gallery-photos"
        aria-label="Photos from the 2025 event"
      >
        <figure className="gallery-selected-photo">
          <div className="gallery-photo-frame">
            <img
              key={photo.file}
              src={`${archiveBase}/${photo.file}.webp`}
              alt={photo.alt}
              width="1536"
              height="1152"
              decoding="async"
            />
          </div>
          <figcaption>{photo.caption}</figcaption>
        </figure>

        <div className="gallery-controls">
          <button
            type="button"
            onClick={() => movePhoto(-1)}
            aria-label="Previous photo"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Previous
          </button>
          <span
            className="gallery-count"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span aria-hidden="true">
              {selected + 1} / {photos.length}
            </span>
            <span className="gallery-screen-reader">
              Photo {selected + 1} of {photos.length}: {photo.caption}
            </span>
          </span>
          <button
            type="button"
            onClick={() => movePhoto(1)}
            aria-label="Next photo"
          >
            Next
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>

        <div
          className="gallery-thumbnails"
          role="group"
          aria-label="Choose a photo"
        >
          {photos.map((item, index) => (
            <button
              type="button"
              key={item.file}
              onClick={() => setSelected(index)}
              aria-label={`Photo ${index + 1} of ${photos.length}: ${item.caption}`}
              aria-current={selected === index ? 'true' : undefined}
            >
              <img
                src={`${archiveBase}/${item.file}-thumb.webp`}
                alt=""
                width="240"
                height="180"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      </section>

      <div className="gallery-actions">
        <button type="button" onClick={onChooseRace}>
          Choose a race <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
