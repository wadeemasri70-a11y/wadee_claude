import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from './useLenis';
import { useReducedMotion } from './useReducedMotion';
import LazyScene from './LazyScene';

gsap.registerPlugin(ScrollTrigger);

/* Placeholders, kept in step with the root site's numbers — replace both. */
const STATS = [
  ['+400', 'موهبة صوتية'],
  ['8', 'لغات'],
  ['+1200', 'ساعة مدبلجة'],
  ['5', 'سنوات خبرة'],
];

const SERVICES = [
  {
    n: '01',
    title: 'الدوبلاج',
    body: 'من الترجمة والتوقيت إلى الأداء أمام الميكروفون، بإشراف مخرج صوتي في كل جلسة — لا جلسة بلا إخراج.',
  },
  {
    n: '02',
    title: 'التعليق الصوتي',
    body: 'إعلانات ووثائقيات وهويات صوتية للعلامات، بأصوات تختارها بنفسك من مكتبة مسموعة قبل الحجز.',
  },
  {
    n: '03',
    title: 'المكس والماسترينغ',
    body: 'مكس ستيريو و 5.1 مُعاير على مستويات المنصات، يجتاز فحص التسليم من المرّة الأولى.',
  },
];

const WORKS = [
  ['مسلسل درامي تركي', '32 حلقة · دوبلاج كامل'],
  ['سلسلة وثائقية', '8 حلقات · تعليق صوتي'],
  ['فيلم رسوم متحركة', '96 دقيقة · دوبلاج + مكس 5.1'],
  ['حملة علامة تجارية', '6 إعلانات · هوية صوتية'],
];

const PROCESS = [
  ['القراءة', 'نقرأ النص كاملاً ونضبط التوقيت واللهجة قبل أن يدخل أي صوت الاستوديو.'],
  ['الكاستنغ', 'ترشيحات صوتية مسموعة لكل شخصية، وتختار أنت.'],
  ['التسجيل', 'جلسات بإشراف مخرج، ومتابعة حيّة عن بُعد إن رغبت.'],
  ['المكس والتسليم', 'مكس، ماسترينغ، وفحص تقني — ثم التسليم بصيغ المنصة.'],
];

/* Words wrapped in masks so the hero can reveal them line-by-line. */
function SplitWords({ text, className = '' }) {
  return (
    <span className={className}>
      {text.split(' ').map((word, i) => (
        <span className="mask" key={`${word}-${i}`}>
          <span className="word">{word}</span>
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const reduced = useReducedMotion();
  useLenis();
  const root = useRef(null);

  useEffect(() => {
    if (reduced) return;

    const ctx = gsap.context(() => {
      /* ── the one orchestrated moment: the hero writes itself in ── */
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.from('.hero__title .word', { yPercent: 115, duration: 1.15, stagger: 0.08 })
        .from('.hero__kicker', { opacity: 0, duration: 0.8 }, 0.15)
        .from('.hero__sub', { y: 24, opacity: 0, duration: 0.9 }, '-=0.75')
        .from('.hero__cta > *', { y: 20, opacity: 0, duration: 0.7, stagger: 0.09 }, '-=0.6')
        .from('.hero__cue', { opacity: 0, duration: 0.6 }, '-=0.4')
        .from('.nav', { opacity: 0, duration: 0.8 }, 0.4);

      /* Hero text drifts up and dissolves into the field as you leave it. */
      gsap.to('.hero__inner', {
        yPercent: -18,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      /* ── one reveal, reused everywhere: a single motion language ── */
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el.children, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 82%' },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={root}>
      <header className="nav">
        <a className="nav__brand" href="#top">أوان<span>.</span></a>
        <nav className="nav__links">
          <a href="#services">خدماتنا</a>
          <a href="#works">أعمالنا</a>
          <a href="#process">كيف نشتغل</a>
        </nav>
        <a className="btn btn--sm" href="#contact">احجز جلسة</a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__scene">
            <LazyScene fallback={<div className="scene-still" />} />
          </div>

          <div className="hero__inner">
            <p className="hero__kicker">استوديوهات أوان للدوبلاج</p>
            <h1 className="hero__title">
              <SplitWords text="نُعطي الصورة صوتاً" />
            </h1>
            <p className="hero__sub">
              دوبلاج وتعليق صوتي ومكس بمعايير المنصات العالمية — بأصوات عربية
              تُختار لكل شخصية، لا تُوزَّع عليها.
            </p>
            <div className="hero__cta">
              <a className="btn btn--primary" href="#contact">ابدأ مشروعك</a>
              <a className="btn btn--ghost" href="#works">استمع لأعمالنا</a>
            </div>
          </div>

          <div className="hero__cue" aria-hidden="true"><span /> مرّر</div>
        </section>

        <section className="strip">
          <ul className="stats reveal">
            {STATS.map(([n, label]) => (
              <li key={label}>
                <b>{n}</b>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="section" id="services">
          <div className="head reveal">
            <p className="eyebrow">ما نُقدّمه</p>
            <h2>ثلاث خدمات، سلسلة واحدة لا تنكسر.</h2>
          </div>
          <div className="cards reveal">
            {SERVICES.map((s) => (
              <article className="card" key={s.n}>
                <span className="card__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="works">
          <div className="head reveal">
            <p className="eyebrow">أعمالنا</p>
            <h2>مشاريع خرجت من هذه الغرف.</h2>
          </div>
          <ul className="works reveal">
            {WORKS.map(([title, meta]) => (
              <li className="work" key={title}>
                <h3>{title}</h3>
                <span>{meta}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="section" id="process">
          <div className="head reveal">
            <p className="eyebrow">كيف نشتغل</p>
            <h2>أربع مراحل، ولا مفاجآت في آخرها.</h2>
          </div>
          <ol className="process reveal">
            {PROCESS.map(([title, body], i) => (
              <li key={title}>
                <b>{String(i + 1).padStart(2, '0')}</b>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="section contact" id="contact">
          <div className="reveal">
            <h2>عندك عمل يستحق صوتاً؟</h2>
            <p>أرسل لنا الحلقة الأولى، ونرجع لك بترشيحات صوتية خلال 48 ساعة.</p>
            <a className="btn btn--primary" href="mailto:info@awan-group.com">info@awan-group.com</a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <span>أوان للدوبلاج</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
