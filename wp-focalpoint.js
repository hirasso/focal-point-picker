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
      ".thumbnail-image"
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
      `<button type="button" data-focal-point-handle></button>`
    );
    this.handle.setAttribute("title", "Drag to change. Double-click to reset.");

    // this.preview = createElement(
    //   `<div data-focalpoint-preview style="background-image: url(${this.img.src});"></div>`
    // );
    // this.closest('.media-frame-content').querySelector('.attachment-details').appendChild(this.preview);

    if (this.img.complete) {
      this.initializeUI();
    } else {
      this.img.addEventListener("load", this.initializeUI, { once: true });
    }
  }

  initializeUI = () => {
    this.imageWrap.appendChild(this.handle);

    window.addEventListener("resize", this.onResize);
    this.onResize();

    this.img.addEventListener("click", this.onImageClick);

    $(this.handle).dblclick(() => {
      this.setHandlePosition(0.5, 0.5);
      this.applyFocalPointFromHandle();
      $("#focalpoint-input").trigger("change");
    });

    $(this.handle).draggable({
      cancel: false,
      containment: this.img,
      start: () => {
        document.body.setAttribute("data-wp-focalpoint-dragging", "");
      },
      stop: () => {
        document.body.removeAttribute("data-wp-focalpoint-dragging");
        $("#focalpoint-input").trigger("change");
      },
      drag: this.applyFocalPointFromHandle,
    });
  };

  onResize = () => {
    if (!this.offsetWidth === 0) {
      window.removeEventListener("resize", this.onResize);
      return;
    }

    const [leftPercent, topPercent] = this.input.value
      .split(" ")
      .map((value) => parseFloat(value) / 100);

    this.setHandlePosition(leftPercent, topPercent);
  };

  onImageClick = (e) => {
    const rect = this.imageWrap.getBoundingClientRect();
    const point = {
      x: e.x - rect.x,
      y: e.y - rect.y,
    };
    $(this.handle).animate(
      {
        left: point.x,
        top: point.y,
      },
      {
        duration: 150,
        complete: () => {
          this.applyFocalPointFromHandle();
          $("#focalpoint-input").trigger("change");
        },
      }
    );

    // this.handle.animate()
    // const xPercent = (e.x - rect.x) / rect.width;
    // const yPercent = (e.y - rect.y) / rect.height;
    // const { xPercent, yPercent } = e;
    // console.log({ x, y });
  };

  /**
   * Set the handle position, based on the image
   */
  setHandlePosition(leftPercent, topPercent) {
    const { img, handle } = this;

    const left = img.offsetLeft + img.offsetWidth * leftPercent;
    const top = img.offsetTop + img.offsetHeight * topPercent;

    handle.style.setProperty("left", `${left}px`);
    handle.style.setProperty("top", `${top}px`);
  }

  applyFocalPointFromHandle = () => {
    const { left, top } = this.getFocalPointFromHandle();
    $("#focalpoint-input").val(`${left} ${top}`);
  };

  /**
   * Set the focal point from the current handle position, relative to the image
   */
  getFocalPointFromHandle() {
    const { img, handle } = this;
    const handleRect = handle.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const left = ((handleRect.left - imgRect.left) / imgRect.width).toFixed(2);
    const top = ((handleRect.top - imgRect.top) / imgRect.height).toFixed(2);

    return {
      left: parseFloat(left) * 100,
      top: parseFloat(top) * 100,
    };
  }
}

customElements.define("focal-point-picker", FocalPointPicker);
