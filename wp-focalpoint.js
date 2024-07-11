"use strict";

/**
 * @typedef {import('jquery')} jQuery
 * @typedef {import('jqueryui')} jQueryUI
 */

(($) => {
  /**
   * Wait for two animation frames
   * @returns {Promise<void>}
   */
  function nextTick() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }
  /**
   * Test if the current browser supports async/await
   * @returns {boolean}
   */
  function supportsAsyncAwait() {
    try {
      new Function("return (async () => {})();");
      return true;
    } catch (e) {
      return false;
    }
  }
  /**
   * Create an element on the fly
   * @param {string} html - The HTML string to create the element from.
   * @return {HTMLElement} The created element.
   */
  function createElement(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return /** @type {HTMLElement} */ (template.content.children[0]);
  }

  /**
   * Self-iniziating custom element for a native experience
   */
  class FocalPointPicker extends HTMLElement {
    /** @type {HTMLInputElement} preview */
    input;
    /** @type {HTMLElement} preview */
    preview;
    /** @type {HTMLButtonElement} handle */
    handle;
    /** @type {boolean} dragging */
    dragging = false;

    constructor() {
      super();
      this.input = /** @type {!HTMLInputElement} */ (
        this.querySelector("input")
      );
      this.preview = /** @type {!HTMLInputElement} */ (
        this.querySelector("[data-focalpoint-preview]")
      );
      this.handle = /** @type {!HTMLButtonElement} */ (
        this.querySelector("[data-focal-point-handle]")
      );
    }

    /**
     * Called when the element is added to the DOM
     * @return {void}
     */
    connectedCallback() {
      if (!supportsAsyncAwait()) {
        console.error("The current browser doesn't support async / await.");
        return;
      }
      this.init();
    }

    /**
     * Initialize everyhing when connected to the DOM
     * @return {Promise<void>}
     */
    async init() {
      await nextTick();

      if (!document.contains(this)) {
        return;
      }

      const mediaModalRoot = this.closest(".media-frame-content");
      const classicRoot = this.closest("#post-body-content");

      this.imageWrap = mediaModalRoot
        ? mediaModalRoot.querySelector(".thumbnail-image")
        : classicRoot
          ? classicRoot.querySelector(".wp_attachment_image p")
          : undefined;

      if (
        !this.imageWrap ||
        this.imageWrap.hasAttribute("data-wp-focalpoint-wrap")
      ) {
        return;
      }
      this.imageWrap.setAttribute("data-wp-focalpoint-wrap", "");

      this.img = this.imageWrap.querySelector("img");
      if (!this.img) {
        console.error("no image found in imageWrap", this.imageWrap);
        return;
      }

      if (this.img.complete) {
        this.initializeUI();
      } else {
        this.img.addEventListener("load", this.initializeUI, { once: true });
      }
    }

    /**
     * Clean up after us the element is removed from the DOM
     * @return {void}
     */
    disconnectedCallback() {
      const { handle, preview } = this;

      if (preview) {
        this.appendChild(preview);
      }
      if (handle) {
        this.appendChild(handle);
      }
      window.removeEventListener("resize", this.onResize);
    }

    /**
     * Initialize the user interface
     * @return {void}
     */
    initializeUI = () => {
      const { imageWrap, img, handle, preview } = this;

      if (!imageWrap || !img) {
        console.error("Some elements are missing", { imageWrap, img });
        return;
      }

      imageWrap.appendChild(handle);
      document.body.appendChild(preview);

      preview.style.setProperty("--image", `url(${img.src}`);

      window.addEventListener("resize", this.onResize);
      this.onResize();

      img.addEventListener("click", this.onImageClick);

      $(handle).on("dblclick", () => {
        this.setHandlePosition(0.5, 0.5);
        this.applyFocalPointFromHandle();
        $("#focalpoint-input").trigger("change");
      });

      $(handle).on("mouseenter", () => this.togglePreview(true));
      $(handle).on("mouseleave", () => {
        if (!this.dragging) {
          this.togglePreview(false);
        }
      });

      $(handle).draggable({
        cancel: "none",
        containment: img,
        start: () => {
          this.dragging = true;
          this.togglePreview(true);
          document.body.setAttribute("data-wp-focalpoint-dragging", "");
        },
        stop: () => {
          this.dragging = false;
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
      const [leftPercent, topPercent] = this.getCurrentValue();
      this.setHandlePosition(leftPercent / 100, topPercent / 100);
      this.updatePreview(leftPercent, topPercent);
    };

    /**
     * Get the current focal point value from the input
     * @return {number[]} The current focal point values [left, top].
     */
    getCurrentValue() {
      const { input } = this;
      if (!input) {
        console.error("no input found", { input });
        return [50, 50];
      }
      const fallback = [50, 50];
      const inputValue = input.value.trim();
      const values = inputValue.split(" ");

      if (values.length > 2) {
        console.error("invalid value:", inputValue);
        return fallback;
      }

      return values.map((/** @type {string} */ value) => parseFloat(value));
    }

    /**
     * Handle image click event
     * @param {MouseEvent} e - The mouse event.
     * @return {void}
     */
    onImageClick = (e) => {
      const { imageWrap, handle } = this;
      if (!imageWrap) {
        return;
      }

      const rect = imageWrap.getBoundingClientRect();
      const point = {
        x: e.x - rect.x,
        y: e.y - rect.y,
      };
      $(handle).animate(
        {
          left: point.x,
          top: point.y,
        },
        {
          duration: 150,
          progress: () => {
            // this.updatePreview();
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

      if (!img) {
        return;
      }

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
      this.updatePreview(leftPercent, topPercent);
    };

    /**
     * Get the focal point from the handle position
     * @return {number[]} The focal point values [left, top].
     */
    getFocalPointFromHandle() {
      const { img, handle } = this;

      if (!img) {
        console.error("missing image", { img });
        return [50, 50];
      }

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
      if (!this.preview) {
        return;
      }
      this.preview.classList.toggle("is-visible", visible);
    }

    /**
     * Set the preview position
     * @param {number} leftPercent
     * @param {number} topPercent
     * @return {void}
     */
    updatePreview(leftPercent, topPercent) {
      if (!this.preview) {
        return;
      }
      if (typeof leftPercent !== "number") {
        throw new Error("leftPercent must be a number");
      }
      if (typeof topPercent !== "number") {
        throw new Error("topPercent must be a number");
      }
      this.preview.style.setProperty("--focal-left", `${leftPercent}%`);
      this.preview.style.setProperty("--focal-top", `${topPercent}%`);
    }
  }

  customElements.define("focal-point-picker", FocalPointPicker);
})(/** @type {jQuery} */ jQuery);
