import ReactDOMServer from "react-dom/server";
import {
  ExceedSizeError,
  QuestionFactory,
  Serializer,
  SurveyError,
  SvgRegistry,
} from "survey-core";
import { QuestionFileModelBase } from "./question-file-base-model";
import AudioQuestionIcon from "./audio-question.icon";

export const AUDIO_RECORDER_TYPE = "audiorecorder";

export class AudioQuestionModel extends QuestionFileModelBase {
  private stream: MediaStream | undefined;
  private audioContext: AudioContext | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private analyser: AnalyserNode | undefined;
  private processor: ScriptProcessorNode | undefined;
  private audioData: Float32Array[] = [];
  private rootElement: HTMLElement | undefined;

  public getType(): string {
    return AUDIO_RECORDER_TYPE;
  }

  constructor(name: string) {
    super(name);
  }

  public get canvasId(): string {
    return this.id + "_canvas";
  }

  get isRecording(): boolean {
    return this.getPropertyValue("isRecording") as boolean;
  }
  set isRecording(val: boolean) {
    this.setPropertyValue("isRecording", val as boolean);
  }

  get showRecordingBar(): boolean {
    return this.getPropertyValue("showRecordingBar") as boolean;
  }
  set showRecordingBar(val: boolean) {
    this.setPropertyValue("showRecordingBar", val as boolean);
  }

  get showPlayer(): boolean {
    return this.getPropertyValue("showPlayer") as boolean;
  }
  set showPlayer(val: boolean) {
    this.setPropertyValue("showPlayer", val as boolean);
  }

  public async startRecording(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new window.AudioContext({
      sampleRate: 48000,
    });

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.audioData = [];

    this.source.connect(this.analyser);
    this.analyser.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (e) => {
      this.audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };

    this.drawLevel();
    this.isRecording = true;
  }

  public async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    cancelAnimationFrame(this.animationId);
    this.processor!.disconnect();
    this.analyser!.disconnect();
    this.source!.disconnect();
    this.stream!.getTracks().forEach((track) => track.stop());
    this.audioContext!.close();

    const merged = this.flattenArray(this.audioData);
    const wavBlob = this.encodeWAV(merged, 48000);

    const file = new File([wavBlob], "recording.wav", {
      type: "audio/wav",
    });

    this.isRecording = false;

    this.loadFiles([file]);
    this.ctx.clearRect(
      0,
      0,
      this.canvasHtmlElement.width,
      this.canvasHtmlElement.height,
    );
  }

  public clearRecording(): void {
    super.clearValue(true);
  }

  public afterRenderQuestionElement(el: HTMLElement): void {
    super.afterRenderQuestionElement(el);
    this.rootElement = el;
  }

  public beforeDestroyQuestionElement(el: HTMLElement): void {
    super.beforeDestroyQuestionElement(el);
    this.stopRecording();
    this.rootElement = undefined;
  }

  public loadFiles(files: File[]) {
    if (!this.survey) {
      return;
    }
    this.errors = [];
    if (!this.allFilesOk(files)) {
      return;
    }

    const loadFilesProc = () => {
      this.stateChanged("loading");
      let content: any[] = [];
      if (this.storeDataAsText) {
        files.forEach((file) => {
          const fileReader = new FileReader();
          fileReader.onload = (e) => {
            content = content.concat([
              { name: file.name, type: file.type, content: fileReader.result },
            ]);
            if (content.length === files.length) {
              this.value = (this.value || []).concat(content);
            }
          };
          fileReader.readAsDataURL(file);
        });
      } else {
        this.uploadFiles(files);
      }
    };
    if (this.allowMultiple) {
      loadFilesProc();
    } else {
      this.clear(loadFilesProc);
    }
  }

  public clear(doneCallback?: () => void) {
    if (!this.survey) return;
    this.containsMultiplyFiles = false;
    this.survey.clearFiles(
      this,
      this.name,
      this.value,
      null,
      (status, data) => {
        if (status === "success") {
          this.value = undefined;
          this.errors = [];
          !!doneCallback && doneCallback();
          this.indexToShow = 0;
        }
      },
    );
  }

  public override validate(fireCallback?: boolean, rec?: any): boolean {
    if (this.isRecording) {
      this.errors = [
        new SurveyError("Please click Stop button to finish recording"),
      ];
      return false;
    }

    if (this.isUploading) {
      this.errors = [
        new SurveyError("File is still uploading. Please wait."),
      ];
      return false;
    }

    return super.validate(fireCallback, rec);
  }

  protected setValueFromResult(arg: any) {
    this.value = (this.value || []).concat(
      arg.map((r: any) => {
        return {
          name: r.file.name,
          type: r.file.type,
          content: r.content,
        };
      }),
    );
  }

  private getLocalizationFormatString(strName: string, ...args: any[]): string {
    const str: any = this.getLocalizationString(strName);
    if (!str || !str.format) return "";
    return str.format(...args);
  }

  private allFilesOk(files: File[]): boolean {
    const errorLength = this.errors ? this.errors.length : 0;
    (files || []).forEach((file) => {
      if (this.maxSize > 0 && file.size > this.maxSize) {
        this.errors.push(new ExceedSizeError(this.maxSize, this));
      }
    });
    return errorLength === this.errors.length;
  }

  private get ctx(): CanvasRenderingContext2D {
    return this.canvasHtmlElement.getContext("2d") as CanvasRenderingContext2D;
  }

  private get canvasHtmlElement() {
    return this.rootElement?.querySelector(
      `#${this.canvasId}`,
    ) as HTMLCanvasElement;
  }

  private drawLevel(): void {
    const dataArray = new Uint8Array(this.analyser!.frequencyBinCount);
    this.analyser!.getByteFrequencyData(dataArray);
    const level = Math.max(...dataArray);
    this.ctx.clearRect(
      0,
      0,
      this.canvasHtmlElement.width,
      this.canvasHtmlElement.height,
    );
    this.ctx.fillStyle = "green";
    this.ctx.fillRect(
      0,
      0,
      (level / 255) * this.canvasHtmlElement.width,
      this.canvasHtmlElement.height,
    );
    this.animationId = requestAnimationFrame(() => this.drawLevel());
  }

  private encodeWAV(samples: Float32Array, sampleRate: number) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(view: DataView, offset: number, str: string) {
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

  private flattenArray(channelBuffers: Float32Array[]) {
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
}

const view = ReactDOMServer.renderToStaticMarkup(AudioQuestionIcon);
SvgRegistry.registerIcon(AUDIO_RECORDER_TYPE, view);

Serializer.addClass(
  AUDIO_RECORDER_TYPE,
  [
    {
      name: "showPlayer:boolean",
      category: "general",
      default: false,
    },
    {
      name: "showRecordingBar:boolean",
      category: "general",
      default: true,
    },
    { name: "storeDataAsText:boolean", default: false },
    { name: "waitForUpload:boolean", default: true },
    { name: "isUploading:boolean", default: false },
  ],
  function () {
    return new AudioQuestionModel("");
  },
  "question",
);

QuestionFactory.Instance.registerQuestion(
  AUDIO_RECORDER_TYPE,
  (name: string) => {
    return new AudioQuestionModel(name);
  },
);
