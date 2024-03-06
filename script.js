// background progress bar
/**
 *
 * @param {*} triggerElement
 * @param {number} onEnterWidth
 * @param {number} onLeaveBackWidth
 */
function animateBar(triggerElement, onEnterWidth, onLeaveBackWidth) {
  const screenWidth = window.innerWidth;
  gsap.to(".bar", {
    scrollTrigger: {
      trigger: triggerElement,
      start: "top center",
      end: "bottom bottom",
      scrub: true,
      onEnter: () => {
        gsap.to(".bar", {
          width: onEnterWidth,
          duration: 0.2,
          ease: "none",
        });
      },
      onLeaveBack: () => {
        gsap.to(".bar", {
          width: onLeaveBackWidth,
          duration: 0.2,
          ease: "none",
        });
      },
    },
  });
}

animateBar("#part1", "35%", "0%");
animateBar("#part2", "65%", "35%");
animateBar("#part3", "100%", "65%");

// keyboard text effect
const keys = document.querySelectorAll(".key");

function pressRandomKey() {
  const randomKey = keys[Math.floor(Math.random() * keys.length)];

  randomKey.style.animation = "pressDown 0.2s ease-in-out";

  randomKey.onanimationend = () => {
    randomKey.style.animation = "";
    setTimeout(pressRandomKey, 100 + Math.random() * 300);
  };
}

pressRandomKey();

window.onscroll = function () {
  stickyScroll();
};

// Get the navbar
var navbar = document.getElementById("navbar");

// Get the offset position of the navbar
var sticky = navbar.offsetTop;

// Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
function stickyScroll() {
  if (window.scrollY >= sticky) {
    navbar.classList.add("sticky");
  } else {
    navbar.classList.remove("sticky");
  }
}

window.onload = function () {
  var speakersImages = document.getElementById("speakers-images");
  console.log({ speakersImages });
  speakersImages.scrollTop = 0; // Reset the scroll position to the top
};
