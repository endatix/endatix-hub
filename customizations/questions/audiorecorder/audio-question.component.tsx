import {
  LoadingIndicatorComponent,
  ReactQuestionFactory,
  Survey,
  SurveyQuestionElementBase,
} from "survey-react-ui";
import {
  AUDIO_RECORDER_TYPE,
  AudioQuestionModel,
} from "./audio-question.model";
import React from "react";
import "./audio-question.styles.scss";
import { File } from "@/lib/questions/file/file-type";
import { AudioPlayer } from "./audio-player";

interface AudioQuestionComponentProps {
  question: AudioQuestionModel;
  isDisplayMode: boolean;
  creator: Survey;
}

export class AudioQuestionComponent extends SurveyQuestionElementBase {
  constructor(props: AudioQuestionComponentProps) {
    super(props);
    this.state = { value: this.question.value };
  }
  protected get question(): AudioQuestionModel {
    return this.questionBase as AudioQuestionModel;
  }
  protected renderElement(): React.JSX.Element {
    return (
      <div className="endatix_audio_container">
        {this.renderValue()}
        {!this.props.isDisplayMode && (
          <div className="endatix_audio_controls">
            {this.renderStartButton()}
            {this.renderStopButton()}
            {this.renderClearButton()}
          </div>
        )}
      </div>
    );
  }

  protected renderValue(): React.JSX.Element {
    if (!this.question.value) {
      return <></>;
    }

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
        <LoadingIndicatorComponent></LoadingIndicatorComponent>
      </div>
    );
  }

  protected renderStartButton(): React.JSX.Element | null {
    if (this.question.value) {
      return null;
    }

    return (
      <button
        type="button"
        className="endatix_audio_button"
        title="Start recording"
        disabled={this.question.isRecording}
        onClick={() => this.question.startRecording()}
      >
        <span>Start</span>
      </button>
    );
  }

  protected renderStopButton(): React.JSX.Element | null {
    if (this.question.value) {
      return null;
    }

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
    if (!this.question.value) {
      return null;
    }

    return (
      <button
        type="button"
        className="endatix_audio_button"
        title="Clear recording"
        onClick={() => this.question.clearRecording()}
      >
        <span>Clear</span>
      </button>
    );
  }
}

ReactQuestionFactory.Instance.registerQuestion(AUDIO_RECORDER_TYPE, (props) => {
  return React.createElement(AudioQuestionComponent, props);
});
