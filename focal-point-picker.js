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
    /** @type {HTMLButtonElement} resetButton */
    resetButton;
    /** @type {boolean} dragging */
    dragging = false;
    defaultValue = [0.5, 0.5];

    constructor() {
      super();
      this.input = /** @type {!HTMLInputElement} */ (
        this.querySelector("input")
      );
      this.preview = /** @type {!HTMLInputElement} */ (
        this.querySelector("[data-focalpoint-preview]")
      );
      this.handle = /** @type {!HTMLButtonElement} */ (
        this.querySelector("[data-focalpoint-handle]")
      );
      this.resetButton = /** @type {!HTMLButtonElement} */ (
        this.querySelector("[data-focalpoint-reset]")
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

      const imageWrap = mediaModalRoot
        ? mediaModalRoot.querySelector(".thumbnail-image")
        : classicRoot
          ? classicRoot.querySelector(".wp_attachment_image p")
          : undefined;

      if (!imageWrap) {
        console.error("No imageWrap found", this);
        return;
      }

      if (imageWrap.hasAttribute("data-fcp-wrap")) {
        console.log("already initialized", this);
        return;
      }

      imageWrap.setAttribute("data-fcp-wrap", "");

      this.imageWrap = imageWrap;
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
      const { handle, preview, img, imageWrap, resetButton } = this;

      if (preview) {
        this.appendChild(preview);
      }
      if (handle) {
        this.appendChild(handle);
      }
      if (img) {
        img.removeEventListener("click", this.onImageClick);
      }
      if (imageWrap) {
        imageWrap.removeAttribute("data-fcp-wrap");
      }
      if (resetButton) {
        resetButton.removeEventListener("click", this.reset);
      }
      window.removeEventListener("resize", this.updateUIFromValue);
    }

    /**
     * Initialize the user interface
     * @return {void}
     */
    initializeUI = () => {
      const { imageWrap, img, handle, preview, resetButton } = this;

      if (!imageWrap || !img) {
        console.error("Some elements are missing", { imageWrap, img });
        return;
      }

      imageWrap.appendChild(handle);
      document.body.appendChild(preview);

      preview.style.setProperty("--image", `url(${img.src}`);

      window.addEventListener("resize", this.updateUIFromValue);
      this.updateUIFromValue();

      img.addEventListener("click", this.onImageClick);
      resetButton.addEventListener("click", this.reset);

      $(handle).on("dblclick", this.reset);

      // $(handle).on("mouseenter", () => this.togglePreview(true));
      // $(handle).on("mouseleave", () => {
      //   if (!this.dragging) {
      //     this.togglePreview(false);
      //   }
      // });

      $(handle).draggable({
        cancel: "none",
        containment: img,
        start: () => {
          this.dragging = true;
          this.togglePreview(true);
          document.body.setAttribute("data-fcp-dragging", "");
        },
        stop: () => {
          this.dragging = false;
          this.togglePreview(false);
          document.body.removeAttribute("data-fcp-dragging");
          $(this.input).trigger("change");
        },
        drag: this.applyFocalPointFromHandle,
      });
    };

    /**
     * Handle window resize event
     * @return {void}
     */
    updateUIFromValue = () => {
      const [left, top] = this.getCurrentValue();
      this.setHandlePosition(left, top);
      this.updatePreview(left, top);
      this.adjustResetButton(left, top);
    };

    /**
     * Get the current focal point value from the input
     * @return {number[]} The current focal point values [left, top].
     */
    getCurrentValue() {
      const { input } = this;
      if (!input) {
        console.error("no input found", { input });
        return this.defaultValue;
      }

      const inputValue = input.value.trim();
      const values = inputValue.split(" ");

      if (values.length > 2) {
        console.error("invalid value:", inputValue);
        return this.defaultValue;
      }

      return values.map(function (/** @type {string} */ value) {
        let number = parseFloat(value);
        if (number > 1) {
          number /= 100;
        }
        return parseFloat(number.toFixed(2));
      });
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

      this.animateHandle(e.x - rect.x, e.y - rect.y).then(() => {
        this.applyFocalPointFromHandle();
        $(this.input).trigger("change");
      });
    };

    /**
     * Animate the handle to a position and apply the new point
     * after the animation
     * @param {number} left
     * @param {number} top
     */
    animateHandle(left, top) {
      return /** @type {Promise<void>} */ (
        new Promise((resolve, reject) => {
          $(this.handle).animate(
            { left, top },
            {
              duration: 200,
              complete: resolve,
            },
          );
        })
      );
    }

    /**
     * Resets the focal point
     */
    reset = () => {
      if (!this.img || !this.imageWrap) {
        console.error("Something went wrong while getting the image rect");
        return;
      }
      const rect = this.img.getBoundingClientRect();

      this.setHandlePosition(0.5, 0.5);
      this.applyFocalPointFromHandle();
      $(this.input).trigger("change");
    };

    /**
     * Set the handle position, based on the image
     * @param {number} left - The left position as a number between 0-1.
     * @param {number} top - The top position as a number between 0-1.
     * @return {void}
     */
    setHandlePosition(left, top) {
      const { img, handle } = this;

      if (!img) {
        return;
      }

      const point = {
        left: img.offsetLeft + img.offsetWidth * left,
        top: img.offsetTop + img.offsetHeight * top,
      };

      handle.style.setProperty("left", `${point.left}px`);
      handle.style.setProperty("top", `${point.top}px`);
    }

    /**
     * Apply the focal point values based on the handle position
     * @return {void}
     */
    applyFocalPointFromHandle = () => {
      const [left, top] = this.getFocalPointFromHandle();
      this.updateInput(left, top);
      this.updatePreview(left, top);
      this.adjustResetButton(left, top);
    };

    /**
     * Update the input
     * @param {number} left
     * @param {number} top
     */
    updateInput(left, top) {
      this.input.value = `${left} ${top}`;
    }

    /**
     * Check if a value is equal to the default value
     * @param {number} left
     * @param {number} top
     * @return {void}
     */
    adjustResetButton(left, top) {
      if (this.resetButton) {
        this.resetButton.disabled = this.isDefaultValue(left, top);
      }
    }

    /**
     * Check if a value is equal to the default value
     * @param {number} left
     * @param {number} top
     * @return {boolean}
     */
    isDefaultValue(left, top) {
      return left === this.defaultValue[0] && top === this.defaultValue[1];
    }

    /**
     * Get the focal point from the handle position
     * @return {number[]} The focal point values [left, top].
     */
    getFocalPointFromHandle() {
      const { img, handle } = this;

      if (!img) {
        console.error("missing image", { img });
        return this.defaultValue;
      }

      const handleRect = handle.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      const point = [
        (handleRect.left - imgRect.left) / imgRect.width,
        (handleRect.top - imgRect.top) / imgRect.height,
      ];

      return point.map((number) => parseFloat(number.toFixed(2)));
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
     * @param {number} left
     * @param {number} top
     * @return {void}
     */
    updatePreview(left, top) {
      if (!this.preview) {
        return;
      }
      if (typeof left !== "number") {
        console.error("'left' must be a number:", left);
        return;
      }
      if (typeof top !== "number") {
        console.error("'top' must be a number:", top);
        return;
      }
      this.preview.style.setProperty("--focal-left", `${left * 100}%`);
      this.preview.style.setProperty("--focal-top", `${top * 100}%`);
    }
  }

  customElements.define("focal-point-picker", FocalPointPicker);
})(/** @type {jQuery} */ jQuery);
