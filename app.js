const directions = {
  canvas: {
    index: "01",
    title: "Live Canvas",
    note: "Remote-native space, cartoon confidence.",
  },
  broadcast: {
    index: "02",
    title: "Launch Broadcast",
    note: "Big-match energy for very questionable shipping.",
  },
  code: {
    index: "03",
    title: "Code Cartoon",
    note: "Connected systems, animated like a comic.",
  },
};

const tabs = [...document.querySelectorAll("[data-set-direction]")];
const title = document.querySelector("#direction-title");
const note = document.querySelector("#direction-note");
const introIndex = document.querySelector(".intro-index");
const count = document.querySelector(".direction-count b");

function selectDirection(name, focus = false) {
  const direction = directions[name];
  if (!direction) return;

  document.body.dataset.direction = name;
  title.textContent = direction.title;
  note.textContent = direction.note;
  introIndex.textContent = direction.index;
  count.textContent = direction.index;

  tabs.forEach((tab) => {
    const selected = tab.dataset.setDirection === name;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });

  window.localStorage.setItem("ship-shape-direction", name);
}

tabs.forEach((tab, tabIndex) => {
  tab.addEventListener("click", () => selectDirection(tab.dataset.setDirection));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = tabIndex;
    if (event.key === "ArrowLeft") nextIndex = (tabIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") nextIndex = (tabIndex + 1) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    selectDirection(tabs[nextIndex].dataset.setDirection, true);
  });
});

document.querySelectorAll(".play-card").forEach((card) => {
  card.addEventListener("click", () => {
    const wasPicked = card.classList.contains("is-picked");
    document.querySelectorAll(".play-card").forEach((item) => item.classList.remove("is-picked"));
    if (!wasPicked) card.classList.add("is-picked");
  });
});

document.querySelectorAll(".roster-person").forEach((person) => {
  person.addEventListener("click", () => {
    const selected = person.classList.toggle("is-selected");
    person.setAttribute("aria-pressed", String(selected));

    const selectedPeople = document.querySelectorAll(".roster-person.is-selected");
    if (selectedPeople.length > 3) {
      const firstOther = [...selectedPeople].find((item) => item !== person);
      firstOther.classList.remove("is-selected");
      firstOther.setAttribute("aria-pressed", "false");
    }
  });
});

const saved = window.localStorage.getItem("ship-shape-direction");
selectDirection(directions[saved] ? saved : "canvas");
