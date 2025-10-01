import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { SurveyError, SurveyModel } from "survey-core";
import {
  AudioQuestionModel,
  AUDIO_RECORDER_TYPE,
} from "@/lib/questions/audio-recorder/audio-question.model";


interface IRootElement {
  rootElement: HTMLElement | undefined;
}

class TestAudioQuestionModel extends AudioQuestionModel {
  public onCheckForErrors(errors: SurveyError[], isOnValueChanged: boolean, fireCallback: boolean): void {
    super.onCheckForErrors(errors, isOnValueChanged, fireCallback);
  }
}

// Mock MediaStream and related APIs
const mockTrack = { stop: vi.fn() };
const mockMediaStream = {
  getTracks: vi.fn(() => [mockTrack]),
};

const mockAudioContext = {
  createMediaStreamSource: vi.fn(),
  createAnalyser: vi.fn(),
  createScriptProcessor: vi.fn(),
  destination: {},
  close: vi.fn(),
  sampleRate: 48000,
};

const mockAnalyser = {
  frequencyBinCount: 256,
  getByteFrequencyData: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockProcessor = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  onaudioprocess: null as ((event: AudioProcessingEvent) => void) | null,
};

const mockSource = {
  connect: vi.fn(),
  disconnect: vi.fn(),
};

// Mock canvas and DOM APIs
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillStyle: "",
    fillRect: vi.fn(),
  })),
  width: 300,
  height: 100,
};

const mockHTMLElement = {
  querySelector: vi.fn((selector) => {
    if (selector.includes("canvas")) {
      return mockCanvas;
    }
    return null;
  }),
};

// Mock requestAnimationFrame
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();

describe("AudioQuestionModel", () => {
  let audioQuestion: TestAudioQuestionModel;
  let survey: SurveyModel;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock global APIs
    global.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    } as unknown as Navigator;

    global.AudioContext = vi.fn(
      () => mockAudioContext,
    ) as unknown as typeof AudioContext;
    global.window = {
      AudioContext: global.AudioContext,
    } as unknown as Window & typeof globalThis;

    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;

    // Setup mock return values
    mockAudioContext.createMediaStreamSource.mockReturnValue(mockSource);
    mockAudioContext.createAnalyser.mockReturnValue(mockAnalyser);
    mockAudioContext.createScriptProcessor.mockReturnValue(mockProcessor);

    // Create survey and question
    survey = new SurveyModel({
      elements: [
        {
          type: AUDIO_RECORDER_TYPE,
          name: "audioQuestion",
          title: "Record Audio",
        },
      ],
    });

    audioQuestion = survey.getQuestionByName(
      "audioQuestion",
    ) as TestAudioQuestionModel;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor and Properties", () => {
    it("should create AudioQuestionModel with correct type", () => {
      expect(audioQuestion.getType()).toBe(AUDIO_RECORDER_TYPE);
    });

    it("should initialize with correct default values", () => {
      expect(audioQuestion.waitForUpload).toBe(true);
      expect(audioQuestion.storeDataAsText).toBe(false);
      expect(audioQuestion.isRecording).toBe(false);
      expect(audioQuestion.showPlayer).toBe(false);
      expect(audioQuestion.maxSize).toBe(0);
    });

    it("should generate correct canvas ID", () => {
      expect(audioQuestion.canvasId).toBe(`${audioQuestion.id}_canvas`);
    });

    it("should allow setting and getting properties", () => {
      audioQuestion.isRecording = true;
      expect(audioQuestion.isRecording).toBe(true);

      audioQuestion.showPlayer = true;
      expect(audioQuestion.showPlayer).toBe(true);

      audioQuestion.maxSize = 1024000;
      expect(audioQuestion.maxSize).toBe(1024000);
    });
  });

  describe("Recording Functionality", () => {
    it("should start recording successfully", async () => {
      // Mock the canvas element and context before starting recording
      audioQuestion.afterRenderQuestionElement(
        mockHTMLElement as unknown as HTMLElement,
      );

      await audioQuestion.startRecording();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(
        mockMediaStream,
      );
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(
        4096,
        1,
        1,
      );
      expect(mockSource.connect).toHaveBeenCalledWith(mockAnalyser);
      expect(mockAnalyser.connect).toHaveBeenCalledWith(mockProcessor);
      expect(mockProcessor.connect).toHaveBeenCalledWith(
        mockAudioContext.destination,
      );
      expect(audioQuestion.isRecording).toBe(true);
    });

    it("should stop recording and process audio data", async () => {
      // Mock audio data
      const mockAudioData = [new Float32Array([0.1, 0.2, 0.3])];
      (audioQuestion as unknown as { audioData: Float32Array[] }).audioData =
        mockAudioData;

      // Mock canvas element
      audioQuestion.afterRenderQuestionElement(
        mockHTMLElement as unknown as HTMLElement,
      );

      await audioQuestion.startRecording();
      await audioQuestion.stopRecording();

      expect(mockProcessor.disconnect).toHaveBeenCalled();
      expect(mockAnalyser.disconnect).toHaveBeenCalled();
      expect(mockSource.disconnect).toHaveBeenCalled();
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(audioQuestion.isRecording).toBe(false);
    });

    it("should handle recording errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "debug")
        .mockImplementation(() => {});

      // Mock getUserMedia to throw error
      (
        navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Permission denied"));

      await expect(audioQuestion.startRecording()).rejects.toThrow(
        "Permission denied",
      );

      consoleSpy.mockRestore();
    });

    it("should not stop recording if not currently recording", async () => {
      mockProcessor.disconnect = vi.fn();

      await audioQuestion.stopRecording();

      expect(mockProcessor.disconnect).not.toHaveBeenCalled();
    });

    it("should clear recording", () => {
      const clearValueSpy = vi.spyOn(audioQuestion, "clearValue");

      audioQuestion.clearRecording();

      expect(clearValueSpy).toHaveBeenCalledWith(true);
    });
  });

  describe("File Upload and Validation", () => {
    it("should upload audio recording successfully", () => {
      const mockFiles = [
        new File(["audio data"], "test-recording.wav", { type: "audio/wav" }),
      ];

      const uploadFilesSpy = vi.spyOn(audioQuestion, "uploadFiles");

      audioQuestion.uploadAudioRecording(mockFiles);

      expect(uploadFilesSpy).toHaveBeenCalledWith(mockFiles);
    });

    it("should handle empty files array", () => {
      audioQuestion.uploadAudioRecording([]);

      expect(audioQuestion.errors).toHaveLength(1);
      expect(audioQuestion.errors[0].text).toBe(
        AudioQuestionModel.ERROR_RECORDING_FAILED,
      );
    });

    it("should handle multiple files error", () => {
      const mockFiles = [
        new File(["audio1"], "test1.wav", { type: "audio/wav" }),
        new File(["audio2"], "test2.wav", { type: "audio/wav" }),
      ];

      audioQuestion.uploadAudioRecording(mockFiles);

      expect(audioQuestion.errors).toHaveLength(1);
      expect(audioQuestion.errors[0].text).toBe(
        "There is more than one recording. Please upload one at a time.",
      );
    });

    it("should validate file size within limit", () => {
      audioQuestion.maxSize = 1000;
      const mockFiles = [
        new File(["small audio"], "small.wav", { type: "audio/wav" }),
      ];

      // Mock file size
      Object.defineProperty(mockFiles[0], "size", { value: 500 });

      const isFileSizeWithinLimitSpy = vi
        .spyOn(
          audioQuestion as unknown as {
            isFileSizeWithinLimit: (files: File[]) => boolean;
          },
          "isFileSizeWithinLimit",
        )
        .mockReturnValue(true);
      const uploadFilesSpy = vi.spyOn(audioQuestion, "uploadFiles");

      audioQuestion.uploadAudioRecording(mockFiles);

      expect(isFileSizeWithinLimitSpy).toHaveBeenCalledWith(mockFiles);
      expect(uploadFilesSpy).toHaveBeenCalledWith(mockFiles);
    });

    it("should handle file size exceeding limit", () => {
      audioQuestion.maxSize = 1000;
      const mockFiles = [
        new File(["large audio"], "large.wav", { type: "audio/wav" }),
      ];

      // Mock file size
      Object.defineProperty(mockFiles[0], "size", { value: 2000 });

      // Don't mock isFileSizeWithinLimit, let it run naturally
      audioQuestion.uploadAudioRecording(mockFiles);

      expect(audioQuestion.errors.length).toBeGreaterThan(0);
      expect(audioQuestion.errors[0].getText()).toContain("exceed");
    });
  });

  describe("Validation - onCheckForErrors", () => {
    it("should not add errors when not recording and not uploading", () => {
      const errors: SurveyError[] = [];
      
      audioQuestion.onCheckForErrors(errors, false, false);

      expect(errors).toHaveLength(0);
    });

    it("should add error when recording", () => {
      const errors: SurveyError[] = [];
      audioQuestion.isRecording = true;

      audioQuestion.onCheckForErrors(errors, false, false);

      expect(errors).toHaveLength(1);
      expect(errors[0].text).toBe(
        AudioQuestionModel.ERROR_RECORDING_IN_PROGRESS
      );
    });

    it("should add error when uploading", () => {
      const errors: SurveyError[] = [];
      audioQuestion.isUploading = true;

      audioQuestion.onCheckForErrors(errors, false, false);

      expect(errors).toHaveLength(1);
      expect(errors[0].text).toBe(
        "Saving your recording. Please wait.",
      );
    });

    it("should call parent onCheckForErrors when not recording and not uploading", () => {
      const errors: SurveyError[] = [];
      const parentPrototype = Object.getPrototypeOf(
        Object.getPrototypeOf(audioQuestion),
      );
      const parentOnCheckForErrorsSpy = vi
        .spyOn(parentPrototype, "onCheckForErrors")
        .mockImplementation(() => {});

      audioQuestion.onCheckForErrors(errors, false, false);

      expect(parentOnCheckForErrorsSpy).toHaveBeenCalledWith(
        errors,
        false,
        false,
      );
      parentOnCheckForErrorsSpy.mockRestore();
    });
  });

  describe("Validation - Survey Integration", () => {
    it("should prevent survey validation when recording", () => {
      audioQuestion.isRecording = true;

      const result = survey.validate();

      expect(result).toBe(false);
      expect(audioQuestion.errors).toHaveLength(1);
      expect(audioQuestion.errors[0].text).toBe(
        AudioQuestionModel.ERROR_RECORDING_IN_PROGRESS
      );
    });

    it("should prevent survey validation when uploading", () => {
      audioQuestion.isUploading = true;

      const result = survey.validate();

      expect(result).toBe(false);
      expect(audioQuestion.errors).toHaveLength(1);
      expect(audioQuestion.errors[0].text).toBe(
        "Saving your recording. Please wait.",
      );
    });

    it("should allow survey validation when not recording and not uploading", () => {
      // Ensure question is in valid state
      audioQuestion.isRecording = false;
      audioQuestion.isUploading = false;

      const result = survey.validate();

      expect(result).toBe(true);
      expect(audioQuestion.errors).toHaveLength(0);
    });

    it("should validate question directly when recording", () => {
      audioQuestion.isRecording = true;

      const result = audioQuestion.validate();

      expect(result).toBe(false);
      expect(audioQuestion.errors).toHaveLength(1);
      expect(audioQuestion.errors[0].text).toBe(
        AudioQuestionModel.ERROR_RECORDING_IN_PROGRESS
      );
    });

    it("should validate question directly when uploading", () => {
      audioQuestion.isUploading = true;

      const result = audioQuestion.validate();

      expect(result).toBe(false);
      expect(audioQuestion.errors).toHaveLength(1);
      expect(audioQuestion.errors[0].text).toBe(
        "Saving your recording. Please wait.",
      );
    });

    it("should validate question directly when not recording and not uploading", () => {
      // Ensure question is in valid state
      audioQuestion.isRecording = false;
      audioQuestion.isUploading = false;

      const result = audioQuestion.validate();

      expect(result).toBe(true);
      expect(audioQuestion.errors).toHaveLength(0);
    });
  });

  describe("Validation - Question Per Page Mode", () => {
    let questionPerPageSurvey: SurveyModel;
    let question1: AudioQuestionModel;
    let question2: AudioQuestionModel;

    beforeEach(() => {
      questionPerPageSurvey = new SurveyModel({
        title: "Audio Check",
        pages: [
          {
            name: "page1",
            elements: [
              {
                type: AUDIO_RECORDER_TYPE,
                name: "question1",
                title: "Say hello",
              },
              {
                type: AUDIO_RECORDER_TYPE,
                name: "question2",
                title: "Say buy",
              },
            ],
          },
        ],
        questionsOnPageMode: "questionPerPage",
      });

      question1 = questionPerPageSurvey.getQuestionByName("question1") as AudioQuestionModel;
      question2 = questionPerPageSurvey.getQuestionByName("question2") as AudioQuestionModel;
    });

    it("should prevent next page when first question is recording", () => {
      question1.isRecording = true;

      const result = questionPerPageSurvey.nextPage();

      expect(result).toBe(false);
      expect(question1.errors).toHaveLength(1);
      expect(question1.errors[0].text).toBe(
        AudioQuestionModel.ERROR_RECORDING_IN_PROGRESS
      );
    });

    it("should prevent next page when first question is uploading", () => {
      question1.isUploading = true;

      const result = questionPerPageSurvey.nextPage();

      expect(result).toBe(false);
      expect(question1.errors).toHaveLength(1);
      expect(question1.errors[0].text).toBe(
        "Saving your recording. Please wait.",
      );
    });

    it("should allow next page when first question is not recording or uploading", () => {
      question1.isRecording = false;
      question1.isUploading = false;

      const result = questionPerPageSurvey.nextPage();

      expect(result).toBe(true);
      expect(question1.errors).toHaveLength(0);
    });

    it("should prevent next page when second question is recording", () => {
      // First navigate to second question
      questionPerPageSurvey.nextPage();
      question2.isRecording = true;

      const result = questionPerPageSurvey.nextPage();

      expect(result).toBe(false);
      expect(question2.errors).toHaveLength(1);
      expect(question2.errors[0].text).toBe(
        AudioQuestionModel.ERROR_RECORDING_IN_PROGRESS
      );
    });

    it("should prevent next page when second question is uploading", () => {
      // First navigate to second question
      questionPerPageSurvey.nextPage();
      question2.isUploading = true;

      const result = questionPerPageSurvey.nextPage();

      expect(result).toBe(false);
      expect(question2.errors).toHaveLength(1);
      expect(question2.errors[0].text).toBe(
        "Saving your recording. Please wait.",
      );
    });

    it("should allow next page when second question is not recording or uploading", () => {
      // First navigate to second question
      questionPerPageSurvey.nextPage();
      question2.isRecording = false;
      question2.isUploading = false;

      const result = questionPerPageSurvey.nextPage();

      expect(result).toBe(true);
      expect(question2.errors).toHaveLength(0);
    });

    it("should validate first question when calling survey validate", () => {
      question1.isRecording = true;

      const result = questionPerPageSurvey.validate();

      expect(result).toBe(false);
      expect(question1.errors).toHaveLength(1);
      expect(question1.errors[0].text).toBe(
        AudioQuestionModel.ERROR_RECORDING_IN_PROGRESS
      );
    });

    it("should validate second question when calling survey validate", () => {
      question2.isUploading = true;

      // Navigate to the second question first
      questionPerPageSurvey.nextPage();
      
      const result = questionPerPageSurvey.validate();

      expect(result).toBe(false);
      expect(question2.errors).toHaveLength(1);
      expect(question2.errors[0].text).toBe(
        "Saving your recording. Please wait.",
      );
    });

    it("should allow survey validation when all questions are valid", () => {
      question1.isRecording = false;
      question1.isUploading = false;
      question2.isRecording = false;
      question2.isUploading = false;

      const result = questionPerPageSurvey.validate();

      expect(result).toBe(true);
      expect(question1.errors).toHaveLength(0);
      expect(question2.errors).toHaveLength(0);
    });
  });

  describe("Lifecycle Methods", () => {
    it("should handle afterRenderQuestionElement", () => {
      const mockElement = document.createElement("div");

      audioQuestion.afterRenderQuestionElement(mockElement);

      expect((audioQuestion as unknown as IRootElement).rootElement).toBe(
        mockElement,
      );
    });

    it("should handle beforeDestroyQuestionElement", () => {
      const mockElement = document.createElement("div");
      const stopRecordingSpy = vi.spyOn(audioQuestion, "stopRecording");

      audioQuestion.beforeDestroyQuestionElement(mockElement);

      expect(stopRecordingSpy).toHaveBeenCalled();
      expect(
        (audioQuestion as unknown as IRootElement).rootElement,
      ).toBeUndefined();
    });
  });

  describe("Audio Processing", () => {
    it("should encode WAV correctly", () => {
      const samples = new Float32Array([0.1, -0.2, 0.3, -0.4]);
      const sampleRate = 48000;

      const result = (
        audioQuestion as unknown as {
          encodeWAV: (samples: Float32Array, sampleRate: number) => Blob;
        }
      ).encodeWAV(samples, sampleRate);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("audio/wav");
    });

    it("should flatten array correctly", () => {
      const channelBuffers = [
        new Float32Array([1, 2, 3]),
        new Float32Array([4, 5, 6]),
      ];

      const result = (
        audioQuestion as unknown as {
          flattenArray: (channelBuffers: Float32Array[]) => Float32Array;
        }
      ).flattenArray(channelBuffers);

      expect(result).toEqual(new Float32Array([1, 2, 3, 4, 5, 6]));
    });

    it("should draw level on canvas", () => {
      audioQuestion.afterRenderQuestionElement(
        mockHTMLElement as unknown as HTMLElement,
      );

      // Set up the analyser property that drawLevel expects
      (audioQuestion as unknown as { analyser: typeof mockAnalyser }).analyser =
        mockAnalyser;

      // Mock analyser data
      const mockDataArray = new Uint8Array(256);
      mockDataArray.fill(128); // Half level
      mockAnalyser.getByteFrequencyData.mockImplementation((arr) => {
        arr.set(mockDataArray);
      });

      (audioQuestion as unknown as { drawLevel: () => void }).drawLevel();

      expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled();
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe("Serialization and Registration", () => {
    it("should serialize correctly", () => {
      audioQuestion.showPlayer = true;
      audioQuestion.maxSize = 1024000;

      const json = audioQuestion.toJSON();

      expect(json).toEqual({
        name: "audioQuestion",
        title: "Record Audio",
        showPlayer: true,
        maxSize: 1024000,
      });
    });

    it("should deserialize correctly", () => {
      const json = {
        name: "testAudio",
        type: AUDIO_RECORDER_TYPE,
        showPlayer: true,
        maxSize: 2048000,
      };

      const question = new AudioQuestionModel("testAudio");
      question.fromJSON(json);

      expect(question.showPlayer).toBe(true);
      expect(question.maxSize).toBe(2048000);
    });

    it("should be registered with QuestionFactory", () => {
      const question = survey.getQuestionByName("audioQuestion");
      expect(question).toBeInstanceOf(AudioQuestionModel);
    });
  });

  describe("Error Handling", () => {
    it("should handle recording errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "debug")
        .mockImplementation(() => {});

      // Test error handling by mocking getUserMedia to throw an error
      (
        navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Microphone access denied"));

      await expect(audioQuestion.startRecording()).rejects.toThrow(
        "Microphone access denied",
      );

      consoleSpy.mockRestore();
    });

    it("should handle missing survey context", () => {
      // Create a new question without survey context
      const questionWithoutSurvey = new AudioQuestionModel("test");
      const mockFiles = [new File(["test"], "test.wav", { type: "audio/wav" })];

      questionWithoutSurvey.uploadAudioRecording(mockFiles);

      // Should not throw error, just return early
      expect(questionWithoutSurvey.errors).toHaveLength(0);
    });
  });

  describe("Integration with Survey JS", () => {
    it("should work within a survey context", () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: AUDIO_RECORDER_TYPE,
            name: "audio1",
            showPlayer: true,
            maxSize: 5000000,
          },
        ],
      });

      const audioQuestion = survey.getQuestionByName(
        "audio1",
      ) as AudioQuestionModel;

      expect(audioQuestion).toBeDefined();
      expect(audioQuestion.getType()).toBe(AUDIO_RECORDER_TYPE);
      expect(audioQuestion.showPlayer).toBe(true);
      expect(audioQuestion.maxSize).toBe(5000000);
    });

    it("should handle survey data changes", () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: AUDIO_RECORDER_TYPE,
            name: "audio1",
          },
        ],
      });

      const audioQuestion = survey.getQuestionByName(
        "audio1",
      ) as AudioQuestionModel;

      // Simulate setting value
      audioQuestion.value = [
        {
          name: "recording.wav",
          type: "audio/wav",
          content: "base64data",
        },
      ];

      expect(audioQuestion.value).toHaveLength(1);
      expect(audioQuestion.value[0].name).toBe("recording.wav");
    });
  });
});
