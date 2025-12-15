(function () {
  "use strict";

  var currentScript = document.currentScript;

  if (!window.EndatixEmbed) {
    window.EndatixEmbed = {
      version: "1.0.0",
      loaded: true,
      instances: [],
      getDefaultBaseUrl: function () {
        if (currentScript && currentScript.src) {
          try {
            const scriptUrl = new URL(currentScript.src);
            return scriptUrl.origin;
          } catch (error) {
            console.error("Error getting default base url", error);
          }
        }
        return "";
      },
      embedFormAt: function (formId, options, targetScript) {
        if (!formId) {
          return;
        }

        var container = document.createElement("div");
        container.setAttribute("data-endatix-form", formId);
        container.setAttribute("data-endatix-loaded", "true");

        if (targetScript && targetScript.parentNode) {
          targetScript.parentNode.insertBefore(
            container,
            targetScript.nextSibling,
          );
        } else {
          document.body.appendChild(container);
        }

        var instanceId = "endatix-form-" + formId + "-" + this.instances.length;

        var iframe = document.createElement("iframe");
        iframe.id = instanceId;
        iframe.setAttribute("data-form-id", formId);

        var protocol = window.location.protocol;
        var baseUrl = options.baseUrl || this.getDefaultBaseUrl();
        var cleanUrl = baseUrl.replace(/^https?:\/\//, "");
        var src = protocol + "//" + cleanUrl + "/embed/" + formId;

        if (options.prefill) {
          src += "&" + options.prefill;
        }

        iframe.src = src;

        iframe.allow = "clipboard-write";
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("scrolling", "no");

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
          formId: formId,
          options: options,
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
          if (event.data && event.data.type === "endatix:resize") {
            var height = event.data.height;

            var instance = this.findInstanceBySource(event.source);

            if (instance && instance.iframe) {
              instance.iframe.style.height = height + "px";
            }
          }

          if (event.data && event.data.type === "endatix-scroll") {
            var instance = this.findInstanceBySource(event.source);

            if (instance && instance.iframe) {
              requestAnimationFrame(function () {
                instance.iframe.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              });
            }
          }
        });
      },
    };

    window.EndatixEmbed.setupMessageListener();
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
