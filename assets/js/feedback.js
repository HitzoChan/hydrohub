// TEMP DATA
const reviews = [
  {
    name: "Maria Santos",
    rating: 5,
    date: "2026-03-25",
    text: "Excellent service! Delivered on time.",
    driver: "John Driver"
  },
  {
    name: "Juan Dela Cruz",
    rating: 5,
    date: "2026-03-24",
    text: "Great quality water.",
    driver: "Mike Rider"
  },
  {
    name: "Anna Reyes",
    rating: 4,
    date: "2026-03-24",
    text: "Good but slightly late.",
    driver: "John Driver"
  }
];

// RENDER REVIEWS
const list = document.getElementById("reviewsList");

reviews.forEach(r => {
  list.innerHTML += `
    <div class="review-card">
      <div class="review-header">
        <div>
          <div class="review-name">${r.name}</div>
          <div class="stars">${"★".repeat(r.rating)}</div>
        </div>
        <small>${r.driver}</small>
      </div>

      <div class="review-text">${r.text}</div>
    </div>
  `;
});

// RATING DISTRIBUTION
const ratings = [145, 35, 15, 3, 2]; // 5 to 1 stars

const bars = document.getElementById("ratingBars");

ratings.forEach((val, i) => {
  bars.innerHTML += `
    <div class="d-flex align-items-center mb-2">
      <small class="me-2">${5 - i}★</small>
      <div class="progress w-100 me-2">
        <div class="progress-bar" style="width:${val}px"></div>
      </div>
      <small>${val}</small>
    </div>
  `;
});