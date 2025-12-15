(function () {
  "use strict";

  var currentScript = document.currentScript;

  var parseUrl = function (urlString) {
    if (
      !urlString ||
      typeof urlString !== "string" ||
      urlString.trim().length === 0
    ) {
      console.warn("urlString must be a non-empty string");
      return null;
    }

    try {
      var parsedUrl = new URL(urlString);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        console.warn("urlString protocol must be http or https");
        return null;
      }
      return parsedUrl;
    } catch {
      console.warn("Invalid urlString format");
      return null;
    }
  };

  var parseNumericId = function (idString, paramName) {
    if (!paramName || typeof paramName !== "string") {
      return {
        isValid: false,
        id: null,
        error: "paramName must be a non-empty string",
      };
    }

    if (!idString || typeof idString !== "string") {
      return {
        isValid: false,
        id: null,
        error: `${paramName} must be a non-empty string`,
      };
    }

    try {
      var id = BigInt(idString);
      var maxPossibleValue = BigInt("9223372036854775807");
      if (id <= 0 || id > maxPossibleValue) {
        return {
          isValid: false,
          id: null,
          error: `${paramName} must be a positive number and less than ${maxPossibleValue}`,
        };
      }

      return {
        isValid: true,
        id: id,
        error: null,
      };
    } catch {
      return {
        isValid: false,
        id: null,
        error: `${paramName} must be a valid numeric value`,
      };
    }
  };

  if (!window.EndatixEmbed) {
    window.EndatixEmbed = {
      version: "1.0.0",
      loaded: true,
      instances: [],
      getDefaultBaseUrl: function () {
        return currentScript?.src || "";
      },
      embedFormAt: function (formId, options, targetScript) {
        var parsedFormId = parseNumericId(formId, "formId");
        if (!parsedFormId.isValid) {
          console.error(parsedFormId.error);
          return;
        }
        var validatedFormId = parsedFormId.id.toString();

        var container = document.createElement("div");
        container.setAttribute("data-endatix-form", validatedFormId);
        container.setAttribute("data-endatix-loaded", "true");

        if (targetScript && targetScript.parentNode) {
          targetScript.parentNode.insertBefore(
            container,
            targetScript.nextSibling,
          );
        } else {
          document.body.appendChild(container);
        }

        var instanceId =
          "endatix-form-" + validatedFormId + "-" + this.instances.length;

        var iframe = document.createElement("iframe");
        iframe.id = instanceId;
        iframe.setAttribute("data-form-id", validatedFormId);
        var baseUrl = options.baseUrl || this.getDefaultBaseUrl();
        var parsedUrl = parseUrl(baseUrl);
        if (!parsedUrl) {
          console.warn("No valid baseUrl passed. Falling back to default.");
          parsedUrl = parseUrl(this.getDefaultBaseUrl());
          if (!parsedUrl) {
            console.error(
              "Cannot auto-resolve valid base URL. Cannot embed form",
            );
            return;
          }
        }

        var embedProtocol = parsedUrl.protocol;
        if (
          embedProtocol !== window.location.protocol &&
          embedProtocol !== "https:"
        ) {
          console.warn(
            "Endatix embed form protocol does not match current protocol.",
          );
        }

        var src =
          embedProtocol + "//" + parsedUrl.host + "/embed/" + validatedFormId;

        if (options.prefill) {
          src += "?" + options.prefill;
        }

        iframe.src = src;
        iframe.allow = "clipboard-write";
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("scrolling", "no");
        iframe.loading = "lazy";
        iframe.style.width = "100%";
        iframe.style.border = "none";
        iframe.style.overflow = "hidden";
        iframe.style.display = "block";
        iframe.style.height = "400px";

        container.appendChild(iframe);

        this.instances.push({
          id: instanceId,
          iframe: iframe,
          container: container,
          formId: validatedFormId,
          options: options,
          expectedOrigin: parsedUrl.origin,
        });
      },

      findInstanceBySource: function (source) {
        for (var i = 0; i < this.instances.length; i++) {
          var instance = this.instances[i];
          if (instance.iframe.contentWindow === source) {
            return instance;
          }
        }
        return null;
      },

      setupMessageListener: function () {
        window.addEventListener("message", (event) => {
          var instance = this.findInstanceBySource(event.source);
          if (
            !instance ||
            !instance.iframe ||
            event.origin !== instance.expectedOrigin
          ) {
            return;
          }

          if (event.data && event.data.type === "endatix:resize") {
            var height = event.data.height;
            instance.iframe.style.height = height + "px";
          }

          if (event.data && event.data.type === "endatix-scroll") {
            requestAnimationFrame(function () {
              instance.iframe.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            });
          }
        });
      },
    };

    window.EndatixEmbed.setupMessageListener();
    Object.seal(window.EndatixEmbed);
  }

  if (currentScript && currentScript.hasAttribute("data-form-id")) {
    var formId = currentScript.getAttribute("data-form-id");
    var options = {
      baseUrl:
        currentScript.getAttribute("data-base-url") ||
        window.EndatixEmbed.getDefaultBaseUrl(),
      prefill: currentScript.getAttribute("data-prefill") || "",
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.EndatixEmbed.embedFormAt(formId, options, currentScript);
      });
    } else {
      window.EndatixEmbed.embedFormAt(formId, options, currentScript);
    }
  }
})();