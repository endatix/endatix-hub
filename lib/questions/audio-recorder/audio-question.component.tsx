import {
  ReactQuestionFactory,
  SurveyQuestionElementBase,
} from "survey-react-ui";
import {
  AUDIO_RECORDER_TYPE,
  AudioQuestionModel,
} from "./audio-question.model";
import React from "react";
import "./audio-question.styles.scss";
import { AudioPlayer } from "./audio-player";
import { getLocaleStrings } from "survey-creator-core";
import AudioQuestionIcon from "./audio-question.icon";
import { SvgRegistry } from "survey-core";
import ReactDOMServer from "react-dom/server";

export class AudioQuestionComponent extends SurveyQuestionElementBase {
  constructor(props: unknown) {
    super(props);
    this.state = { value: this.question.value };
  }

  protected get question(): AudioQuestionModel {
    return this.questionBase as unknown as AudioQuestionModel;
  }

  protected renderElement(): React.JSX.Element {
    const hasValue = this.question.value && this.question.value.length > 0;

    return (
      <div
        className="endatix_audio_container"
        ref={(root) => this.setControl(root)}
      >
        {this.question.showPlayer && this.renderPlayer()}
        {this.question.isUploading && this.renderLoadingIndicator()}
        {!this.props.isDisplayMode && (
          <div className="endatix_audio_controls">
            {this.renderStartButton()}
            {this.renderStopButton()}
            {hasValue && this.renderClearButton()}
          </div>
        )}
        {this.renderRecordingBar()}
      </div>
    );
  }

  protected renderPlayer(): React.JSX.Element {
    return (
      <div className="endatix_audio_value">
        <AudioPlayer
          file={this.question.value}
          isDisplayMode={this.props.isDisplayMode}
        />
      </div>
    );
  }

  protected renderLoadingIndicator(): React.JSX.Element {
    return (
      <div className={this.question.cssClasses.loadingIndicator}>
        <span>Uploading</span>
        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    );
  }

  protected renderStartButton(): React.JSX.Element | null {
    return (
      <button
        type="button"
        className="endatix_audio_button"
        title="Start recording"
        disabled={
          this.question.isRecording ||
          this.question.isUploading ||
          this.question.value?.length > 0
        }
        onClick={() => this.question.startRecording()}
      >
        <span>Start</span>
      </button>
    );
  }

  protected renderStopButton(): React.JSX.Element | null {
    return (
      <button
        type="button"
        className="endatix_audio_button"
        title="Stop recording"
        disabled={!this.question.isRecording}
        onClick={() => this.question.stopRecording()}
      >
        <span>Stop</span>
      </button>
    );
  }

  protected renderClearButton(): React.JSX.Element | null {
    return (
      <button
        type="button"
        className="endatix_audio_button"
        title="Clear recording"
        disabled={!this.question.value?.length}
        onClick={() => this.question.clearRecording()}
      >
        <span>Clear</span>
      </button>
    );
  }

  protected renderRecordingBar(): React.JSX.Element {
    return (
      <div className="endatix_audio_canvas_container">
        <canvas id={this.question.canvasId}></canvas>
      </div>
    );
  }
}

/**
 * Register the audio question in the Survey JS
 */
export function registerAudioQuestion() {
  ReactQuestionFactory.Instance.registerQuestion(
    AUDIO_RECORDER_TYPE,
    (props) => {
      return React.createElement(AudioQuestionComponent, props);
    },
  );
}

/**
 * Register the audio question in the Survey Creator UI
 */
export function registerAudioQuestionUI() {
  registerAudioQuestion();
  const view = ReactDOMServer.renderToStaticMarkup(AudioQuestionIcon);
  SvgRegistry.registerIcon(AUDIO_RECORDER_TYPE, view);

  const translations = getLocaleStrings("en");
  if (translations.pehelp) {
    translations.pehelp.audiorecorder = {
      showPlayer:
        "Controls if a player is shown for playback of the audio recording.",
      maxSize:
        "Controls the maximum size of the audio recording in bytes. The default value is 0, which means no limit.",
    };
  }
}
