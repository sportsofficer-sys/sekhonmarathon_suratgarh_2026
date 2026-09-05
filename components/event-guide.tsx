'use client';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Shirt,
} from 'lucide-react';

export function EventGuide({ onChooseRace }: { onChooseRace: () => void }) {
  return (
    <main id="main" className="app-view guide-view" tabIndex={-1}>
      <header className="guide-header">
        <p className="guide-kicker">Plan your morning</p>
        <h1 tabIndex={-1}>Event guide</h1>
      </header>
      <ul className="guide-essentials" aria-label="Event essentials">
        <li>
          <CalendarDays size={18} aria-hidden="true" />
          <span>Sunday, 4 October 2026</span>
        </li>
        <li>
          <Clock3 size={18} aria-hidden="true" />
          <span>05:00–10:00 IST</span>
        </li>
        <li>
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Airwarriors &amp; families only</span>
        </li>
      </ul>

      <section
        className="guide-collection"
        id="guide-kit"
        aria-labelledby="collection-title"
      >
        <div className="guide-collection-title">
          <Shirt size={23} aria-hidden="true" />
          <h2 id="collection-title" tabIndex={-1}>
            T-shirt collection
          </h2>
        </div>
        <p className="guide-collection-date">Saturday, 3 October 2026</p>
        <p className="guide-collection-time">09:00–13:30</p>
        <p className="guide-collection-place">
          <MapPin size={18} aria-hidden="true" />
          <span>
            In front of SBI Bank,
            <br />
            inside the station
          </span>
        </p>
      </section>

      <section
        className="guide-route-brief"
        id="race-day"
        aria-labelledby="route-guide-title"
      >
        <h2 id="route-guide-title" tabIndex={-1}>
          Reporting &amp; route
        </h2>
        <p>
          Route maps, the assembly point and reporting times will be shared
          after station approval.
        </p>
      </section>

      <section
        className="guide-contact-section"
        id="contact"
        aria-labelledby="contact-guide-title"
      >
        <h2 id="contact-guide-title" tabIndex={-1}>
          Contact the organisers
        </h2>
        <div className="guide-contacts">
          <a className="guide-call" href="tel:+918838463776">
            <Phone size={18} aria-hidden="true" />
            <span>88384 63776</span>
          </a>
          <a className="guide-call" href="tel:+917027964880">
            <Phone size={18} aria-hidden="true" />
            <span>70279 64880</span>
          </a>
        </div>
      </section>
      <div className="guide-actions">
        <button className="s-button" onClick={onChooseRace}>
          Choose a race <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
