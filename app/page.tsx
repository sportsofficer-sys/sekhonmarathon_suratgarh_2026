'use client';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  Medal,
  Shirt,
  Award,
  CupSoda,
  Menu,
  X,
  Heart,
  UserRound,
  Phone,
  Moon,
  Smile,
  Check,
  Download,
  Flag,
  Waves,
} from 'lucide-react';
import { Registration } from '@/components/registration';
import { PolicyDialog } from '@/components/policies';
import { PortalRecovery } from '@/components/portal-recovery';
import { useEventAvailability } from '@/lib/event-availability';
import { RACES } from '@/lib/race-data';
const EventPortal = lazy(() =>
  import('@/components/event-portal').then((module) => ({
    default: module.EventPortal,
  })),
);
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
const sourcePIB =
  'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2185553&lang=2&reg=48';
const sourceSekhon = 'https://gallantryawards.gov.in/awardee/3432';
type PortalView = 'participant' | 'organiser' | 'verify';
const questions = [
  [
    'Who can take part?',
    'This Suratgarh edition is exclusively for airwarriors and their families. Registration will require a verified email address and the invitation code shared through station channels.',
  ],
  [
    'What does the planned fee include?',
    'The planned package includes an event T-shirt, medal, digital certificate, post-run food, banana and water/lemon water. Final menu and collection instructions will be confirmed. Caps are not included. Planned fees are ₹600 for 5 KM, ₹700 for 10 KM and ₹800 for 21 KM; final fees will be confirmed before payment opens.',
  ],
  [
    'How will payment be confirmed?',
    'When payments open, use the Suratgarh UPI details shown with your entry and upload the screenshot with its transaction reference. The organising team checks the payment against the account record. A screenshot upload means verification is pending; it does not itself confirm payment.',
  ],
  [
    'How will the runs be timed?',
    'The event uses an organiser-managed race clock and finish-line recording, without RFID chips or timing mats. Officials will record and verify competitive finishes. Participant-entered times are identified as self-reported and cannot decide podium or cash-prize results.',
  ],
  [
    'How do results and certificates work?',
    'My race desk brings together your entry, result and certificate. After the event, you can submit a finish time against your confirmed registration. Certificates depend on the event’s completion rules and approved certificate template. Any self-reported time is labelled; organiser holds or corrections must be resolved before issue.',
  ],
  [
    'Can I register a child?',
    'A parent or guardian must complete a child’s registration and provide consent. Category-specific age rules are being finalised; contact the organisers before planning a minor’s entry. Choose a distance appropriate to current fitness and training.',
  ],
  [
    'Which T-shirt size should I choose?',
    'The supplier’s measurement chart will be added once confirmed. For help with sizing, call the organising team before submitting. We will not substitute a generic size chart for the actual event T-shirt.',
  ],
  [
    'Where is the route and when should I report?',
    'Suratgarh route maps, the assembly point and category reporting instructions will be shared after station approval. The event is on 4 October 2026, with the published event window of 05:00–10:00 IST. Do not treat the artwork as a route map.',
  ],
];
export default function Home() {
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [policy, setPolicy] = useState<string | null>(null);
  const [portal, setPortal] = useState<PortalView | null>(null);
  const [route, setRoute] = useState('5');
  const [showSticky, setShowSticky] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const { availability } = useEventAvailability();
  const canRegister = availability === 'open';
  const status = {
    loading: 'Checking registration',
    upcoming: 'Registration opens soon',
    open: 'Registration open',
    closed: 'Registration closed',
    unavailable: 'Registration temporarily unavailable',
  }[availability];
  useEffect(() => {
    const syncView = () => {
      const hash = window.location.hash;
      const next =
        new URLSearchParams(window.location.search).has('certificate') ||
        hash === '#verify-certificate'
          ? 'verify'
          : hash === '#organiser'
            ? 'organiser'
            : hash === '#race-desk'
              ? 'participant'
              : null;
      setPortal(next);
    };
    syncView();
    window.addEventListener('popstate', syncView);
    window.addEventListener('hashchange', syncView);
    return () => {
      window.removeEventListener('popstate', syncView);
      window.removeEventListener('hashchange', syncView);
    };
  }, []);
  useEffect(() => {
    if (!hero.current || portal) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShowSticky(!entry.isIntersecting),
    );
    observer.observe(hero.current);
    return () => observer.disconnect();
  }, [portal]);
  useEffect(() => {
    if (!menu) return;
    navigation.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menu]);
  const openPortal = (view: PortalView = 'participant') => {
    const url = new URL(window.location.href);
    if (view !== 'verify') url.searchParams.delete('certificate');
    url.hash =
      view === 'participant'
        ? 'race-desk'
        : view === 'organiser'
          ? 'organiser'
          : 'verify-certificate';
    window.history.pushState(null, '', url);
    setMenu(false);
    setPortal(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const closePortal = () => {
    setPortal(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('certificate');
    url.hash = '';
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  if (portal)
    return (
      <PortalRecovery onClose={closePortal}>
        <Suspense
          fallback={
            <main className="portal-loading" role="status">
              Opening your race desk…
            </main>
          }
        >
          <EventPortal
            initialView={portal}
            onViewChange={openPortal}
            onClose={closePortal}
          />
        </Suspense>
      </PortalRecovery>
    );
  return (
    <>
      <div className="station-site">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="s-topline">
          <span>INDIAN AIR FORCE · SEKHON MARATHON 2026</span>
          <span>
            <ShieldCheck size={13} /> Airwarriors & families
          </span>
        </div>
        <header className="s-header">
          <a
            className="s-wordmark"
            href="#main"
            aria-label="Air Force Station Suratgarh — home"
          >
            <img
              src={`${base}/assets/sekhon-logo.webp`}
              width="64"
              height="44"
              alt="Sekhon Marathon"
            />
            <span>
              <small>AIR FORCE STATION</small>
              <b>SURATGARH</b>
            </span>
          </a>
          <nav
            ref={navigation}
            className={`s-nav ${menu ? 'is-open' : ''}`}
            aria-label="Main navigation"
            id="station-navigation"
          >
            {[
              ['The races', '#races'],
              ['The legacy', '#legacy'],
              ['Race day', '#race-day'],
              ['FAQs', '#faqs'],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <button onClick={() => openPortal()} className="s-nav-mobile-entry">
              My race desk <ArrowUpRight size={16} />
            </button>
          </nav>
          <div className="s-header-actions">
            <button
              className="s-entry-link"
              aria-label="My race desk"
              onClick={() => openPortal()}
            >
              <UserRound size={18} />
              <span>My race desk</span>
            </button>
            <button
              ref={menuButton}
              className="s-menu"
              aria-label={menu ? 'Close navigation' : 'Open navigation'}
              aria-controls="station-navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </header>
        <main id="main">
          <section className="s-hero" ref={hero} aria-labelledby="event-title">
            <div className="s-hero-copy">
              <div className="s-edition">
                <span /> DESERT BRAVES · SURATGARH EDITION
              </div>
              <p className="s-host">Air Force Station Suratgarh</p>
              <h1 id="event-title">
                SEKHON IAF
                <br />
                <span>MARATHON</span>
                <sup>2026</sup>
              </h1>
              <p className="s-tagline">The Land of Sun and Sand.</p>
              <p className="s-intro">
                A tribute to courage. A morning for our community.
                <br className="s-desktop-break" /> Run together with the Desert
                Braves.
              </p>
              <div className="s-date">
                <CalendarDays size={19} />
                <strong>Sunday, 4 October 2026</strong>
                <span>05:00–10:00 IST</span>
              </div>
              <div className="s-hero-actions">
                <a className="s-button" href="#races">
                  {canRegister ? 'Choose your race' : 'Explore the races'}
                  <ArrowRight size={19} />
                </a>
                <a className="s-quiet-link" href="#legacy">
                  Why we run <ArrowUpRight size={16} />
                </a>
              </div>
              <p className="s-availability" role="status">
                <span />
                {status}
                <i>For airwarriors & families</i>
              </p>
            </div>
            <figure className="s-hero-art">
              <picture>
                <source
                  media="(max-width: 700px)"
                  srcSet={`${base}/assets/suratgarh-station-mobile-v2.webp`}
                />
                <img
                  src={`${base}/assets/suratgarh-station-desktop-v2.webp`}
                  alt="Canvas impression of runners on a landscaped station road, with Indian Air Force aircraft overhead and the region’s canal in the distance"
                  width="1774"
                  height="887"
                  fetchPriority="high"
                />
              </picture>
              <figcaption>
                <Waves size={18} />
                <span>
                  <b>DESERT SPIRIT. A COMMUNITY IN STRIDE.</b>Canvas impression of
                  station life and the surrounding region. The canal lies outside
                  the station; this is not a route map.
                </span>
              </figcaption>
            </figure>
          </section>
          <section className="s-facts" aria-label="Event essentials">
            <div>
              <CalendarDays />
              <span>
                RACE DAY<strong>4 October 2026</strong>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                HOST STATION<strong>Air Force Station Suratgarh</strong>
              </span>
            </div>
            <div>
              <Flag />
              <span>
                THREE DISTANCES<strong>5 KM · 10 KM · 21 KM</strong>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                REGISTRATION DEADLINE<strong>27 September 2026</strong>
              </span>
            </div>
          </section>
          <section
            className="s-section s-races"
            id="races"
            aria-labelledby="races-title"
          >
            <div className="s-section-head">
              <div>
                <span className="s-kicker">01 / YOUR START LINE</span>
                <h2 id="races-title">Choose your distance.</h2>
              </div>
              <p>
                Choose the run that matches your preparation.
                <br />
                The same tribute. Your own pace.
              </p>
            </div>
            <div className="s-price-note">
              <ShieldCheck size={16} />
              <span>
                {canRegister ? 'Registration is open.' : status + '.'} Planned
                fees below; final confirmation before payments open.
              </span>
            </div>
            <div className="s-race-grid">
              {RACES.map((race) => (
                <article className="s-race" key={race.distance}>
                  <div className="s-race-label">{race.label}</div>
                  <div className="s-race-title">
                    <strong>
                      {race.distance}
                      <small>KM</small>
                    </strong>
                    <h3>{race.name}</h3>
                  </div>
                  <p>{race.description}</p>
                  <span className="s-race-detail">
                    <Check size={15} />
                    {race.detail}
                  </span>
                  <div className="s-race-bottom">
                    <div>
                      <b>₹{race.fee}</b>
                      <small>planned fee</small>
                    </div>
                    <button
                      className="s-button s-button-small"
                      onClick={() => setSelected(race.distance)}
                      aria-label={`${canRegister ? 'Register for' : 'Explore'} ${race.distance} KM ${race.name}`}
                    >
                      {canRegister ? 'Register' : 'Explore'} {race.distance} KM
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <p className="s-timing-note">
              Organiser-managed timing. No RFID chips or timing mats. Category
              age rules and route details will be confirmed before registration
              opens.
            </p>
            <div className="s-kit">
              <div>
                <span className="s-kicker">PLANNED RUNNER PACKAGE</span>
                <h3>Useful essentials. A memorable morning.</h3>
              </div>
              <ul>
                {[
                  [Shirt, 'Event T-shirt'],
                  [Medal, 'Medal'],
                  [Award, 'Digital certificate'],
                  [CupSoda, 'Food & refreshments'],
                ].map(([Icon, label]) => {
                  const Item = Icon as typeof Shirt;
                  return (
                    <li key={String(label)}>
                      <Item size={25} />
                      <span>{String(label)}</span>
                    </li>
                  );
                })}
              </ul>
              <p>
                Post-run food, banana and water / lemon water. Final menu and
                collection details to follow. No cap included.
              </p>
            </div>
          </section>
          <section className="s-desk-strip" aria-labelledby="desk-title">
            <div>
              <span className="s-kicker">FROM REGISTRATION TO FINISH LINE</span>
              <h2 id="desk-title">Your race, in one place.</h2>
              <p>
                Check your entry and payment status. Return after the run for
                your result and certificate.
              </p>
            </div>
            <button
              className="s-button s-button-light"
              onClick={() => openPortal()}
            >
              Open my race desk
              <ArrowUpRight size={18} />
            </button>
          </section>
          <section
            className="s-section s-legacy"
            id="legacy"
            aria-labelledby="legacy-title"
          >
            <div className="s-legacy-aside">
              <span className="s-kicker">02 / THE MAN BEHIND THE MARATHON</span>
              <figure className="s-portrait">
                <img
                  src={`${base}/assets/nirmal-jit-singh-sekhon-portrait.webp`}
                  width="200"
                  height="150"
                  loading="lazy"
                  alt="Archival portrait of Flying Officer Nirmal Jit Singh Sekhon, Param Vir Chakra recipient"
                />
                <figcaption>
                  Archive portrait ·{' '}
                  <a href={sourceSekhon} target="_blank" rel="noreferrer">
                    Ministry of Defence
                  </a>
                </figcaption>
              </figure>
              <div className="s-honour">
                <b>PARAM VIR CHAKRA</b>
                <span>Awarded posthumously</span>
                <span>14 December 1971 · Srinagar</span>
              </div>
            </div>
            <div className="s-legacy-copy">
              <h2 id="legacy-title">
                Flying Officer
                <br />
                Nirmal Jit Singh Sekhon<span>PVC</span>
              </h2>
              <p className="s-lead">Courage beyond the call of duty.</p>
              <p>
                Flying Officer Nirmal Jit Singh Sekhon served with No. 18
                Squadron of the Indian Air Force. On 14 December 1971, six enemy
                Sabre aircraft attacked Srinagar airfield. He took off in his
                Gnat under fire and engaged the attackers, despite being heavily
                outnumbered.
              </p>
              <p>
                His aircraft was brought down during the combat, and he lost his
                life. Awarded the Param Vir Chakra posthumously, he remains the
                Indian Air Force’s only recipient of India’s highest wartime
                gallantry award.
              </p>
              <blockquote>
                “supreme gallantry, flying skill and determination above and
                beyond the call of duty”
                <cite>
                  From his Param Vir Chakra citation —{' '}
                  <a href={sourceSekhon} target="_blank" rel="noreferrer">
                    read the official account <ArrowUpRight size={13} />
                  </a>
                </cite>
              </blockquote>
              <p className="s-legacy-end">
                At Suratgarh, we run in remembrance of that courage,
                determination and devotion to duty.
              </p>
            </div>
          </section>
          <section
            className="s-section s-running"
            aria-labelledby="running-title"
          >
            <figure className="s-running-photo">
              <img
                src={`${base}/assets/ap-singh-sekhon-2025.webp`}
                width="1500"
                height="1600"
                loading="lazy"
                alt="Air Chief Marshal AP Singh running alongside participants at the 2025 Sekhon Marathon in Delhi"
              />
              <figcaption>
                <strong>Leading by example.</strong>Air Chief Marshal AP Singh
                in the 21 KM run, Delhi, 2025.
                <br />
                Photo: Ministry of Defence /{' '}
                <a href={sourcePIB} target="_blank" rel="noreferrer">
                  PIB
                </a>
              </figcaption>
            </figure>
            <div className="s-running-copy">
              <span className="s-kicker">03 / A HABIT WORTH STARTING</span>
              <h2 id="running-title">
                For the tribute.
                <br />
                For yourself.
              </h2>
              <p className="s-lead">
                The finish line is one morning.
                <br />
                The habit can stay with you.
              </p>
              <p>
                At the inaugural Sekhon Marathon in 2025, Air Chief Marshal AP
                Singh joined the 21 KM run. This October, our station community
                carries the spirit of participation forward.
              </p>
              <div className="s-health-list">
                {[
                  [
                    Heart,
                    'Support your heart',
                    'Regular physical activity supports cardiovascular health.',
                  ],
                  [
                    Smile,
                    'Make space for your mind',
                    'Being active can reduce feelings of anxiety and support mental wellbeing.',
                  ],
                  [
                    Moon,
                    'Rest better',
                    'Regular activity can help improve sleep quality.',
                  ],
                ].map(([Icon, title, body]) => {
                  const Item = Icon as typeof Heart;
                  return (
                    <div key={String(title)}>
                      <Item size={23} />
                      <span>
                        <h3>{String(title)}</h3>
                        <p>{String(body)}</p>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="s-health-source">
                Benefits relate to regular physical activity, not a guaranteed
                outcome of one race. Sources:{' '}
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
              <p className="s-training-note">
                Start at your current level. Build gradually. Choose the
                distance you have prepared for.
              </p>
            </div>
          </section>
          <section className="s-community">
            <img
              src={`${base}/assets/sekhon-2025-legacy.webp`}
              width="1600"
              height="962"
              loading="lazy"
              alt="Runners at the inaugural Sekhon Indian Air Force Marathon in Delhi, 2025"
            />
            <div>
              <span className="s-kicker">DESERT BRAVES · OUR INVITATION</span>
              <h2>
                Every step honours courage.
                <br />
                Every finish brings us together.
              </h2>
              <a className="s-button" href="#races">
                Find your distance
                <ArrowRight size={18} />
              </a>
              <p>
                Photo: inaugural Sekhon IAF Marathon, Delhi, 2025.
                <br />
                Ministry of Defence /{' '}
                <a href={sourcePIB} target="_blank" rel="noreferrer">
                  PIB
                </a>
              </p>
            </div>
          </section>
          <section
            className="s-section s-race-day"
            id="race-day"
            aria-labelledby="race-day-title"
          >
            <div>
              <span className="s-kicker">04 / PLAN YOUR MORNING</span>
              <h2 id="race-day-title">Race day at Suratgarh.</h2>
              <dl>
                <div>
                  <dt>Date</dt>
                  <dd>Sunday, 4 October 2026</dd>
                </div>
                <div>
                  <dt>Event window</dt>
                  <dd>05:00–10:00 AM IST</dd>
                </div>
                <div>
                  <dt>Host</dt>
                  <dd>Air Force Station Suratgarh</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>Airwarriors & families only</dd>
                </div>
              </dl>
              <p className="s-note">
                Follow the station’s entry instructions and the directions of
                event marshals. Category reporting times and the assembly point
                will be confirmed here.
              </p>
            </div>
            <div className="s-route-panel">
              <h3>Your route</h3>
              <div
                className="s-route-tabs"
                role="tablist"
                aria-label="Race route"
              >
                {['5', '10', '21'].map((distance) => (
                  <button
                    key={distance}
                    id={`route-tab-${distance}`}
                    role="tab"
                    aria-selected={route === distance}
                    aria-controls="route-panel"
                    tabIndex={route === distance ? 0 : -1}
                    onClick={() => setRoute(distance)}
                    onKeyDown={(event) => {
                      const keys = ['5', '10', '21'];
                      if (
                        event.key === 'ArrowRight' ||
                        event.key === 'ArrowLeft'
                      ) {
                        event.preventDefault();
                        const next =
                          keys[
                            (keys.indexOf(route) +
                              (event.key === 'ArrowRight' ? 1 : 2)) %
                              3
                          ];
                        setRoute(next);
                        document.getElementById(`route-tab-${next}`)?.focus();
                      }
                    }}
                  >
                    {distance} KM
                  </button>
                ))}
              </div>
              <div
                className="s-route-content"
                id="route-panel"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby={`route-tab-${route}`}
              >
                <MapPin size={34} />
                <span>AWAITING STATION APPROVAL</span>
                <h4>{route} KM · Suratgarh</h4>
                <p>
                  The approved course, start point and reporting instructions
                  will appear here.
                </p>
              </div>
              <span className="s-route-footer">
                Please use the published route once confirmed.
              </span>
            </div>
          </section>
          <section className="s-section s-faq" id="faqs">
            <div>
              <span className="s-kicker">BEFORE YOU REGISTER</span>
              <h2>Good to know.</h2>
              <p>
                Clear answers for runners <br />
                and families.
              </p>
            </div>
            <div>
              {questions.map(([title, text]) => (
                <details key={title}>
                  <summary>
                    {title}
                    <span>+</span>
                  </summary>
                  <p>{text}</p>
                </details>
              ))}
            </div>
          </section>
          <section className="s-contact" id="contact">
            <div>
              <span className="s-kicker">AIR FORCE STATION SURATGARH</span>
              <h2>Talk to the organising team.</h2>
              <p>
                Invitation codes, registration, T-shirt sizing and race-day
                enquiries.
              </p>
            </div>
            <div className="s-phone-links">
              <a href="tel:+918838463776">
                <Phone size={19} />
                88384 63776
                <ArrowUpRight size={17} />
              </a>
              <a href="tel:+917027964880">
                <Phone size={19} />
                70279 64880
                <ArrowUpRight size={17} />
              </a>
            </div>
          </section>
        </main>
        <footer className="s-footer">
          <div className="s-footer-top">
            <div>
              <b>AIR FORCE STATION SURATGARH</b>
              <p>
                Desert Braves · The Land of Sun and Sand.
                <br />
                Sekhon Indian Air Force Marathon · 4 October 2026
              </p>
            </div>
            <details className="s-install">
              <summary>
                <Download size={17} />
                Keep the race desk on your phone
              </summary>
              <p>
                Android: open the browser menu and choose Install app or Add to
                Home screen when available.
                <br />
                iPhone: open this site in Safari, tap Share, then Add to Home
                Screen. Registration and results need an internet connection.
              </p>
            </details>
          </div>
          <div className="s-footer-bottom">
            <span>© 2026 Desert Braves · Suratgarh</span>
            <div>
              <button onClick={() => setPolicy('terms')}>Terms</button>
              <button onClick={() => setPolicy('privacy')}>Privacy</button>
              <button onClick={() => setPolicy('refund')}>Refunds</button>
              <button onClick={() => openPortal('verify')}>
                Verify certificate
              </button>
              <button onClick={() => openPortal('organiser')}>
                Organiser access
              </button>
            </div>
          </div>
        </footer>
        {showSticky && !selected && !policy && (
          <nav className="s-phone-dock" aria-label="Quick race actions">
            <a href="#races">
              <Flag size={17} />
              <span>Choose a race</span>
            </a>
            <button onClick={() => openPortal()}>
              <UserRound size={17} />
              <span>My race desk</span>
            </button>
          </nav>
        )}
      </div>
      {selected && (
        <Registration
          race={selected}
          onClose={() => setSelected(null)}
          onPolicy={setPolicy}
          onChooseRace={() => {
            setSelected(null);
            requestAnimationFrame(() =>
              document
                .getElementById('races')
                ?.scrollIntoView({ behavior: 'instant' }),
            );
          }}
        />
      )}
      {policy && (
        <PolicyDialog policy={policy} onClose={() => setPolicy(null)} />
      )}
    </>
  );
}
