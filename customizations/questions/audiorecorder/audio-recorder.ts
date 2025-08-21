import { ComponentCollection, Question } from "survey-core";

ComponentCollection.Instance.add({
  name: "audioRecorder",
  title: "Audio Recorder (test)",
  iconName: "icon-radiogroup",
  defaultQuestionTitle: "Audio Recorder (test)",
  inheritBaseProps: true,
  elementsJSON: [
    {
      type: "html",
      name: "htmlPanel",
      html: "",
    },
    {
      type: "file",
      name: "audioUpload",
      storeDataAsText: false,
      acceptedTypes: "audio/*",
      waitForUpload: true,
      showPreview: true,
      visible: true,
      isRequired: false,
      titleLocation: "hidden",
    },
  ],
  onAfterRenderContentElement: (
    question: Question,
    element: Question,
    htmlElement: HTMLElement,
  ) => {
    if (element.getType() == "html") {
      let stream,
        audioContext,
        analyser,
        processor,
        source,
        audioData = [];
      let animationId;

      const survey = question.survey;

      const startBtn = document.createElement("button");
      startBtn.style.padding = "8px 16px";
      startBtn.style.fontSize = "16px";
      startBtn.style.borderRadius = "4px";
      startBtn.style.border = "1px solid #888";
      startBtn.style.backgroundColor = "#f0f0f0";
      startBtn.style.margin = "4px";
      startBtn.id = "startBtn";
      startBtn.className = "endatix_audio_button";
      startBtn.style.display = "inline";
      startBtn.textContent = "Start";

      const stopBtn = document.createElement("button");
      stopBtn.style.padding = "8px 16px";
      stopBtn.style.fontSize = "16px";
      stopBtn.style.borderRadius = "4px";
      stopBtn.style.border = "1px solid #888";
      stopBtn.style.backgroundColor = "#f0f0f0";
      stopBtn.style.margin = "4px";
      stopBtn.id = "stopBtn";
      stopBtn.className = "endatix_audio_button";
      stopBtn.style.display = "inline";
      stopBtn.disabled = true;
      stopBtn.textContent = "Stop";

      const resetBtn = document.createElement("button");
      resetBtn.style.padding = "8px 16px";
      resetBtn.style.fontSize = "16px";
      resetBtn.style.borderRadius = "4px";
      resetBtn.style.border = "1px solid #888";
      resetBtn.style.backgroundColor = "#f0f0f0";
      resetBtn.style.margin = "4px";
      resetBtn.style.visibility = "hidden";
      resetBtn.id = "resetBtn";
      resetBtn.className = "endatix_audio_button";
      resetBtn.style.display = "inline";
      resetBtn.disabled = false;
      resetBtn.textContent = "Reset";

      const space = document.createTextNode("\u00A0\u00A0");
      const space2 = document.createTextNode("\u00A0\u00A0");

      const canvasWrapper = document.createElement("div");
      const canvas = document.createElement("canvas");
      canvas.id = "levelCanvas";
      canvas.width = 206;
      canvas.height = 6;
      canvas.style.border = "1px solid #ccc";

      var checkIfButtonExists = htmlElement.querySelector("#startBtn");

      if (!checkIfButtonExists) {
        htmlElement.appendChild(startBtn);
        htmlElement.appendChild(space);
        htmlElement.appendChild(stopBtn);
        htmlElement.appendChild(space2);
        htmlElement.appendChild(resetBtn);

        canvasWrapper.appendChild(canvas);

        htmlElement.appendChild(canvasWrapper);
      }
      const ctx = canvas.getContext("2d");

      function drawLevel() {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const level = Math.max(...dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "green";
        ctx.fillRect(0, 0, (level / 255) * canvas.width, canvas.height);
        animationId = requestAnimationFrame(drawLevel);
      }

      function encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        function writeString(view, offset, str) {
          for (let i = 0; i < str.length; i++)
            view.setUint8(offset + i, str.charCodeAt(i));
        }

        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, "WAVE");
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true); // PCM
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // byte rate
        view.setUint16(32, 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        writeString(view, 36, "data");
        view.setUint32(40, samples.length * 2, true);

        for (let i = 0; i < samples.length; i++) {
          const s = Math.max(-1, Math.min(1, samples[i]));
          view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }

        return new Blob([view], { type: "audio/wav" });
      }

      function flattenArray(channelBuffers) {
        let length = 0;
        channelBuffers.forEach((buf) => (length += buf.length));
        const result = new Float32Array(length);
        let offset = 0;
        channelBuffers.forEach((buf) => {
          result.set(buf, offset);
          offset += buf.length;
        });
        return result;
      }

      resetBtn.onclick = async () => {
        if (confirm("Are you sure you want to delete this recording?")) {
          const fileQuestion =
            question.contentPanel.getQuestionByName("audioUpload");
          fileQuestion.clear();
        }
      };

      startBtn.onclick = async () => {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 48000,
        });

        source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        audioData = [];

        source.connect(analyser);
        analyser.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };

        drawLevel();
        startBtn.disabled = true;
        stopBtn.disabled = false;
      };

      stopBtn.onclick = () => {
        cancelAnimationFrame(animationId);
        processor.disconnect();
        analyser.disconnect();
        source.disconnect();
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();

        const merged = flattenArray(audioData);
        const wavBlob = encodeWAV(merged, 48000);

        const file = new File([wavBlob], "recording.wav", {
          type: "audio/wav",
        });

        const fileQuestion =
          question.contentPanel.getQuestionByName("audioUpload");
        const htmlPanel = question.contentPanel.getQuestionByName("htmlPanel");

        fileQuestion.loadFiles([file]);

        startBtn.disabled = true;
        stopBtn.disabled = true;
        resetBtn.style.visibility = "visible";
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        fileQuestion.onPropertyChanged.add(function (sender, options) {
          if (options.name == "currentState" && options.newValue == "empty") {
            resetBtn.style.visibility = "hidden";
            startBtn.disabled = false;
            stopBtn.disabled = true;
          }
        });
      };
    }
  },
});

// const AUDIO_RECORDER_QUESTION_CONFIG = {
//   name: "audioRecorder",
//   title: "Audio Recorder (test)",
//   iconName: "icon-radiogroup",
//   category: "custom",
//   defaultQuestionTitle: "Audio Recorder (test)",
//   inheritBaseProps: true,
//   elementsJSON: [
//     {
//       type: "html",
//       name: "htmlPanel",
//       html: "",
//     },
//     {
//       type: "file",
//       name: "audioUpload",
//       storeDataAsText: false,
//       acceptedTypes: "audio/*",
//       waitForUpload: true,
//       showPreview: true,
//       visible: true,
//       isRequired: false,
//       titleLocation: "hidden",
//     },
//   ],
//   onAfterRenderContentElement: new Function(
//     "question",
//     "element",
//     "htmlElement",
//     "{\r\n\tif (element.jsonObj.type == 'html') {\r\n\t  let stream, audioContext, analyser, processor, source, audioData = [];\r\n\t  let animationId;\r\n\r\n\t  const survey = question.survey;\r\n\r\n      \r\n\r\n          const startBtn = document.createElement('button');\r\n          startBtn.style.padding = '8px 16px';\r\n            startBtn.style.fontSize = '16px';\r\n            startBtn.style.borderRadius = '4px';\r\n            startBtn.style.border = '1px solid #888';\r\n            startBtn.style.backgroundColor = '#f0f0f0';\r\n            startBtn.style.margin = '4px';\r\n          startBtn.id = 'startBtn';\r\n          startBtn.className = 'endatix_audio_button';\r\n          startBtn.style.display = 'inline';\r\n          startBtn.textContent = 'Start';\r\n\r\n          const stopBtn = document.createElement('button');\r\n          stopBtn.style.padding = '8px 16px';\r\n            stopBtn.style.fontSize = '16px';\r\n            stopBtn.style.borderRadius = '4px';\r\n            stopBtn.style.border = '1px solid #888';\r\n            stopBtn.style.backgroundColor = '#f0f0f0';\r\n            stopBtn.style.margin = '4px';\r\n          stopBtn.id = 'stopBtn';\r\n          stopBtn.className = 'endatix_audio_button';\r\n          stopBtn.style.display = 'inline';\r\n          stopBtn.disabled = true;\r\n          stopBtn.textContent = 'Stop';\r\n\r\n          const resetBtn = document.createElement('button');\r\n          resetBtn.style.padding = '8px 16px';\r\n            resetBtn.style.fontSize = '16px';\r\n            resetBtn.style.borderRadius = '4px';\r\n            resetBtn.style.border = '1px solid #888';\r\n            resetBtn.style.backgroundColor = '#f0f0f0';\r\n            resetBtn.style.margin = '4px';\r\n            resetBtn.style.visibility = 'hidden';\r\n          resetBtn.id = 'resetBtn';\r\n          resetBtn.className = 'endatix_audio_button';\r\n          resetBtn.style.display = 'inline';\r\n          resetBtn.disabled = false;\r\n          resetBtn.textContent = 'Reset';\r\n\r\n          const space = document.createTextNode('\\u00A0\\u00A0');\r\n          const space2 = document.createTextNode('\\u00A0\\u00A0');\r\n          \r\n          const canvasWrapper = document.createElement('div');\r\n          const canvas = document.createElement('canvas');\r\n            canvas.id = 'levelCanvas';\r\n            canvas.width = 206;\r\n            canvas.height = 6;\r\n            canvas.style.border = '1px solid #ccc';\r\n       \r\nvar checkIfButtonExists = htmlElement.querySelector('#startBtn');\r\n  \r\n      if(!checkIfButtonExists) {\r\n        htmlElement.appendChild(startBtn);\r\n        htmlElement.appendChild(space);\r\n        htmlElement.appendChild(stopBtn);\r\n        htmlElement.appendChild(space2);\r\n        htmlElement.appendChild(resetBtn);\r\n\r\n        canvasWrapper.appendChild(canvas);\r\n\r\n        htmlElement.appendChild(canvasWrapper);\r\n}\r\n        const ctx = canvas.getContext('2d');\r\n\r\n\t  function drawLevel() {\r\n\t\tconst dataArray = new Uint8Array(analyser.frequencyBinCount);\r\n\t\tanalyser.getByteFrequencyData(dataArray);\r\n\t\tconst level = Math.max(...dataArray);\r\n\t\tctx.clearRect(0, 0, canvas.width, canvas.height);\r\n\t\tctx.fillStyle = 'green';\r\n\t\tctx.fillRect(0, 0, level / 255 * canvas.width, canvas.height);\r\n\t\tanimationId = requestAnimationFrame(drawLevel);\r\n\t  }\r\n\r\n\t  function encodeWAV(samples, sampleRate) {\r\n\t\tconst buffer = new ArrayBuffer(44 + samples.length * 2);\r\n\t\tconst view = new DataView(buffer);\r\n\r\n\t\tfunction writeString(view, offset, str) {\r\n\t\t  for (let i = 0; i < str.length; i++)\r\n\t\t\tview.setUint8(offset + i, str.charCodeAt(i));\r\n\t\t}\r\n\r\n\t\twriteString(view, 0, 'RIFF');\r\n\t\tview.setUint32(4, 36 + samples.length * 2, true);\r\n\t\twriteString(view, 8, 'WAVE');\r\n\t\twriteString(view, 12, 'fmt ');\r\n\t\tview.setUint32(16, 16, true); // PCM\r\n\t\tview.setUint16(20, 1, true);  // PCM format\r\n\t\tview.setUint16(22, 1, true);  // Mono\r\n\t\tview.setUint32(24, sampleRate, true);\r\n\t\tview.setUint32(28, sampleRate * 2, true); // byte rate\r\n\t\tview.setUint16(32, 2, true);  // block align\r\n\t\tview.setUint16(34, 16, true); // bits per sample\r\n\t\twriteString(view, 36, 'data');\r\n\t\tview.setUint32(40, samples.length * 2, true);\r\n\r\n\t\tfor (let i = 0; i < samples.length; i++) {\r\n\t\t  const s = Math.max(-1, Math.min(1, samples[i]));\r\n\t\t  view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);\r\n\t\t}\r\n\r\n\t\treturn new Blob([view], { type: 'audio/wav' });\r\n\t  }\r\n\r\n\t  function flattenArray(channelBuffers) {\r\n\t\tlet length = 0;\r\n\t\tchannelBuffers.forEach(buf => length += buf.length);\r\n\t\tconst result = new Float32Array(length);\r\n\t\tlet offset = 0;\r\n\t\tchannelBuffers.forEach(buf => {\r\n\t\t  result.set(buf, offset);\r\n\t\t  offset += buf.length;\r\n\t\t});\r\n\t\treturn result;\r\n\t  }\r\n\r\nresetBtn.onclick = async () => {\r\n            if (confirm(\"Are you sure you want to delete this recording?\")) {\r\n                const fileQuestion = question.contentPanel.getQuestionByName(\"audioUpload\");\r\n                fileQuestion.clear();\r\n            }\r\n            };\r\n\r\n      startBtn.onclick = async () => {\r\n\r\n            stream = await navigator.mediaDevices.getUserMedia({ audio: true });\r\n            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });\r\n  \r\n            source = audioContext.createMediaStreamSource(stream);\r\n            analyser = audioContext.createAnalyser();\r\n            processor = audioContext.createScriptProcessor(4096, 1, 1);\r\n            audioData = [];\r\n  \r\n            source.connect(analyser);\r\n            analyser.connect(processor);\r\n            processor.connect(audioContext.destination);\r\n  \r\n            processor.onaudioprocess = e => {\r\n              audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));\r\n            };\r\n  \r\n            drawLevel();\r\n            startBtn.disabled = true;\r\n            stopBtn.disabled = false;\r\n          };\r\n  \r\n          stopBtn.onclick = () => {\r\n            cancelAnimationFrame(animationId);\r\n            processor.disconnect();\r\n            analyser.disconnect();\r\n            source.disconnect();\r\n            stream.getTracks().forEach(track => track.stop());\r\n            audioContext.close();\r\n  \r\n            const merged = flattenArray(audioData);\r\n            const wavBlob = encodeWAV(merged, 48000);\r\n  \r\n            const file = new File([wavBlob], \"recording.wav\", { type: \"audio/wav\" });\r\n  \r\n            const fileQuestion = question.contentPanel.getQuestionByName(\"audioUpload\");\r\n            const htmlPanel = question.contentPanel.getQuestionByName(\"htmlPanel\");\r\n            \r\n            fileQuestion.loadFiles([file]);\r\n  \r\n  \r\n            startBtn.disabled = true;\r\n            stopBtn.disabled = true;\r\n            resetBtn.style.visibility = 'visible';\r\n            ctx.clearRect(0, 0, canvas.width, canvas.height);\r\n  \r\n            fileQuestion.onPropertyChanged.add(function(sender, options) {\r\n              if (options.name == 'currentState' && options.newValue == 'empty') {\r\n                resetBtn.style.visibility = 'hidden';\r\n                startBtn.disabled = false;\r\n                stopBtn.disabled = true;\r\n              }\r\n            });\r\n  \r\n          };\r\n\r\n\r\n\t}\r\n  }"),
// };
