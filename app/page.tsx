'use client';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  Medal,
  Shirt,
  Award,
  Camera,
  Gift,
  CupSoda,
  Menu,
  X,
  Flag,
  Route,
  Timer,
  Check,
  Sun,
  Heart,
  UserRound,
  Phone,
  MailCheck,
  ClipboardCheck,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Registration } from '@/components/registration';
import { PolicyDialog } from '@/components/policies';
import { useEventAvailability } from '@/lib/event-availability';
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const races = [
  {
    distance: '5',
    name: 'Fun Run',
    fee: 399,
    level: 'EVERY STEP COUNTS',
    description:
      'Perfect for beginners, students and fitness enthusiasts who want to be part of the tribute run.',
    features: [
      'Beginner friendly',
      'Run together as a family',
      'Finisher medal & certificate',
    ],
    timed: false,
  },
  {
    distance: '10',
    name: 'Challenge Run',
    fee: 899,
    level: 'FIND YOUR NEXT GEAR',
    description:
      'Best for regular runners who want to test their endurance and step up to the next level.',
    features: [
      'For regular runners',
      'Timed BIB included',
      'Finisher medal & certificate',
    ],
    timed: true,
  },
  {
    distance: '21',
    name: 'Half Marathon',
    fee: 899,
    level: 'GO THE DISTANCE',
    description:
      'Designed for passionate runners who are ready to take on the ultimate tribute challenge.',
    features: [
      'For dedicated runners',
      'Timed BIB included',
      'Finisher medal & certificate',
    ],
    timed: true,
  },
];
const benefits = [
  [Shirt, 'Official race tee'],
  [Medal, 'Finisher medal'],
  [Award, 'Certificate'],
  [Sun, 'Runner cap'],
  [CupSoda, 'Refreshments'],
  [Heart, 'Energy drink'],
  [Camera, 'Race photographs'],
  [Gift, 'Goodie bag'],
] as const;
function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setLeft(
        Math.max(
          0,
          new Date('2026-10-04T05:00:00+05:30').getTime() - Date.now(),
        ),
      );
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="countdown">
      <span className="countdown-label">THE START LINE AWAITS</span>
      <div>
        {['DAYS', 'HRS', 'MIN'].map((unit, i) => (
          <div className="time-unit" key={unit}>
            <strong>
              {left === null
                ? '—'
                : String(
                    Math.floor(left / [86400000, 3600000, 60000, 1000][i]) %
                      [10000, 24, 60, 60][i],
                  ).padStart(2, '0')}
            </strong>
            <span>{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function Home() {
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [policy, setPolicy] = useState<string | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { availability } = useEventAvailability();
  const status = {
    loading: 'Checking registration status',
    upcoming: 'Registration opens soon',
    open: 'Registration is open',
    closed: 'Registration has closed',
    unavailable: 'Registration temporarily unavailable',
  }[availability];
  const canRegister = availability === 'open';
  const action = canRegister ? 'Choose your race' : 'Explore the races';
  useEffect(() => {
    if (!hero.current) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShowSticky(!entry.isIntersecting),
    );
    observer.observe(hero.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menu]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="topbar">
        <span>
          <ShieldCheck size={14} /> For airwarriors &amp; families
        </span>
        <span>INDIAN AIR FORCE TRIBUTE RUN · 2026</span>
      </div>
      <header className="site-header">
        <a
          className="brand"
          href="#main"
          aria-label="Sekhon Marathon Suratgarh home"
        >
          <img
            src={`${base}/assets/sekhon-logo.webp`}
            width="718"
            height="347"
            alt="Sekhon Marathon"
          />
          <span>
            <b>DESERT BRAVES</b>
            <small>Air Force Station Suratgarh</small>
          </span>
        </a>
        <nav
          id="main-navigation"
          className={menu ? 'navigation open' : 'navigation'}
          aria-label="Main navigation"
        >
          {[
            ['The event', '#event'],
            ['Race categories', '#races'],
            ['Race day', '#race-day'],
            ['FAQs', '#faqs'],
            ['Contact', '#contact'],
          ].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="entry-button"
            aria-label="My entry and payment status"
            onClick={() => {
              setMenu(false);
              setSelected('status');
            }}
          >
            <UserRound size={19} />
            <span>My entry</span>
          </button>
          <a className="button nav-cta" href="#races">
            View races <ArrowUpRight size={17} />
          </a>
          <button
            ref={menuButton}
            className="menu-button"
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            aria-controls="main-navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section ref={hero} className="hero" aria-labelledby="hero-title">
          <picture className="hero-picture">
            <source
              media="(max-width:760px)"
              srcSet={`${base}/assets/desert-braves-mobile.webp`}
            />
            <img
              className="hero-image"
              src={`${base}/assets/desert-braves.webp`}
              width="1860"
              height="845"
              alt=""
              fetchPriority="high"
            />
          </picture>
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="eyebrow light">
              <span /> DESERT BRAVES · 2026 EDITION
            </div>
            <h1 id="hero-title">
              SEKHON
              <br />
              <em>MARATHON.</em>
            </h1>
            <p className="hero-subtitle">The Land of Sun and Sand.</p>
            <p className="hero-description">
              A tribute to Flying Officer
              <br className="desktop-break" /> Nirmal Jit Singh Sekhon PVC.
            </p>
            <div className="hero-facts">
              <span>
                <CalendarDays size={18} />
                <b>4 October 2026</b>
              </span>
              <span>
                <MapPin size={18} />
                Suratgarh, Rajasthan
              </span>
            </div>
            <div
              className={`availability-status status-${availability}`}
              role="status"
            >
              <span />
              {status}
            </div>
            <div className="hero-actions">
              <a className="button orange" href="#races">
                {action}
                <ArrowRight size={20} />
              </a>
              <span className="hero-distances">
                5 KM <i /> 10 KM <i /> 21 KM
              </span>
            </div>
            <p className="hero-restriction">
              <ShieldCheck size={16} /> Exclusively for airwarriors &amp; their
              families
            </p>
          </div>
          <div className="hero-location">
            <span>RUN. SOAR. INSPIRE.</span>
            <b>AIR FORCE STATION SURATGARH</b>
          </div>
        </section>
        <section className="event-strip" aria-label="Event essentials">
          <div>
            <CalendarDays />
            <span>
              <small>RACE DAY</small>
              <strong>04 October 2026</strong>
              <p>Sunday</p>
            </span>
          </div>
          <div>
            <Clock3 />
            <span>
              <small>EVENT TIME</small>
              <strong>05:00 — 10:00 AM</strong>
              <p>Indian Standard Time</p>
            </span>
          </div>
          <div>
            <MapPin />
            <span>
              <small>THE VENUE</small>
              <strong>Air Force Station</strong>
              <p>Suratgarh, Rajasthan</p>
            </span>
          </div>
          <div>
            <Flag />
            <span>
              <small>REGISTRATION CLOSES</small>
              <strong>27 September 2026</strong>
              <p>Choose your distance below</p>
            </span>
          </div>
        </section>
        <section id="races" className="section race-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">01 / FIND YOUR DISTANCE</div>
              <h2>
                Your race.
                <br className="mobile-break" /> Your moment.
              </h2>
            </div>
            <p>
              Three distances. One spirit of honour.
              <br />
              Find the start line that’s right for you.
            </p>
          </div>
          <div className="race-availability">
            <ShieldCheck size={18} />
            <span>
              <b>{status}.</b>{' '}
              {canRegister
                ? 'Have your email and station invitation code ready.'
                : availability === 'upcoming'
                  ? 'Compare the distances and explore the registration preview.'
                  : 'You can still explore race details and check an existing entry.'}
            </span>
          </div>
          <div className="race-overview" aria-label="Race prices at a glance">
            {races.map((race) => (
              <a href={`#race-${race.distance}`} key={race.distance}>
                <b>
                  {race.distance}
                  <span> KM</span>
                </b>
                <span>₹{race.fee}</span>
                <small>{race.timed ? 'Timed run' : 'Fun run'}</small>
              </a>
            ))}
          </div>
          <div className="race-grid">
            {races.map((race, i) => (
              <article
                id={`race-${race.distance}`}
                className={`race-card race-${i}`}
                key={race.distance}
              >
                <div className="race-top">
                  <span>{race.level}</span>
                  {race.timed && (
                    <span className="timed-tag">
                      <Timer size={13} /> TIMED RUN
                    </span>
                  )}
                </div>
                <div className="race-card-heading">
                  <div className="race-distance">
                    {race.distance}
                    <span>KM</span>
                  </div>
                  <h3>{race.name}</h3>
                </div>
                <p>{race.description}</p>
                <ul>
                  {race.features.map((f) => (
                    <li key={f}>
                      <Check size={16} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="race-bottom">
                  <div>
                    <strong>₹{race.fee}</strong>
                    <span>per participant</span>
                  </div>
                  <button
                    className="race-select"
                    onClick={() => setSelected(race.distance)}
                    aria-label={`${canRegister ? 'Choose' : availability === 'upcoming' ? 'Preview' : 'View'} ${race.distance} KM ${race.name}`}
                  >
                    {canRegister
                      ? 'Choose'
                      : availability === 'upcoming'
                        ? 'Preview'
                        : 'View'}{' '}
                    {race.distance} KM <ArrowRight size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="race-footnote">
            <Shirt size={16} /> Every registration includes your race tee,
            medal, certificate and race-day benefits.
          </p>
        </section>
        <section
          className="registration-guide section"
          aria-labelledby="registration-guide-title"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">A SIMPLE START</div>
              <h2 id="registration-guide-title">From sign-in to start line.</h2>
            </div>
            <button className="text-link" onClick={() => setSelected('status')}>
              Already registered? My entry <ArrowUpRight size={18} />
            </button>
          </div>
          <ol>
            <li>
              <MailCheck />
              <div>
                <b>01 · Get access</b>
                <p>
                  Sign in with your email and enter the station invitation code.
                </p>
              </div>
            </li>
            <li>
              <UserRound />
              <div>
                <b>02 · Add your runner</b>
                <p>
                  Choose a distance and add participant details and T-shirt
                  size.
                </p>
              </div>
            </li>
            <li>
              <ClipboardCheck />
              <div>
                <b>03 · Payment &amp; review</b>
                <p>
                  When payments open, upload your receipt. Your entry is
                  confirmed after organiser verification.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section id="event" className="tribute-section">
          <figure className="legacy-photo">
            <img
              src={`${base}/assets/sekhon-2025-legacy.webp`}
              width="1600"
              height="962"
              alt="Runners at the inaugural Sekhon Indian Air Force Marathon in Delhi in 2025"
              loading="lazy"
            />
            <figcaption>
              <b>One legacy. Thousands of footsteps.</b>
              <span>
                Delhi, 2025 · Inaugural Sekhon IAF Marathon
                <br />
                Photo: Ministry of Defence /{' '}
                <a
                  href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2185553&amp;lang=2&amp;reg=48"
                  target="_blank"
                  rel="noreferrer"
                >
                  PIB
                </a>
              </span>
            </figcaption>
          </figure>
          <div className="tribute-copy">
            <div className="eyebrow">02 / A LEGACY THAT MOVES US</div>
            <h2>
              A run inspired by
              <br />
              courage & honour.
            </h2>
            <p>
              Sekhon Indian Air Force Marathon 2026 is a tribute run dedicated
              to the courage, sacrifice and inspiring legacy of Flying Officer
              Nirmal Jit Singh Sekhon PVC.
            </p>
            <p>
              The marathon brings runners together to celebrate fitness,
              endurance, patriotism and the spirit of honour through multiple
              race categories at Air Force Station Suratgarh.
            </p>
            <div className="tribute-stat">
              <div>
                <strong>1971</strong>
                <span>YEAR OF SACRIFICE</span>
              </div>
              <div>
                <strong>One legacy.</strong>
                <span>COUNTLESS STEPS FORWARD.</span>
              </div>
            </div>
            <a className="text-link" href="#races">
              Run with pride <ArrowUpRight size={20} />
            </a>
          </div>
        </section>
        <section className="section benefits-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">INCLUDED WITH REGISTRATION</div>
              <h2>A race day to remember.</h2>
            </div>
            <p>
              Your race-day benefits,
              <br />
              from the first step to the finish.
            </p>
          </div>
          <div className="benefits-grid">
            {benefits.map(([Icon, label]) => (
              <div key={label}>
                <Icon size={28} strokeWidth={1.35} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="benefits-note">
            <Timer size={18} /> Timed BIBs are included exclusively for 10 KM
            and 21 KM participants.
          </div>
        </section>
        <section id="race-day" className="race-day-section">
          <div className="race-day-inner">
            <div>
              <div className="eyebrow light">03 / KNOW YOUR RACE DAY</div>
              <h2>
                Arrive ready.
                <br />
                Run with confidence.
              </h2>
              <p>
                Sunday, 4 October 2026
                <br />
                05:00 AM – 10:00 AM IST
                <br />
                Air Force Station Suratgarh
              </p>
              <Countdown />
            </div>
            <div className="route-panel">
              <div className="route-title">
                <Route size={24} />
                <h3>Your race route</h3>
              </div>
              <Tabs defaultValue="5">
                <TabsList className="route-tabs">
                  {races.map((r) => (
                    <TabsTrigger value={r.distance} key={r.distance}>
                      {r.distance} KM
                    </TabsTrigger>
                  ))}
                </TabsList>
                {races.map((r) => (
                  <TabsContent value={r.distance} key={r.distance}>
                    <div className="route-pending">
                      <MapPin size={36} strokeWidth={1.3} />
                      <span className="status-chip">ROUTE TO BE ANNOUNCED</span>
                      <h4>{r.distance} KM · Suratgarh</h4>
                      <p>
                        The station route, assembly point and reporting
                        instructions will be shared here once finalised.
                      </p>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              <div className="route-note">
                <ShieldCheck size={17} />
                <p>
                  Entry is restricted to airwarriors and families. Follow
                  station entry instructions and event marshals on race day.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="faqs" className="section faq-section">
          <div>
            <div className="eyebrow">BEFORE THE START LINE</div>
            <h2>
              A few things{' '}
              <br />
              worth knowing.
            </h2>
            <p>
              Everything you need{' '}
              <br />
              to plan your participation.
            </p>
          </div>
          <div className="faq-list">
            {[
              [
                'Who can participate?',
                'The Suratgarh event is exclusively for airwarriors and their families. Registration requires email sign-in and the station invitation code shared by the organising team.',
              ],
              [
                'Which distances can I choose from?',
                'Choose the 5 KM Fun Run for ₹399, the 10 KM Challenge Run for ₹899, or the 21 KM Half Marathon for ₹899. Timed BIBs are included for the 10 KM and 21 KM categories.',
              ],
              [
                'What is included in my registration?',
                'Your registration includes an official race tee, finisher medal, participation certificate, runner cap, refreshments, energy drink, race photographs and a goodie bag.',
              ],
              [
                'How does payment confirmation work?',
                'When Suratgarh payments open, pay using the station payment details and upload your screenshot with the transaction reference. Uploading a receipt means your payment is awaiting review. The organising team verifies the transaction before confirming your entry.',
              ],
              [
                'How do I check my entry?',
                'Use My entry at the top of this page and sign in with the email used for registration. You can check submitted entries and payment status even after new registrations close, once the registration service is available.',
              ],
              [
                'Which T-shirt size should I choose?',
                'The supplier’s size guide is being finalised. If you are unsure, especially for a child, contact the organising team before choosing a size. Your selected size is shown again when you review the entry.',
              ],
              [
                'Where can I see the route and reporting instructions?',
                'Suratgarh route maps, assembly points and reporting instructions will be published in the Race day section after they are finalised.',
              ],
              [
                'When does registration close?',
                'The shared event registration deadline is 27 September 2026. Race day is Sunday, 4 October 2026, from 05:00 AM to 10:00 AM IST.',
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section id="contact" className="contact-section">
          <div>
            <div className="eyebrow">YOUR STATION ORGANISING TEAM</div>
            <h2>
              A little help
              <br />
              before the start?
            </h2>
            <p>For invitation codes, registration and race-day enquiries.</p>
          </div>
          <div className="contact-actions">
            {[
              ['88384 63776', '8838463776'],
              ['70279 64880', '7027964880'],
            ].map(([label, phone]) => (
              <a key={phone} href={`tel:+91${phone}`}>
                <Phone size={20} />
                <span>
                  <small>MARATHON ENQUIRIES</small>
                  <b>{label}</b>
                </span>
                <ArrowUpRight size={20} />
              </a>
            ))}
          </div>
        </section>
        <section className="closing-banner">
          <div>
            <div className="eyebrow light">4 OCTOBER 2026 / SURATGARH</div>
            <h2>See you at the start line.</h2>
            <p>Run, soar, inspire. Together.</p>
          </div>
          <a className="button orange" href="#races">
            {action} <ArrowRight size={21} />
          </a>
        </section>
      </main>
      <footer>
        <div className="footer-top">
          <a className="brand footer-brand" href="#main">
            <img
              src={`${base}/assets/sekhon-logo.webp`}
              alt="Sekhon Marathon"
            />
            <span>
              <b>SEKHON MARATHON 2026</b>
              <small>AIR FORCE STATION SURATGARH</small>
            </span>
          </a>
          <p>
            A tribute marathon celebrating courage,
            <br />
            endurance and the spirit of the Indian Air Force.
          </p>
          <div className="footer-contact">
            <span>MARATHON ENQUIRIES</span>
            <a href="tel:+918838463776">+91 88384 63776</a>
            <a href="tel:+917027964880">+91 70279 64880</a>
          </div>
        </div>
        <button
          className="text-link footer-entry"
          onClick={() => setSelected('status')}
        >
          My entry &amp; payment status <ArrowUpRight size={18} />
        </button>
        <div className="policy-links">
          <button onClick={() => setPolicy('terms')}>Terms & Conditions</button>
          <button onClick={() => setPolicy('privacy')}>Privacy Policy</button>
          <button onClick={() => setPolicy('refund')}>Refund Policy</button>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Sekhon Marathon · Suratgarh</span>
          <span>For airwarriors & families</span>
          <span>RUN. SOAR. INSPIRE.</span>
        </div>
      </footer>
      {showSticky && !selected && !policy && (
        <div className="mobile-register">
          <span>
            <small>{status}</small>
            <b>5 KM · 10 KM · 21 KM</b>
          </span>
          <a className="button" href="#races">
            View races <ArrowRight size={17} />
          </a>
        </div>
      )}
      {selected && (
        <Registration
          key={selected}
          race={selected === 'status' ? '5' : selected}
          mode={selected === 'status' ? 'status' : 'register'}
          onChooseRace={() => {
            setSelected(null);
            requestAnimationFrame(() =>
              document
                .getElementById('races')
                ?.scrollIntoView({ behavior: 'instant' }),
            );
          }}
          onClose={() => setSelected(null)}
          onPolicy={setPolicy}
        />
      )}
      {policy && (
        <PolicyDialog policy={policy} onClose={() => setPolicy(null)} />
      )}
    </>
  );
}
