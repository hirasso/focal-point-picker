const $ = jQuery;

/**
 * Wait for a certain amount of milliseconds
 * @param {number} ms - The number of milliseconds to wait.
 * @return {Promise<void>} A promise that resolves after the specified time has passed.
 */
const wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * Create an element on the fly
 * @param {string} html - The HTML string to create the element from.
 * @return {Element} The created element.
 */
function createElement(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.children[0];
}

/**
 * Self-iniziating custom element for a native experience
 */
class FocalPointPicker extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {

    this.id = this.getAttribute("data-id");
    this.input = $("input", this)[0];

    this.imageWrap = this.closest(".media-frame-content").querySelector(
      ".thumbnail-image",
    );
    if (
      !this.imageWrap ||
      this.imageWrap.hasAttribute("data-wp-focalpoint-wrap")
    ) {
      return;
    }
    this.imageWrap.setAttribute("data-wp-focalpoint-wrap", "");
    this.img = this.imageWrap.querySelector("img");
    this.handle = createElement(
      `<button type="button" data-focal-point-handle></button>`,
    );

    if (this.img.complete) {
      this.initializeHandle();
    } else {
      this.img.addEventListener("load", this.initializeHandle, { once: true });
    }
  }

  initializeHandle = () => {
    this.imageWrap.appendChild(this.handle);

    window.addEventListener("resize", this.onResize);
    this.onResize();

    $(this.handle).draggable({
      cancel: false,
      containment: this.img,
      start: () => {
        document.body.setAttribute("data-wp-focalpoint-dragging", "");
      },
      stop: () => {
        document.body.removeAttribute("data-wp-focalpoint-dragging");
        $('#focalpoint-input').trigger("change");
      },
      drag: () => {
        const { left, top } = this.getFocalPointFromHandle();
        $('#focalpoint-input').val(`${left} ${top}`);
      },
    });
  };

  onResize = () => {
    if (!this.offsetWidth === 0) {
      window.removeEventListener("resize", this.onResize);
      return;
    }

    this.setHandlePosition();
  };

  /**
   * Set the handle position, based on the image
   */
  setHandlePosition() {
    const { img, handle } = this;
    const [leftPercent, topPercent] = this.input.value
      .split(" ")
      .map((value) => parseFloat(value) / 100);

    const left = img.offsetLeft + img.offsetWidth * leftPercent;
    const top = img.offsetTop + img.offsetHeight * topPercent;

    handle.style.setProperty("left", `${left}px`);
    handle.style.setProperty("top", `${top}px`);
  }

  /**
   * Set the focal point from the current handle position, relative to the image
   */
  getFocalPointFromHandle() {
    const { img, handle } = this;
    const handleRect = handle.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const leftPercent = (
      ((handleRect.left - imgRect.left) / imgRect.width) *
      100
    ).toFixed(2);
    const topPercent = (
      ((handleRect.top - imgRect.top) / imgRect.height) *
      100
    ).toFixed(2);

    return {
      left: leftPercent,
      top: topPercent,
    };
  }
}

customElements.define("focal-point-picker", FocalPointPicker);
