gsap.registerPlugin(ScrollTrigger);

// Parallax Hero
gsap.to(".hero .content", {
  yPercent: 50,
  ease: "none",
  scrollTrigger: {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: true
  }
});

// Cave Section Animations
const caveTl = gsap.timeline({
  scrollTrigger: {
    trigger: "#cave",
    start: "top top",
    end: "+=100%", // pin for 1 screen height
    pin: true,
    scrub: 1
  }
});

caveTl.to("#cave .background", { scale: 1.1, duration: 1 })
      .to("#cave .text-block", { opacity: 1, y: 0, duration: 0.5 }, "-=0.8")
      .to("#cave .soil-object", { opacity: 1, scale: 1, duration: 0.5 }, "-=0.5");


// Valley Section (Horizontal Scroll)
const valleyContent = document.querySelector("#valley .content");
const valleyScrollWidth = valleyContent.scrollWidth - window.innerWidth;

const valleyTl = gsap.timeline({
  scrollTrigger: {
    trigger: "#valley",
    start: "top top",
    end: () => `+=${valleyScrollWidth}`,
    pin: true,
    scrub: 1
  }
});

// Move horizontally
valleyTl.to(valleyContent, {
  x: -valleyScrollWidth,
  ease: "none",
  duration: 2
});

// Fade in elements as they enter
gsap.utils.toArray("#valley .text-block").forEach(block => {
  gsap.to(block, {
    opacity: 1,
    y: 0,
    scrollTrigger: {
      trigger: block,
      start: "left center",
      end: "right center",
      containerAnimation: valleyTl,
      toggleActions: "play none none reverse"
    }
  });
});

gsap.to("#valley .soil-object", {
  opacity: 1,
  scale: 1,
  rotation: 15,
  scrollTrigger: {
    trigger: "#valley .soil-object",
    start: "left center",
    end: "right center",
    containerAnimation: valleyTl,
    toggleActions: "play none none reverse"
  }
});


// Mountain Section
const mountainTl = gsap.timeline({
  scrollTrigger: {
    trigger: "#mountain",
    start: "top top",
    end: "+=150%",
    pin: true,
    scrub: 1
  }
});

mountainTl.fromTo("#mountain .background", { yPercent: -20 }, { yPercent: 0, duration: 1 })
          .to("#mountain .text-block", { opacity: 1, y: 0, duration: 1 }, "<")
          .to("#mountain .soil-object", { opacity: 1, scale: 1, rotation: -10, duration: 1 }, "<");
