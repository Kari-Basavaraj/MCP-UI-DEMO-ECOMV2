import "./bridge"; // auto-resize

interface Review {
  id: number;
  username: string;
  date: string;
  rating: number;
  text: string;
}

interface ReviewData {
  reviews: Review[];
  averageRating: number;
  count: number;
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const empty = 5 - full;
  return "★".repeat(full) + "☆".repeat(empty);
}

function render(data: ReviewData): void {
  const { reviews, averageRating, count } = data;

  // Update summary
  const avgEl = document.getElementById("rv-avg");
  const starsEl = document.getElementById("rv-stars");
  const countEl = document.getElementById("rv-count");
  if (avgEl) avgEl.textContent = averageRating.toFixed(1);
  if (starsEl) starsEl.textContent = renderStars(Math.round(averageRating));
  if (countEl) countEl.textContent = `${count} review${count !== 1 ? "s" : ""}`;

  // Calculate distribution
  const dist = [0, 0, 0, 0, 0]; // index 0 = 1-star, 4 = 5-star
  for (const r of reviews) {
    const idx = Math.min(Math.max(Math.round(r.rating), 1), 5) - 1;
    dist[idx]++;
  }
  const total = reviews.length || 1;
  const pcts = dist.map((d) => Math.round((d / total) * 100));

  const barsEl = document.getElementById("rv-bars");
  if (barsEl) {
    barsEl.innerHTML = [5, 4, 3, 2, 1]
      .map(
        (star) =>
          `<div class="rv-bar-row"><span class="rv-bar-label">${star} star</span><div class="rv-bar-bg"><div class="rv-bar-fill" style="width:${pcts[star - 1]}%"></div></div><span class="rv-bar-pct">${pcts[star - 1]}%</span></div>`
      )
      .join("");
  }

  // Render review cards
  const listEl = document.getElementById("rv-list");
  if (listEl) {
    if (reviews.length === 0) {
      listEl.innerHTML = `<p style="text-align:center;padding:24px;color:var(--sds-color-text-default-secondary);">No reviews yet.</p>`;
    } else {
      listEl.innerHTML = reviews
        .map(
          (r) => `
        <div class="rv-review">
          <div class="rv-review__header">
            <span class="rv-review__name">${r.username}</span>
            <span class="rv-review__stars">${renderStars(r.rating)}</span>
          </div>
          <p class="rv-review__text">${r.text}</p>
          <span class="rv-review__date">${r.date}</span>
        </div>`
        )
        .join("");
    }
  }
}

// Read pre-injected data
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) render(_injected);
