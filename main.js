/* ═══════════════════════════════════════════════════════════════════════
   Céline — site behaviour

   Three of them, each self-contained and each optional: the mobile menu,
   the parts browser, and the scroll reveal. No dependencies, no build step.

   The rule throughout is that nothing here is load-bearing for reading the
   page. Every hidden state is enabled by a class this file (or the inline
   script in <head>) sets, so a blocked or broken script leaves the page
   fully readable rather than blank.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ══ mobile menu ═════════════════════════════════════════════════════ */

  const initMobileMenu = () => {
    const button = document.getElementById("menuBtn");
    const nav = document.getElementById("nav-mobile");

    if (!button || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      button.setAttribute("aria-expanded", String(open));
    };

    button.addEventListener("click", () => setOpen(!nav.classList.contains("open")));

    // Any tap on a link closes it again.
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
  };


  /* ══ parts browser ═══════════════════════════════════════════════════ */

  /*  A vertical tab set: one tab per family in the picker, one panel per
      family in the reading pane, and every part in that family stacked inside
      its panel. Grouped this way rather than one part per tab because a
      single part is a paragraph or two — twenty tabs of that read as twenty
      near-empty pages, where five read as five pages worth scrolling.

      Arrow keys walk the picker and wrap at the ends.

      The open panel is named in the URL fragment (#panel-valves) so a family
      can be linked to, using replaceState rather than assigning to
      location.hash — the latter scrolls the panel under the header. Individual
      parts keep an id too (#part-triode), so a link to one part opens its
      family and scrolls to it. */

  const initPartsBrowser = () => {
    const browser = document.getElementById("browser");
    if (!browser) return;

    const tabs = Array.from(browser.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;

    const panelFor = (tab) => document.getElementById(tab.getAttribute("aria-controls"));

    const select = (tab, { focus = false, recordInUrl = true } = {}) => {
      tabs.forEach((other) => {
        const isSelected = other === tab;
        other.setAttribute("aria-selected", String(isSelected));
        other.tabIndex = isSelected ? 0 : -1;
        panelFor(other)?.classList.toggle("is-open", isSelected);
      });

      if (focus) tab.focus();
      if (recordInUrl) history.replaceState(null, "", "#" + tab.getAttribute("aria-controls"));
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab));

      tab.addEventListener("keydown", (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        let target = null;

        if (step !== undefined) target = tabs[(index + step + tabs.length) % tabs.length];
        else if (event.key === "Home") target = tabs[0];
        else if (event.key === "End") target = tabs[tabs.length - 1];

        if (!target) return;
        event.preventDefault();
        select(target, { focus: true });
      });
    });

    /*  What the fragment points at, if anything: either a family panel, or a
        part inside one. Looked up by element rather than by comparing strings
        so both kinds of link resolve through the same path. A fragment that
        is not valid percent-encoding throws on decode, hence the try. */
    const targetedId = () => {
      if (location.hash.length < 2) return "";
      try { return decodeURIComponent(location.hash.slice(1)); }
      catch { return location.hash.slice(1); }
    };

    const targeted = document.getElementById(targetedId());
    const group = targeted?.closest(".part-group");
    const requested = group
      ? tabs.find((tab) => tab.getAttribute("aria-controls") === group.id)
      : null;

    // Open whatever the URL asks for, or the first family. Not recorded back
    // into the URL: arriving at the page should not rewrite the address bar.
    select(requested ?? tabs[0], { recordInUrl: false });

    /*  A link to a part inside a family needs scrolling to as well: the
        browser tried before this ran, while the panel was still hidden, so
        nothing moved. Deferred a frame so it measures the opened panel. */
    if (requested && targeted !== group) {
      requestAnimationFrame(() => targeted.scrollIntoView({ block: "start" }));
    }
  };


  /* ══ scroll reveal ═══════════════════════════════════════════════════ */

  const REVEAL_SELECTOR = [
    ".section .kicker",
    ".section .section-title",
    ".section .lede",
    ".two-col > *",
    ".steps li",
    ".shot",
    ".keys",
    ".browser",
    ".dl",
    ".callout",
    ".licences",
    ".credits",
    ".sheet",
  ].join(", ");

  const initScrollReveal = () => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;

    const targets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    if (targets.length === 0) return;

    // Only now does the hidden state exist in CSS. Setting it here rather
    // than in the markup means a failure anywhere above this line leaves the
    // page fully readable instead of blank.
    document.documentElement.classList.add("js-anim");

    const reveal = (element) => element.classList.add("in");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    targets.forEach((element, index) => {
      element.classList.add("reveal");
      // A small stagger within each row, capped so nothing lags visibly.
      element.style.transitionDelay = (index % 4) * 60 + "ms";
      observer.observe(element);
    });

    // Failsafe: if anything is still hidden after five seconds — an observer
    // that never fired, a print, a browser that scrolled oddly — show it.
    window.setTimeout(() => targets.forEach(reveal), 5000);
  };


  /* ══ go ══════════════════════════════════════════════════════════════ */

  initMobileMenu();
  initPartsBrowser();
  initScrollReveal();
})();
