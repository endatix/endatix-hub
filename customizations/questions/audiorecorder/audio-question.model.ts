import ReactDOMServer from "react-dom/server";
import { QuestionFactory, Serializer, SvgRegistry } from "survey-core";
import { QuestionFileModelBase } from "./question-file-base-model";
import AudioQuestionIcon from "./audio-question.icon";
import { File } from "@/lib/questions/file/file-type";

export const AUDIO_RECORDER_TYPE = "audiorecorder";

export class AudioQuestionModel extends QuestionFileModelBase {
  private stream: MediaStream | null;
  private audioContext: AudioContext | null;
  private source: MediaStreamAudioSourceNode | null;
  private analyser: AnalyserNode | null;
  private processor: ScriptProcessorNode | null;
  private audioData: Float32Array[];

  constructor(name: string) {
    super(name);
    this.stream = null;
    this.audioContext = null;
    this.source = null;
    this.analyser = null;
    this.processor = null;
    this.audioData = [];
    this.isRecording = false;
  }

  public getType(): string {
    return AUDIO_RECORDER_TYPE;
  }

  get isRecording(): boolean {
    return this.getPropertyValue("isRecording") as boolean;
  }
  set isRecording(val: boolean) {
    this.setPropertyValue("isRecording", val as boolean);
  }

  public async startRecording(): Promise<void> {
    // this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // this.audioContext = new window.AudioContext({
    //   sampleRate: 48000,
    // });

    // this.source = this.audioContext.createMediaStreamSource(this.stream);
    // this.analyser = this.audioContext.createAnalyser();
    // this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    // this.audioData = [];

    // this.source.connect(this.analyser);
    // this.analyser.connect(this.processor);
    // this.processor.connect(this.audioContext.destination);

    // this.processor.onaudioprocess = (e) => {
    //   this.audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    // };

    // this.drawLevel();
    this.isRecording = true;
  }

  public async stopRecording(): Promise<void> {
    this.isRecording = false;
    this.value = {
      content:
        "https://endatixstorageci.blob.core.windows.net/temp-user-files/s/1407673154876211200/1407697974577856512/d0b56ed7-f48c-4194-85fe-12d28f3eb073.wav",
      name: "recording.wav",
      type: "audio/wav",
    };
  }

  public async clearRecording(): Promise<void> {
    super.clearValue(false);
  }
}

const view = ReactDOMServer.renderToStaticMarkup(AudioQuestionIcon);
SvgRegistry.registerIcon(AUDIO_RECORDER_TYPE, view);

QuestionFactory.Instance.registerQuestion(
  AUDIO_RECORDER_TYPE,
  (name: string) => {
    return new AudioQuestionModel(name);
  },
);

Serializer.addClass(
  AUDIO_RECORDER_TYPE,
  [],
  function () {
    return new AudioQuestionModel("");
  },
  "question",
);
