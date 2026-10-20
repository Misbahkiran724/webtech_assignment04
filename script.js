(() => {
  "use strict";

  const STORAGE_KEY = "slidecraft-markdown-v1";

  const DEFAULT_MARKDOWN = `# My Slides

## How to Use

- Write your text on the left.
- Use \`#\` for a heading.
- Use \`-\` for a list.
- Use \`---\` to make a new slide.

---

# Save Slides

- Click Save to save your slides.
- Press Ctrl + S to save quickly.

---

# Presentation

- Click Present to show your slides.
- Use arrow keys to change slides.
- Press F11 for fullscreen.

---

# Thank You

Thank you!`;

  const input = document.getElementById("markdownInput");
  const slideCanvas = document.getElementById("slideCanvas");
  const presentationCanvas = document.getElementById("presentationCanvas");
  const slideCount = document.getElementById("slideCount");
  const presentationCount = document.getElementById("presentationCount");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const presentPrevBtn = document.getElementById("presentPrevBtn");
  const presentNextBtn = document.getElementById("presentNextBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const exitFullscreenBtn = document.getElementById("exitFullscreenBtn");
  const overlay = document.getElementById("presentationOverlay");
  const saveStatus = document.getElementById("saveStatus");
  const lineCount = document.getElementById("lineCount");
  const toast = document.getElementById("toast");

  let slides = [];
  let currentSlide = 0;
  let toastTimer = null;
  let saveTimer = null;
  let isPresenting = false;

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function markdownToHtml(markdown) {
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(markdown, {
        breaks: true,
        gfm: true
      });
    }

    let html = escapeHtml(markdown);

    html = html
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^- (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*?<\/li>\n?)+/g, "<ul>$&</ul>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");

    return "<p>" + html + "</p>";
  }

  function parseSlides(markdown) {
    const chunks = markdown.split(/^\s*---\s*$/m);
    const clean = chunks.map(s => s.trim()).filter(s => s.length > 0);
    return clean.length ? clean : [""];
  }

  function setSavedState(saved) {
    saveStatus.innerHTML = saved
      ? '<span class="status-dot"></span> All changes saved'
      : '<span class="status-dot unsaved"></span> Unsaved changes';
  }

  function render() {
    slides = parseSlides(input.value);

    if (currentSlide >= slides.length) {
      currentSlide = slides.length - 1;
    }

    if (currentSlide < 0) {
      currentSlide = 0;
    }

    const html = markdownToHtml(slides[currentSlide] || "");

    slideCanvas.innerHTML = html ||
      "<p class='empty-slide'>Start typing Markdown to create your first slide.</p>";

    presentationCanvas.innerHTML = html ||
      "<p>Start typing Markdown to create your first slide.</p>";

    const countText = `${currentSlide + 1} / ${slides.length}`;

    slideCount.textContent = countText;
    presentationCount.textContent = countText;

    const totalLines = input.value.split("\n").length;
    lineCount.textContent = `${totalLines} line${totalLines === 1 ? "" : "s"}`;

    prevBtn.disabled = currentSlide === 0;
    presentPrevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === slides.length - 1;
    presentNextBtn.disabled = currentSlide === slides.length - 1;
  }

  function goToSlide(index) {
    currentSlide = Math.max(0, Math.min(index, slides.length - 1));
    render();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  function saveSlides(showMessage = true) {
    try {
      localStorage.setItem(STORAGE_KEY, input.value);
      setSavedState(true);

      if (showMessage) {
        showToast("Slides saved in this browser.");
      }

      return true;
    } catch (error) {
      setSavedState(false);
      showToast("Could not save. Check browser storage settings.");
      return false;
    }
  }

  function scheduleSave() {
    setSavedState(false);
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
      saveSlides(false);
    }, 450);
  }

  async function enterPresentation() {
    isPresenting = true;

    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-presenting");

    fullscreenBtn.innerHTML = "⛶ <span>Exit full screen</span>";
    fullscreenBtn.title = "Exit full screen (Esc)";
    exitFullscreenBtn.innerHTML = "⛶ <span>Exit full screen</span>";

    try {
      if (!document.fullscreenElement && overlay.requestFullscreen) {
        await overlay.requestFullscreen();
      }
    } catch (error) {
      // Presentation still works if fullscreen is unavailable.
    }

    input.blur();
    render();
  }

  async function exitPresentation() {
    isPresenting = false;

    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-presenting");

    fullscreenBtn.innerHTML = "⛶ <span>Full screen</span>";
    fullscreenBtn.title = "Full screen (F11)";
    exitFullscreenBtn.innerHTML = "⛶ <span>Exit full screen</span>";

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        // Ignore fullscreen exit errors.
      }
    }

    render();
  }

  async function togglePresentation() {
    if (isPresenting) {
      await exitPresentation();
    } else {
      await enterPresentation();
    }
  }

  input.addEventListener("input", () => {
    render();
    scheduleSave();
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Tab") {
      event.preventDefault();

      const start = input.selectionStart;
      const end = input.selectionEnd;

      input.setRangeText("  ", start, end, "end");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  prevBtn.addEventListener("click", () => {
    goToSlide(currentSlide - 1);
  });

  presentPrevBtn.addEventListener("click", () => {
    goToSlide(currentSlide - 1);
  });

  nextBtn.addEventListener("click", () => {
    goToSlide(currentSlide + 1);
  });

  presentNextBtn.addEventListener("click", () => {
    goToSlide(currentSlide + 1);
  });

  fullscreenBtn.addEventListener("click", togglePresentation);
  exitFullscreenBtn.addEventListener("click", exitPresentation);

  document.getElementById("saveBtn").addEventListener("click", () => {
    saveSlides(true);
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Replace the current presentation with the example slides?")) {
      input.value = DEFAULT_MARKDOWN;
      currentSlide = 0;
      render();
      saveSlides(false);
      showToast("Example presentation restored.");
    }
  });

  document.getElementById("downloadBtn").addEventListener("click", () => {
    const blob = new Blob([input.value], {
      type: "text/markdown;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "presentation.md";

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    showToast("Markdown file exported.");
  });

  document.addEventListener("keydown", event => {
    const target = event.target;

    const typing = target && (
      target.tagName === "TEXTAREA" ||
      target.tagName === "INPUT" ||
      target.isContentEditable
    );

    if ((event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveSlides(true);
      return;
    }

    if (event.key === "F11") {
      event.preventDefault();
      togglePresentation();
      return;
    }

    if (event.key === "Escape" && isPresenting) {
      exitPresentation();
      return;
    }

    if (!isPresenting && typing) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToSlide(currentSlide - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToSlide(currentSlide + 1);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && isPresenting) {
      isPresenting = false;

      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-presenting");

      fullscreenBtn.innerHTML = "⛶ <span>Full screen</span>";
      fullscreenBtn.title = "Full screen (F11)";

      render();
    }
  });

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    // Load the new slides even if the browser has older saved example text.
    if (saved !== null && saved.includes("# My Slides")) {
      input.value = saved;
      setSavedState(true);
    } else {
      input.value = DEFAULT_MARKDOWN;
      setSavedState(false);
      localStorage.setItem(STORAGE_KEY, DEFAULT_MARKDOWN);
    }
  } catch (error) {
    input.value = DEFAULT_MARKDOWN;
    setSavedState(false);
  }

  render();
})();