'use client';

import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Heart,
  Moon,
  Smile,
} from 'lucide-react';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
const sourceSekhon = 'https://gallantryawards.gov.in/awardee/3432';
const sourcePIB =
  'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2185553&lang=2&reg=48';

export function EventTribute({
  onChooseRace,
  onOpenGallery,
}: {
  onChooseRace: () => void;
  onOpenGallery: () => void;
}) {
  return (
    <main id="main" className="app-view tribute-view" tabIndex={-1}>
      <header className="tribute-header">
        <p className="tribute-kicker">In remembrance</p>
        <h1 tabIndex={-1}>Why we run</h1>
      </header>

      <section className="tribute-story" aria-labelledby="tribute-sekhon-title">
        <figure className="tribute-portrait">
          <img
            src={`${base}/assets/nirmal-jit-singh-sekhon-portrait.webp`}
            width="200"
            height="150"
            alt="Archival portrait of Flying Officer Nirmal Jit Singh Sekhon, Param Vir Chakra recipient"
          />
          <figcaption>
            Archive portrait ·{' '}
            <a href={sourceSekhon} target="_blank" rel="noreferrer">
              Ministry of Defence
            </a>
          </figcaption>
        </figure>
        <div className="tribute-story-copy">
          <h2 id="tribute-sekhon-title">
            Flying Officer Nirmal Jit Singh Sekhon <span>PVC</span>
          </h2>
          <p className="tribute-honour">
            Param Vir Chakra · Awarded posthumously
          </p>
          <p>
            On 14 December 1971, six enemy Sabres attacked Srinagar airfield.
            Sekhon, of the IAF’s No. 18 Squadron, took off in his Gnat under
            fire and engaged them, heavily outnumbered.
          </p>
          <p>
            His aircraft was brought down and he was killed in combat. Awarded
            the Param Vir Chakra posthumously, he remains the IAF’s only
            recipient of India’s highest wartime gallantry award.
          </p>
          <blockquote className="tribute-citation">
            “Supreme gallantry, flying skill and determination above and beyond
            the call of duty”
            <cite>
              From his Param Vir Chakra citation —{' '}
              <a href={sourceSekhon} target="_blank" rel="noreferrer">
                read the official account{' '}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </cite>
          </blockquote>
          <p>Suratgarh runs in remembrance of his courage and Sacrifice.</p>
        </div>
      </section>

      <section
        className="tribute-running"
        aria-labelledby="tribute-running-title"
      >
        <figure className="tribute-photo">
          <img
            src={`${base}/assets/ap-singh-sekhon-2025.webp`}
            width="1500"
            height="1600"
            loading="lazy"
            alt="Air Chief Marshal AP Singh running alongside participants at the 2025 Sekhon Marathon in Delhi"
          />
          <figcaption>
            Air Chief Marshal AP Singh in the 21 KM run, Delhi, 2025.
            <br />
            Photo: Ministry of Defence /{' '}
            <a href={sourcePIB} target="_blank" rel="noreferrer">
              PIB
            </a>
          </figcaption>
        </figure>
        <div className="tribute-running-copy">
          <h2 id="tribute-running-title">Leading by example</h2>
          <p>
            The inaugural Sekhon Marathon brought runners together in Delhi in
            2025. This October, the Desert Braves carry that spirit forward at
            Air Force Station Suratgarh.
          </p>
        </div>
      </section>

      <details className="tribute-benefits">
        <summary>
          <span>A habit worth starting</span>
          <ChevronDown size={20} aria-hidden="true" />
        </summary>
        <div className="tribute-benefits-body">
          <ul className="tribute-health-list">
            <li>
              <Heart size={22} aria-hidden="true" />
              <div>
                <strong>Support your heart</strong>
                <p>Regular physical activity supports cardiovascular health.</p>
              </div>
            </li>
            <li>
              <Smile size={22} aria-hidden="true" />
              <div>
                <strong>Support your wellbeing</strong>
                <p>Activity can reduce anxiety and support mental wellbeing.</p>
              </div>
            </li>
            <li>
              <Moon size={22} aria-hidden="true" />
              <div>
                <strong>Rest better</strong>
                <p>Regular activity can help improve sleep quality.</p>
              </div>
            </li>
          </ul>
          <p className="tribute-sources">
            Benefits come from regular activity; one race offers no guarantee.
            Sources:{' '}
            <a
              href="https://www.who.int/news-room/fact-sheets/detail/physical-activity"
              target="_blank"
              rel="noreferrer"
            >
              WHO
            </a>{' '}
            ·{' '}
            <a
              href="https://www.cdc.gov/physical-activity-basics/benefits/index.html"
              target="_blank"
              rel="noreferrer"
            >
              CDC
            </a>
            .
          </p>
          <p>Build gradually and choose a distance you have trained for.</p>
        </div>
      </details>

      <div className="tribute-actions">
        <button className="s-button" onClick={onOpenGallery}>
          Explore the 2025 gallery <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="s-button" onClick={onChooseRace}>
          Find your distance <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
