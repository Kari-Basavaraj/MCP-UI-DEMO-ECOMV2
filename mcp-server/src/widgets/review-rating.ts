import { App } from "@modelcontextprotocol/ext-apps";

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

const app = new App({ name: "Review Rating", version: "1.0.0" });

function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const emptyStars = 5 - fullStars;
  return "★".repeat(fullStars) + "☆".repeat(emptyStars);
}

function render(data: ReviewData): void {
  const container = document.getElementById("review-container");
  if (!container) return;

  const { reviews, averageRating, count } = data;

  container.innerHTML = `
    <div class="reviews">
      <div class="reviews__header">
        <h2 class="reviews__title">Customer Reviews</h2>
        <button class="reviews__write-btn" data-action="write-review">Write a Review</button>
      </div>

      <div class="reviews__summary">
        <div class="reviews__average">
          <span class="reviews__average-number">${averageRating.toFixed(1)}</span>
          <span class="reviews__average-stars">${renderStars(Math.round(averageRating))}</span>
        </div>
        <span class="reviews__count">${count} review${count !== 1 ? "s" : ""}</span>
      </div>

      <div class="reviews__list">
        ${
          reviews.length === 0
            ? `<p class="reviews__empty">No reviews yet. Be the first to review!</p>`
            : reviews
                .map(
                  (review) => `
            <div class="reviews__card" data-review-id="${review.id}">
              <div class="reviews__card-header">
                <span class="reviews__card-username">${review.username}</span>
                <span class="reviews__card-date">${review.date}</span>
              </div>
              <div class="reviews__card-rating">${renderStars(review.rating)}</div>
              <p class="reviews__card-text">${review.text}</p>
              <div class="reviews__card-actions">
                <button class="reviews__helpful-btn" data-action="helpful" data-review-id="${review.id}">👍 Helpful</button>
                <button class="reviews__not-helpful-btn" data-action="not-helpful" data-review-id="${review.id}">👎 Not Helpful</button>
              </div>
            </div>`
                )
                .join("")
        }
      </div>
    </div>
  `;
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      if (data.reviews !== undefined && data.averageRating !== undefined) {
        render(data as ReviewData);
      }
    } catch {
      /* fallback */
    }
  }
};

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.dataset.action;

  switch (action) {
    case "write-review":
      // Could open a review form modal or navigate to review page
      break;

    case "helpful": {
      const reviewId = Number(btn.dataset.reviewId);
      if (reviewId) {
        btn.classList.add("reviews__helpful-btn--active");
        btn.textContent = "👍 Helpful ✓";
      }
      break;
    }

    case "not-helpful": {
      const reviewId = Number(btn.dataset.reviewId);
      if (reviewId) {
        btn.classList.add("reviews__not-helpful-btn--active");
        btn.textContent = "👎 Not Helpful ✓";
      }
      break;
    }
  }
});

// Fallback: read pre-injected data when ext-apps bridge is not available
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  render(_injected);
}

app.connect();
