(($) => {
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
    /** @var {HTMLElement[]} previews */
    previews = [];

    constructor() {
      super();
    }

    /**
     * Create previews for landscape and portrait
     * @return {HTMLElement[]}
     */
    createPreviews() {
      const landscape = createElement(/* html */ `<div
        data-focalpoint-preview data-landscape
        style="background-image: url(${this.img.src});"></div>
      `);
      const portrait = createElement(/* html */ `<div
        data-focalpoint-preview data-portrait
        style="background-image: url(${this.img.src});"></div>
      `);
      return [landscape, portrait];
    }

    /**
     * Called when the element is added to the DOM
     * @return {void}
     */
    connectedCallback() {
      this.id = this.getAttribute("data-id");
      this.input = $("input", this)[0];

      const mediaModalRoot = this.closest(".media-frame-content");
      const classicRoot = this.closest("#post-body-content");

      this.imageWrap = mediaModalRoot
        ? mediaModalRoot.querySelector(".thumbnail-image")
        : classicRoot.querySelector(".wp_attachment_image p");

      if (
        !this.imageWrap ||
        this.imageWrap.hasAttribute("data-wp-focalpoint-wrap")
      ) {
        return;
      }
      this.imageWrap.setAttribute("data-wp-focalpoint-wrap", "");

      this.img = this.imageWrap.querySelector("img");

      this.handle = createElement(/*html*/ `<button
            type="button"
            data-focal-point-handle
            tabindex="-1"
            title="Drag to change. Double-click to reset."></button>`);

      this.previews = this.createPreviews();
      this.previews.forEach((el) => document.body.appendChild(el));

      if (this.img.complete) {
        this.initializeUI();
      } else {
        this.img.addEventListener("load", this.initializeUI, { once: true });
      }
    }

    /**
     * Initialize the user interface
     * @return {void}
     */
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
          this.togglePreview(true);
          document.body.setAttribute("data-wp-focalpoint-dragging", "");
        },
        stop: () => {
          this.togglePreview(false);
          document.body.removeAttribute("data-wp-focalpoint-dragging");
          $("#focalpoint-input").trigger("change");
        },
        drag: this.applyFocalPointFromHandle,
      });
    };

    /**
     * Handle window resize event
     * @return {void}
     */
    onResize = () => {
      if (!document.contains(this)) {
        window.removeEventListener("resize", this.onResize);
        return;
      }

      const [leftPercent, topPercent] = this.getCurrentValue();
      this.setHandlePosition(leftPercent / 100, topPercent / 100);
      this.updatePreviews(leftPercent, topPercent);
    };

    /**
     * Get the current focal point value from the input
     * @return {number[]} The current focal point values [left, top].
     */
    getCurrentValue() {
      return this.input.value.split(" ").map((value) => parseFloat(value));
    }

    /**
     * Handle image click event
     * @param {MouseEvent} e - The mouse event.
     * @return {void}
     */
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
          progress: () => {
            // this.updatePreviews();
          },
          complete: () => {
            this.applyFocalPointFromHandle();
            $("#focalpoint-input").trigger("change");
          },
        },
      );
    };

    /**
     * Set the handle position, based on the image
     * @param {number} leftPercent - The left position as a percentage.
     * @param {number} topPercent - The top position as a percentage.
     * @return {void}
     */
    setHandlePosition(leftPercent, topPercent) {
      const { img, handle } = this;

      const left = img.offsetLeft + img.offsetWidth * leftPercent;
      const top = img.offsetTop + img.offsetHeight * topPercent;

      handle.style.setProperty("left", `${left}px`);
      handle.style.setProperty("top", `${top}px`);
    }

    /**
     * Apply the focal point values based on the handle position
     * @return {void}
     */
    applyFocalPointFromHandle = () => {
      const [leftPercent, topPercent] = this.getFocalPointFromHandle();
      $("#focalpoint-input").val(`${leftPercent} ${topPercent}`);
      this.updatePreviews(leftPercent, topPercent);
    };

    /**
     * Get the focal point from the handle position
     * @return {number[]} The focal point values [left, top].
     */
    getFocalPointFromHandle() {
      const { img, handle } = this;
      const handleRect = handle.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      return [
        (handleRect.left - imgRect.left) / imgRect.width,
        (handleRect.top - imgRect.top) / imgRect.height,
      ].map((number) => parseFloat((number * 100).toFixed(2)));
    }

    /**
     * Toggles the visibility of the preview pane
     * @param {boolean} visible
     * @return {void}
     */
    togglePreview(visible) {
      if (typeof visible !== "boolean") {
        throw new Error("togglePreview expects a boolean value");
      }
      if (!this.previews.length) {
        return;
      }
      this.previews.forEach((el) => el.classList.toggle("is-visible", visible));
    }

    /**
     * Set the preview position
     * @param {number} leftPercent
     * @param {number} topPercent
     * @return {void}
     */
    updatePreviews(leftPercent, topPercent) {
      if (!this.previews.length) {
        return;
      }
      if (typeof leftPercent !== "number") {
        throw new Error("leftPercent must be a number");
      }
      if (typeof topPercent !== "number") {
        throw new Error("topPercent must be a number");
      }
      this.previews.forEach((el) => {
        el.style.backgroundPosition = `${leftPercent}% ${topPercent}%`;
      });
    }
  }

  customElements.define("focal-point-picker", FocalPointPicker);
})(window.jQuery);
